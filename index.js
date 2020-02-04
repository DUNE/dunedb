const express = require('express');
var session = require('express-session');

const app = express()
const pug = require('pug');
const chalk = require('chalk');

const uuidv4 = require('uuid/v4');
const shortuuid = require('short-uuid')();
const MUUID = require('uuid-mongodb');  // Addon for storing UUIDs as binary for faster lookup

var morgan = require('morgan');
var bodyParser = require('body-parser');

var jsondiffpatch = require('jsondiffpatch');

// mine
var config = require('./configuration.js');
var database = require('./database.js'); // defines global.db, used below
var components = require('./components.js');
var permissions = require('./permissions.js');


const logRequestStart = (req,res,next) => {
    console.log(`${req.method} ${req.originalUrl}`)
    next()
}
app.use(logRequestStart)

app.set('trust proxy', config.trust_proxy || false ); // for use when forwarding via apache
// 


// app.use(bodyParser.urlencoded({ limit:'1000kb', extended : true }));
app.use(bodyParser.json({ limit:'1000kb'}));
app.use(morgan('tiny'));
app.use(express.static(__dirname + '/static'));
let moment = require('moment');
app.use(function(req,res,next){ res.locals.moment = moment; next(); }); // moment.js in pug


app.set('view options', { pretty: true });
app.set('view engine', 'pug')
app.set('views','pug');
  app.locals.pretty = true;

const MongoStore = require('connect-mongo')(session);
app.use(session({
          store: new MongoStore({
                  url: 'mongodb://localhost/sessions2',
                  mongoOptions: {} // See below for details
                  }),
          secret: config.localsecret, // session secret
          resave: false,
          saveUninitialized: true,
          cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },  // 1 week


}));


// Configure Passport.

var passport = require('passport');
var Auth0Strategy = require('passport-auth0');

// Configure Passport to use Auth0
var strategy = new Auth0Strategy(
  {
    domain:       config.auth0_domain,
    clientID:     config.auth0_client_id,
    clientSecret: config.auth0_client_secret,
    callbackURL:
      config.auth0_callback_url || 'http://localhost:12313/callback'
  },
  function (accessToken, refreshToken, extraParams, profile, done) {
    // accessToken is the token to call Auth0 API (not needed in the most cases)
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user
    return done(null, profile);
  }
);
passport.use(strategy);
app.use(passport.initialize());
app.use(passport.session());

// passport.serializeUser( (user, done) => {
//   console.log('serializeUser',user);
//   var sessionUser = { _id: user._id, name: user.name, email: user.email, roles: user.roles }
//   done(null, sessionUser)
// })

// passport.deserializeUser( (sessionUser, done) => {
//   // The sessionUser object is different from the user mongoose collection
//   // it's actually req.session.passport.user and comes from the session collection
//   done(null, sessionUser)
// })

// You can use this section to keep a smaller payload
passport.serializeUser(function (user, done) {
  console.log('serializeUser',user);
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

// make the req.user object available to the pug templates! Cool!
app.use(function (req, res, next) {
    res.locals.user = req.user;
    next();
});

// ensure authorized: 
function ensureAuthorized (req, res, next) {
    if (req.user) { return next(); }
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
};

// authentication routes
var authRouter = require('./auth');
app.use('/',authRouter);

app.get('/user', ensureAuthorized, function (req, res, next) {
  const { _raw, _json, ...userProfile } = req.user;
  res.render('user.pug', {
    userProfile: JSON.stringify(userProfile, null, 2),
    title: 'Profile page'
  });
});



// machine-to-machine authorization:
const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');
const checkJwt = jwt({
  // Dynamically provide a signing key
  // based on the kid in the header and 
  // the signing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://dev-pserbfiw.auth0.com/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  audience: 'https://dev-pserbfiw.auth0.com/api/v2/',
  issuer: `https://dev-pserbfiw.auth0.com/`,
  algorithms: ['RS256']
});

app.get('/api/public', function(req, res) {
  res.json({
    message: 'Hello from a public endpoint! You don\'t need to be authenticated to see this.'
  });
});

// This route needs authentication
app.get('/api/private', checkJwt, function(req, res) {
  res.json({
    message: 'Hello from a private endpoint! You need to be authenticated to see this.'
  });
});



// routes in other files
app.use(components.router);

// Get current form

async function getForm(form_id,collection) {
	console.log("getForm",...arguments);
	collection = collection || "testForms";
	try{
		console.log(chalk.blue("Requesting schema for",collection,form_id));
		var col  = db.collection(collection);
		var rec = await col.findOne({form_id:form_id, current:true});
		// console.log(chalk.green(JSON.stringify(rec,null,4)));
    if(rec) {
      console.log(chalk.blue("Found it"));
    }
    return rec;
	} catch(err) {
		console.error(err);

		return null; 
	}
}



/////////////////////////////
// New component, old component

// Note that none of this works because formio doesn't actually post a form. Instead, it requires me to do an ajax.


app.get("/NewComponent",
	permissions.middlewareCheckDataViewPrivs,
	// middlewareCheckDataEntryPrivs,
	 async function(req,res){
  var form = await getForm("componentForm","componentForm");
  // roll a new UUID.
  var componentUuid = uuidv4()
  res.render("component_edit.pug",{
  	schema: form.schema,
  	componentUuid:componentUuid,
  	component: {componentUuid:componentUuid},
  	canEdit: permissions.hasDataEntryPrivs(),
    tests:[],
    performed: [],
  });
});


// Pull up an existing component for editing or just viewing.

var uuid_regex = ':uuid([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})';
var short_uuid_regex = ':shortuuid([123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{21,22})';
async function get_component(req,res) {
  // deal with shortened form or full-form
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  console.log(get_component,componentUuid,req.params);

  // get form and data in one go
  let [form, component, tests] = await Promise.all([
  	  getForm("componentForm","componentForm"),
      components.retrieveComponent(componentUuid),
      getListOfTests(),
  	]);

  for(test of tests) {
    console.log('checking for performed',test.form_id);
    var p = await db.collection("form_"+test.form_id).find({"data.componentUuid":componentUuid}).project({form_id:1, form_title:1, timestamp:1, user:1}).toArray();
    test.performed = p || [];
  }
  console.dir(tests);
  // equal:
  // var component = await components.findOne({componentUuid:req.params.uuid});
  // var form = await getForm("componentForm","componentForm");
  console.log("component")
  console.log(component);
  if(!component) return res.status(400).send("No such component ID.");
  res.render("component.pug",{
  	schema: form.schema,
  	componentUuid:componentUuid,
  	component: component,
  	canEdit: permissions.hasDataEditPrivs(),
    tests: tests,
  });
}
app.get('/'+uuid_regex, permissions.middlewareCheckDataViewPrivs, get_component);
app.get('/'+short_uuid_regex, permissions.middlewareCheckDataViewPrivs, get_component);

async function edit_component(req,res) {
  // deal with shortened form or full-form
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  console.log(get_component,componentUuid,req.params);

  // get form and data in one go
  let [form, component, tests] = await Promise.all([
      getForm("componentForm","componentForm"),
      components.retrieveComponent(componentUuid),
      getListOfTests(),
    ]);

  var performed={};
  for(test of tests) {
    console.log('checking for performed',test.form_id);
    var p = await db.collection("form_"+test.form_id).find({"data.componentUuid":componentUuid}).project({form_id:1,  timestamp:1, user:1}).toArray();
    if(p.length>0) { 
       for(item of p) { item.form_title = test.form_title };
       performed[test.form_id] = p;
       console.dir(p);
    }
  }
  // equal:
  // var component = await components.findOne({componentUuid:req.params.uuid});
  // var form = await getForm("componentForm","componentForm");
  console.log("component")
  console.log(component);
  if(!component) return res.status(400).send("No such component ID.");
  res.render("component_edit.pug",{
    schema: form.schema,
    componentUuid:componentUuid,
    component: component,
    canEdit: permissions.hasDataEditPrivs(),
    tests: tests,
    performed: performed,
  });
}

app.get('/'+uuid_regex+'/edit', permissions.middlewareCheckDataEditPrivs, edit_component);
app.get('/'+short_uuid_regex+'/edit', permissions.middlewareCheckDataEditPrivs, edit_component);


async function component_label(req,res,next) {
  var componentUuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  component = components.retrieveComponent(componentUuid);
  if(!component) return res.status(404).send("No such component exists yet in database");
  console.log({component: component});
  res.render('label.pug',{component: component});
}
app.get('/'+uuid_regex+'/label', permissions.middlewareCheckDataViewPrivs, component_label);
app.get('/'+short_uuid_regex+'/label', permissions.middlewareCheckDataViewPrivs, component_label);










//////////////////////////////////////////////////////////////////////////
// Editing and creating forms



// Create a new test form
var default_form_schema = JSON.parse(require('fs').readFileSync('default_form_schema.json'));
app.get("/NewTestForm/:form_id", permissions.middlewareCheckFormEditPrivs, async function(req,res){
  var rec = await getForm(req.params.form_id);
  
  if(!rec) {
    var forms = db.collection("testForms");
    // console.log('updateRes',updateRes);
      var rec = {form_id: req.params.form_id,
                schema: default_form_schema
               }; 
      delete rec._id;
      rec.revised = new Date;  
      rec.current = true;
      rec.version = 0;
      rec.revised_by = ((res.locals||{}).user||{}).email || "unknown";
      console.log("inserting",rec);
      await forms.insertOne(rec);
  }

  res.redirect("/EditTestForm/"+req.params.form_id);
});

// Edit existing test form
app.get("/EditTestForm/:form_id?", permissions.middlewareCheckFormEditPrivs, async function(req,res){
  // var rec = await getForm(req.params.form_id);
  // if(!rec) return res.status(400).send("No such form exists");
  res.render('EditTestForm.pug',{collection:"testForms",form_id:req.params.form_id});
});

// Edit component form.
app.get("/EditComponentForm", permissions.middlewareCheckFormEditPrivs, async function(req,res){
  res.render('EditComponentForm.pug',{collection:"componentForm",form_id:"componentForm"});
});


// API/Backend: Get a form schema
app.get('/json/:collection(testForms|componentForm)/:form_id', async function(req,res,next){
  var rec = await getForm(req.params.form_id, req.params.collection);
  // if(!rec) return res.status(404).send("No such form exists");
  if(!rec) { res.status(400).json({error:"no such form "+req.params.form_id}); return next(); };
  console.log(rec);
  res.json(rec);
});


// API/Backend:  Change the form schema.
app.post('/json/:collection(testForms|componentform)/:form_id', permissions.middlewareCheckFormEditPrivs, async function(req,res,next){
  console.log(chalk.blue("Schema submission","/json/testForms"));
  console.log(req.body); 

  var form_id = req.params.form_id; 

  // Note this is OK because req.params.collection options are specified in the method regex
  var old = await getForm(form_id,req.params.collection);
  var forms = db.collection(req.params.collection);
  var updateRes = await forms.updateMany({form_id:form_id, current:true}, {$set: {current: false}});

  // console.log('updateRes',updateRes);
  var new_record = {...req.body}; // shallow clone
  new_record.form_id = form_id;
  delete new_record._id;
  new_record.revised = new Date;
  new_record.current = true;
  new_record.version = (old.version || 0) + 1;

  console.log("inserting",new_record);
  await forms.insertOne(new_record);


    // Get it from the DB afresh.
  var rec = await getForm(form_id,req.params.collection);
  res.json(rec);
});



// view test data.

async function seeTestData(req,res,next) {
  var form = await getForm(req.params.form_id,);
  if(!form) return res.status(400).send("No such test form");  
  var form_name = 'form_'+req.params.form_id.replace(/[^\w]/g,'');
  var col = db.collection(form_name);
  var data = await col.findOne({_id:ObjectID(req.params.record_id)});
  console.log("viewtest",req.params.record_id,ObjectID(req.params.record_id),data);
  res.render('viewTest.pug',{form_id:req.params.form_id, form:form, data:data, retrieved:true})
};

app.get("/test/:form_id/:record_id", seeTestData);
app.get("/"+ uuid_regex + "/test/:form_id/:record_id", seeTestData);


// Run a new test, but no UUID specified

app.get("/test/:form_id",permissions.middlewareCheckDataEntryPrivs,async function(req,res,next){
  var form = await getForm(req.params.form_id,);
  res.render('test_without_uuid.pug',{form_id:req.params.form_id,form:form});
})

/// Run an new test

app.get("/"+uuid_regex+"/test/:form_id", async function(req,res,next) {
    console.log("run a new test");
    var form = await getForm(req.params.form_id,);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{form_id:req.params.form_id, form:form, data:{data:{componentUuid: req.params.uuid}}})
});


/// submit test form data
async function submit_test_data(req,res,next) {
    console.log(chalk.blue("Form submission",req.params.form_id));
  // var body = await parse.json(req);

  console.log(req.body);
  var data = req.body;
  // metadata.
  data.form_id = req.params.form_id;
  data.timestamp=new Date();
  data.ip = req.ip;
  data.user = req.user;
  var form_name = 'form_'+req.params.form_id.replace(/[^\w]/g,'');
  var col = db.collection(form_name);
  try {
    var result = await col.insertOne(data);
    console.log('result',result.ops);
    res.json({_id: result.ops[0]._id});
  }
  catch(err) {
    console.error("error submitting form /submit/"+req.params.form_id);
    console.error(err);
    res.status(400).json({error:err});
  } 
}




async function retrieve_test_data(req,res,next) {
  console.log(chalk.blue("Form submission",req.params.form_id));
  // var body = await parse.json(req);

  console.log(req.body);
  var data = req.body;
  // metadata.
  data.form_id = req.params.form_id;
  data.timestamp=new Date();
  data.ip = req.ip;
  data.user = req.user;
  var form_name = 'form_'+req.params.form_id.replace(/[^\w]/g,'');
  var col = db.collection(form_name);
  try {
    var result = await col.insertOne(data);
    console.log('result',result.ops);
    res.json({_id: result.ops[0]._id});
  }
  catch(err) {
    console.error("error submitting form /submit/"+req.params.form_id);
    console.error(err);
    res.status(400).json({error:err});
  } 
}

app.post("/json/submit/:form_id", submit_test_data);
app.post("/json/reteive/:form_id", retrieve_test_data);

// Same thing as above, but this time we use jwt for authentication:
app.post("/api/submit/:form_id", checkJwt, submit_test_data);
app.get("/api/get/:form_id/:record_id", checkJwt, retrieve_test_data);




/// submit file data
var file_upload_middleware = require('express-fileupload')();
app.post("/savefile",permissions.middlewareCheckDataViewPrivs,file_upload_middleware,async function(req, res,next){
    console.log('/savefile',req.files);
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    for(var key in req.files) {
      var fileinfo = req.files[key];
      var outfile = __dirname+"/files/"+fileinfo.name; // Fixme better sorting, collisions
      fileinfo.mv(outfile,function(err){
        if (err) return res.status(500).send(err);

         res.json({
          url: config.my_url+'/retrievefile/'+fileinfo.name,
          name: fileinfo.name,
          size: fileinfo.size
         });
      });

    }
})

/// file retrieval
app.use('/retrievefile',express.static(__dirname+"/files"));






async function getListOfTests(collection)
{
	console.log("getListOfTests");
	var collectionName = collection || "testForms";
	try{
		var col  = db.collection(collectionName);
		var tests = await col.find({current:true}).project({form_id:1, form_title:1}).toArray();
    console.log("getListOfTests",tests);
		return tests;
	} catch(err) {
		console.error(err);

		return []; 
	}
}



app.get('/', async function(req, res, next) {
	res.render('admin.pug',
	{
		tests: await getListOfTests(),
		all_components: await components.getComponents(),
	});
});





async function run(){
  // db.collection("components"); // testing to see if DB is live...
	app.listen(config.http_server_port, () => console.log(`Example app listening on port ${config.http_server_port}!`))	
}

database.attach_to_database()
  .then(run);

