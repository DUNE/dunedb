const express = require('express');
var session = require('express-session');

const app = express()
const pug = require('pug');
const chalk = require('chalk');

const uuidv4 = require('uuid/v4');
const shortuuid = require('short-uuid')();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

var morgan = require('morgan');
var bodyParser = require('body-parser');
var config = require('./configuration.js');


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


app.set('view options', { pretty: true });
app.set('view engine', 'pug')
app.set('views','pug');
  app.locals.pretty = true;

var MongoDBStore = require('connect-mongodb-session')(session);
var sessionstore = new MongoDBStore({
  uri: config.mongo_uri,
   databaseName: 'sessions',

  collection: 'sessions'
});

sessionstore.on('error', function(error) {
  console.log(error);
});

app.use(session({ 
    secret: config.localsecret, // session secret
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },  // 1 week
    store: sessionstore,
  })); 


// Configure Passport.

var passport = require('passport');
var Auth0Strategy = require('passport-auth0');

console.log("config",config);
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


// route middleware to make sure a user is logged in


function hasFormEditPrivs(req)
{
		return true;
}

function hasDataEditPrivs(req)
{
	return true;
}

function hasDataEntryPrivs(req)
{
	return true;
}

function hasDataViewPrivs(req)
{
	return true;
}



function middlewareCheckFormEditPrivs(req,res,next) 
{
	if(hasFormEditPrivs(req)) return next();
	else return res.status(300).send("User does not have Form Edit priviledges");
}

function middlewareCheckDataEditPrivs(req,res,next) 
{
	if(hasDataEditPrivs(req)) return next();
	else return res.status(300).send("User does not have Data Edit priviledges");
}

function middlewareCheckDataEntryPrivs(req,res,next) 
{
	if(hasDataEntryPrivs(req)) return next();
	else return res.status(300).send("User does not have Data Entry priviledges");
}

function middlewareCheckDataViewPrivs(req,res,next) 
{
	if(hasDataViewPrivs(req)) return next();
	else return res.status(300).send("User does not have Data View priviledges");
}


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
	middlewareCheckDataViewPrivs,
	// middlewareCheckDataEntryPrivs,
	 async function(req,res){
  var form = await getForm("componentForm","componentForm");
  // roll a new UUID.
  var component_uuid = uuidv4()
  res.render("component.pug",{
  	schema: form.schema,
  	component_uuid:component_uuid,
  	component: {component_uuid:component_uuid},
  	canEdit: hasDataEntryPrivs,
    tests:[],
    performed: [],
  });
});


// Pull up an existing component for editing or just viewing.

var uuid_regex = ':uuid([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})';
var short_uuid_regex = ':shortuuid([123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ]{21,22})';
async function get_component(req,res) {
  // deal with shortened form or full-form
  var component_uuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  console.log(get_component,component_uuid,req.params);

  // get form and data in one go
  let [form, component, tests] = await Promise.all([
  	  getForm("componentForm","componentForm"),
  	  db.collection("components").findOne({component_uuid:component_uuid}), 
      getListOfTests(),
  	]);

  var performed={};
  for(test of tests) {
    console.log('checking for performed',test.form_id);
    var p = await db.collection("form_"+test.form_id).find({"data.component_uuid":component_uuid}).project({form_id:1, form_title:1, timestamp:1, user:1}).toArray();
    if(p.length>0) performed[test.form_id] = p;
  }
  console.log('performed',performed);
  // equal:
  // var component = await components.findOne({component_uuid:req.params.uuid});
  // var form = await getForm("componentForm","componentForm");
  console.log("component")
  console.log(component);
  if(!component) return res.status(400).send("No such component ID.");
  res.render("component.pug",{
  	schema: form.schema,
  	component_uuid:component_uuid,
  	component: component,
  	canEdit: hasDataEditPrivs,
    tests: tests,
    performed: performed,
  });
}
app.get('/'+uuid_regex, middlewareCheckDataViewPrivs, get_component);
app.get('/'+short_uuid_regex, middlewareCheckDataViewPrivs, get_component);

async function component_label(req,res,next) {
  var component_uuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  component = await db.collection("components").findOne({component_uuid:component_uuid});
  if(!component) return res.status(404).send("No such component exists yet in database");
  console.log({component: component});
  res.render('label.pug',{component: component});
}
app.get('/'+uuid_regex+'/label', middlewareCheckDataViewPrivs, component_label);
app.get('/'+short_uuid_regex+'/label', middlewareCheckDataViewPrivs, component_label);



// Pull component data as json doc.
app.get('/json/component/'+uuid_regex, middlewareCheckDataViewPrivs, async function(req,res){
  console.log("/json/component/"+data.component_uuid)
  if(!req.params.uuid) return res.status(400).json({error:"No uuid specified"});
  // fresh retrival
  var component= components.findOne({component_uuid:uuid});
  if(!component)  return res.status(400).json({error:"UUID not found"});

  res.json(component);
});


// Post component changes.


async function post_component(req,res,next){
  var component_uuid = (req.params.uuid) || shortuuid.toUUID(req.params.shortuuid);
  // console.log('/component/json/ post req.body:',req.body);
  var data = req.body.data;
  console.log("/json/"+data.component_uuid)
  if(!data.component_uuid) return res.status(400).send("No uuid specified");
  if(component_uuid != data.component_uuid) return res.status(400).send("Form does not match url");
  var components = db.collection("components");
  var existing= await components.findOne({component_uuid:component_uuid},{component_uuid:1});
  if(!existing) {
  	// No conflict. Is this user allowed to enter data?
  	if(hasDataEntryPrivs(req)) {
  		components.insert(data); // fixme TRANSACTION LOG wutg req.body.metadata
  		console.log("inserted",data);
  	}
  	else return res.status(400).send("You don't have data entry priviledges.");
  } else {
  	console.log('existing record',existing);

  	if(hasDataEditPrivs(req)) {
  		delete data._id; // The _id field is immutable, so delete if it's attached.
  		components.replaceOne({_id:existing._id},data); // fixme TRANSACTION LOG
   	} else {
 		 return res.status(400).send("Component UUID "+component_uuid+" is already in database and you don't have edit priviledges.");
 	  }
  }

  // fresh retrival
  var component= await components.findOne({component_uuid:component_uuid});
  res.json({component:component});
};

app.post('/json/component/'+uuid_regex, middlewareCheckDataViewPrivs,post_component);
app.post('/json/component/'+short_uuid_regex, middlewareCheckDataViewPrivs,post_component);






//////////////////////////////////////////////////////////////////////////
// Editing and creating forms



// Create a new test form
var default_form_schema = JSON.parse(require('fs').readFileSync('default_form_schema.json'));
app.get("/NewTestForm/:form_id", middlewareCheckFormEditPrivs, async function(req,res){
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
      rec.revised_by = res.locals.user.email || "unknown";
      console.log("inserting",rec);
      await forms.insertOne(rec);
  }

  res.redirect("/EditTestForm/"+req.params.form_id);
});

// Edit existing test form
app.get("/EditTestForm/:form_id?", middlewareCheckFormEditPrivs, async function(req,res){
  // var rec = await getForm(req.params.form_id);
  // if(!rec) return res.status(400).send("No such form exists");
  res.render('EditTestForm.pug',{collection:"testForms",form_id:req.params.form_id});
});

// Edit component form.
app.get("/EditComponentForm", middlewareCheckFormEditPrivs, async function(req,res){
  res.render('EditComponentForm.pug',{collection:"componentForm",form_id:"componentForm"});
});


// Get a form schema
app.get('/json/:collection(testForms|componentForm)/:form_id', async function(req,res,next){
  var rec = await getForm(req.params.form_id, req.params.collection);
  // if(!rec) return res.status(404).send("No such form exists");
  if(!rec) { res.status(400).json({error:"no such form "+req.params.form_id}); return next(); };
  console.log(rec);
  res.json(rec);
});


// Change the form schema.
app.post('/json/:collection(testForms|componentform)/:form_id', middlewareCheckFormEditPrivs, async function(req,res,next){
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
  console.log("retrieving",req.params.record_id,ObjectID(req.params.record_id),data);
  res.render('viewTest.pug',{form_id:req.params.form_id, form:form, submission:data.data})
};
app.get("/test/:form_id/:record_id", seeTestData);
app.get("/"+ uuid_regex + "/test/:form_id/:record_id", seeTestData);


app.get("/test/:form_id",middlewareCheckDataEntryPrivs,async function(req,res,next){
  var form = await getForm(req.params.form_id,);
  res.render('test_without_uuid.pug',{form_id:req.params.form_id,form:form});
})

/// Run an new test

app.get("/"+uuid_regex+"/test/:form_id", async function(req,res,next) {
    console.log("run a new test");
    var form = await getForm(req.params.form_id,);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{form_id:req.params.form_id, form:form, submission:{component_uuid: req.params.uuid}})
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
app.post("/savefile",middlewareCheckDataViewPrivs,file_upload_middleware,async function(req, res,next){
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



// Autocomplete
app.get("/autocomplete/uuid",async function(req,res,next) {
  var q = req.query.q;
  var regex = new RegExp(`^${q}*`);
  var matches = await db.collection("components")
    .find({component_uuid:{$regex: regex}})
    .project({"component_uuid":1,name:1})
    .toArray();
  for(m of matches) {
    m.val = m.component_uuid;
    m.text = m.val + ' ' +m.name;
  }
  console.log(matches);
  return res.json(matches)
})





app.get("/qr", (req,res)=>
{
  res.render('qr', { qrurl: config.uuid_url+uuidv4() })
});



// // uuid is 8/4/4/4/12 groups of a-f 0-9
// var uuid_regex = ':uuid([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})';
// app.get('/'+uuid_regex, (req,res) => {

// 	res.render('uuid_lookup.pug',{uuid:req.params.uuid});
// });

app.all('/geotag/'+uuid_regex, (req,res) => {
	console.log(req.query);
	res.render('uuid_geotag.pug',{uuid:req.params.uuid,tag:req.query});
	var col = db.collection('geotag');
	col.insert(
		{
		  uuid: req.params.uuid,
		  geotag: req.query,
		  date: new Date,
		  ip: req.ip
		}
	);

});






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

async function getComponents()
{
	console.log("getComponents");
	try{
		var items = db.collection("components").find({}).project({component_uuid:1, type:1, name:1});
		// sort by type.
		var out = {};
    var item;

    while (true) {
      item = await items.next()
      console.log("item",item);
      if(!item) break;
			var type = item.type || "unknown";
			out[type] = out[type] || [];
			out[type].push(item);
		}
		console.log("getComponents",out);
		return out;

	} catch(err) {
		console.error(err);

		return {}; 
	}
}

app.get('/', async function(req, res, next) {
	res.render('admin.pug',
	{
		tests: await getListOfTests(),
		all_components: await getComponents(),
	});
});


var db = null;

async function log_to_db(msg)
{
	let col_log = db.collection("log");
	await col_log.insertOne({time:Date.now(),msg:msg});
}

async function attach_to_database()
{
	try {
		console.log('attaching');
		const mongo_client = await new MongoClient.connect(config.mongo_uri, {useNewUrlParser:true, useUnifiedTopology: true, connectTimeoutMS: 100, socketTimeoutMS: 100});
		if(!mongo_client) {
			throw("Cannot connect to DB");
		}
		db = mongo_client.db(config.mongo_db);
		log_to_db("Webserver Starting Up");

	} catch(err) {
		console.error(err);
		return;
	}
}

async function initialize_database()
{
	console.log("init db");
	var admin = db.collection('admin');
	var status_obj = await admin.findOne({status_object: {$exists: true}});
	console.log('status object',status_obj);
	if(!status_obj) status_obj = {status_object: true, version: 1};

	if(status_obj.version < 1) 
	{
		// Create indices
		// seed database with something
		await db.collection('componentForm').deleteMany({});
		await db.collection('componentForm').insertOne(
		{schema: JSON.parse(require('fs').readFileSync(__dirname+"/component_schema.json")),
		 form_id: "componentForm",
		 current:true,
		 revised: new Date()
		}
		);

		log_to_db('initialize DB to version 1');
		status_obj.version =1;
	}
	
	status_obj.version =0; // removeme
	await admin.replaceOne({status_object: {$exists: true}}, status_obj, {upsert: true});

}

async function run(){
	app.listen(config.http_server_port, () => console.log(`Example app listening on port ${config.http_server_port}!`))	
}


attach_to_database()
	.then(initialize_database)
	.then(run);
