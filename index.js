const express = require('express');
var session = require('express-session');

const app = express()
const pug = require('pug');
const chalk = require('chalk');

const uuidv4 = require('uuid/v4');
const MongoClient = require('mongodb').MongoClient;


var morgan = require('morgan');
var bodyParser = require('body-parser');
var config = require('./configuration.js');

var passport = require('passport');



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit:'1000kb', extended : true }));
app.use(morgan('tiny'));
app.use(express.static(__dirname + '/static'));


app.set('view engine', 'pug')
app.set('views','pug');

app.use(session({ secret: 'sietchxyzisa good url' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

var MongoDBStore = require('connect-mongodb-session')(session);
var sessionstore = new MongoDBStore({
  uri: config.mongo_uri,
   databaseName: 'sessions',

  collection: 'sessions'
});
sessionstore.on('error', function(error) {
  console.log(error);
});

app.use(require('express-session')({
  secret: config.localsecret,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: sessionstore,
  // Boilerplate options, see:
  // * https://www.npmjs.com/package/express-session#resave
  // * https://www.npmjs.com/package/express-session#saveuninitialized
  resave: true,
  saveUninitialized: true
}));

passport.serializeUser( (user, done) => {
  console.log('serializeUser',user);
  var sessionUser = { _id: user._id, name: user.name, email: user.email, roles: user.roles }
  done(null, sessionUser)
})

passport.deserializeUser( (sessionUser, done) => {
  // The sessionUser object is different from the user mongoose collection
  // it's actually req.session.passport.user and comes from the session collection
  done(null, sessionUser)
})

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}



app.get("/qr", (req,res)=>
{
  res.render('qr', { qrurl: config.uuid_url+uuidv4() })
});



// uuid is 8/4/4/4/12 groups of a-f 0-9
var uuid_regex = ':uuid([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})';
app.get('/'+uuid_regex, (req,res) => {

	res.render('uuid_lookup.pug',{uuid:req.params.uuid});
});

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



app.post("/submit/:form_id", async function(req,res,next) {
	console.log(chalk.blue("Form submission",req.params.form_id));
	console.dir(req.body);
	var form_name = 'form_'+req.params.form_id.replace(/[^\w]/g,'');
	var col = db.collection(form_name);
	try {
		await col.insertOne(req.body);
		res.send();
	}
	catch(err) {
		console.error("error submitting form /submit/"+req.params.form_id);
		console.error(err);
		res.status(409).send(err);
	}	
});




// Get a form schema
async function getForm(form_id) {
	try{
		forms = db.collection("forms");
		var schema = await forms.findOne({form_id:form_id, current:true});
		console.log(chalk.blue("Requesting schema for",form_id));
		console.log(chalk.green(JSON.stringify(schema,null,4)));
		return schema;	
	} catch(err) {
		return {}; 
	}
}

app.get("/form/:form_id", async function(req,res,next) {
    var rec = await getForm(req.params.form_id);
	res.render('form.pug',{form_id:req.params.form_id,schema:rec.schema})
});

// Set a form schema
app.post("/formbuilder/:form_id", async function(req,res,next) {
	// Fixme authenticate
	console.log(chalk.blue("New Schema submission",req.params.form_id));
	console.log(req.body);

	forms = db.collection("forms");

	var updateRes = await forms.updateMany({form_id:req.params.form_id, current:true}, {$set: {current: false}});
	console.log('updateRes',updateRes);
	var new_record = JSON.parse(req.body.schema);
	var new_record = {
		schema: JSON.parse(req.body.schema),
		form_id: req.params.form_id,
		current: true,
		revised: new Date
		// other metadata
	}
	new_record.form_id = req.params.form_id;
	new_record.current = true;
	console.log("inserting",new_record);
	await forms.insertOne(new_record);
	// Get it from the DB afresh.
	var rec = await getForm(req.params.form_id);
	res.render('formbuilder.pug',{form_id:req.params.form_id,schema:rec.schema})
});

app.get("/formbuilder/:form_id", async function(req,res,next) {
  var rec = await getForm(req.params.form_id);
  console.log('get',rec);
  res.render('formbuilder.pug',{form_id:req.params.form_id,schema:(rec||{}).schema})
});







app.get('/', (req, res) => res.send('Hello World!'));


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
	if(!status_obj) status_obj = {status_object: true, version: 0};

	if(status_obj.version < 1) 
	{
		// Create indices
		// seed database with something
		await db.collection('ComponentForm').insertOne(
		{schema: JSON.parse(require('fs').readFileSync(__dirname+"/component_schema.json")),
		 form_id: "Component",
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
