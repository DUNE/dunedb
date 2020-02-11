const express = require('express');
var session = require('express-session');

const app = express()
const pug = require('pug');
const chalk = require('chalk');

const uuidv4 = require('uuid/v4');
const shortuuid = require('short-uuid')();
const MUUID = require('uuid-mongodb');  // Addon for storing UUIDs as binary for faster lookup
const ObjectID = require('mongodb').ObjectID;

var morgan = require('morgan');
var bodyParser = require('body-parser');

var jsondiffpatch = require('jsondiffpatch');

// mine
var config = require('./configuration.js');
var database = require('./database.js'); // Exports global 'db' variable
var Components = require('./Components.js');
var Forms = require('./Forms.js');
var permissions = require('./permissions.js');
var utils = require('./utils.js');

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
app.use(Components.router);
app.use(Forms.router);
app.use(require('./routes/formRoutes.js').router);
app.use(require('./routes/componentRoutes.js').router);
app.use('/file',require('./routes/files.js').router);





// view test data.

async function seeTestData(req,res,next) {
  var formrec = await Forms.retrieveForm(req.params.form_id,);
  if(!formrec) return res.status(400).send("No such test form");  
  var form_name = 'form_'+req.params.form_id.replace(/[^\w]/g,'');
  var col = db.collection(form_name);
  var data = await col.findOne({_id:ObjectID(req.params.record_id)});
  console.log("viewtest",req.params.record_id,ObjectID(req.params.record_id),data);
  res.render('viewTest.pug',{form_id:req.params.form_id, formrec:formrec, testdata:data, retrieved:true})
};

app.get("/test/:form_id/:record_id", seeTestData);
app.get("/"+ utils.uuid_regex + "/test/:form_id/:record_id", seeTestData);


// Run a new test, but no UUID specified

app.get("/test/:form_id",permissions.middlewareCheckDataEntryPrivs,async function(req,res,next){
  var form = await Forms.retrieveForm(req.params.form_id,);
  res.render('test_without_uuid.pug',{form_id:req.params.form_id,form:form});
})

/// Run an new test

app.get("/"+utils.uuid_regex+"/test/:form_id", async function(req,res,next) {
  try{
    console.log("run a new test");
    var form = await Forms.retrieveForm(req.params.form_id,);
    if(!form) return res.status(400).send("No such test form");
    res.render('test.pug',{form_id:req.params.form_id, form:form, testdata:{data:{componentUuid: req.params.uuid}}})
  } catch(err) { console.error(err); next(); }
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








app.get('/', async function(req, res, next) {
	res.render('admin.pug',
	{
		tests: await Forms.getListOfForms(),
		all_components: await Components.getComponents(),
	});
});





async function run(){
  // db.collection("components"); // testing to see if DB is live...
	app.listen(config.http_server_port, () => console.log(`Example app listening on port ${config.http_server_port}!`))	
}

database.attach_to_database()
  .then(run);

