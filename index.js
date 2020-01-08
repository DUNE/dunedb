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

var passport = require('passport');

app.set('trust proxy', config.trust_proxy || false ); // for use when forwarding via apache

app.use(bodyParser.json({ limit:'1000kb'}));
app.use(bodyParser.urlencoded({ limit:'1000kb', extended : true }));
app.use(morgan('tiny'));
app.use(express.static(__dirname + '/static'));


app.set('view engine', 'pug')
app.set('view options', { pretty: true });
app.set('views','pug');

app.use(session({ secret: config.localsecret, // session secret
	  			  resave: false,
  				  saveUninitialized: true,
				  // cookie: { secure: true } // requires https

				})); 
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

// Get current form

async function getForm(form_id,collection) {
	console.log("getForm",...arguments);
	collection = collection || "testForms";
	try{
		console.log(chalk.blue("Requesting schema for",collection,form_id));
		var col  = db.collection(collection);
		var rec = await col.findOne({form_id:form_id, current:true});
		// console.log(chalk.green(JSON.stringify(rec,null,4)));
    if(rec) console.log(chalk.blue("Found it"));
		return rec;	
	} catch(err) {
		console.error(err);

		return null; 
	}
}

/////////////////////////////
// Edit the component form.

app.get("/EditComponentForm", middlewareCheckFormEditPrivs, async function(req,res){
  var rec = await getForm("componentForm","componentForm");
  res.render('formbuilder.pug',
  	{form_id:"Component",
  	 form_title:((rec||{}).form_title)||"Untitiled",
  	 rec:rec
  	});
});

// Set a form schema
app.post("/EditComponentForm", async function(req,res,next) {
	// Fixme authenticate
	console.log(chalk.blue("New Schema submission","componentForm"));
	console.log(req.body);

	form_id = "componentForm";
	forms = db.collection("componentForm");

	var updateRes = await forms.updateMany({form_id:form_id, current:true}, {$set: {current: false}});
	console.log('updateRes',updateRes);
	var new_record = JSON.parse(req.body.schema);
	var new_record = {
		schema: JSON.parse(req.body.schema),
		form_id: "componentForm",
		form_title: "Component",
		current: true,
		revised: new Date
		// other metadata
	}
	console.log("inserting",new_record);
	await forms.insertOne(new_record);
	// Get it from the DB afresh.
	var rec = await getForm(form_id, "componentForm");
	res.render('EditComponentForm.pug',{rec:rec});
});


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
// app.get('/'+short_uuid_regex, middlewareCheckDataViewPrivs, get_component);

app.get('/json/'+uuid_regex, middlewareCheckDataViewPrivs, async function(req,res){
  console.log("/json/"+data.component_uuid)
  if(!req.params.uuid) return res.status(400).send("No uuid specified");
  // fresh retrival
  var component= components.findOne({component_uuid:uuid});
  res.json(component);
});

app.post('/json/'+uuid_regex, middlewareCheckDataViewPrivs, async function(req,res){
  console.log('/json/ post req.body:',req.body);
  var data = req.body.data;
  console.log("/json/"+data.component_uuid)
  if(!data.component_uuid) return res.status(400).send("No uuid specified");
  var components = db.collection("components");
  var existing= await components.findOne({component_uuid:data.component_uuid},{component_uuid:1});
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
 		return res.status(400).send("Component UUID "+data.component_uuid+" is already in database and you don't have edit priviledges.");
 	}
  }

  // fresh retrival
  var component= await components.findOne({component_uuid:data.component_uuid});
  res.json({component:component});
});





/////////////////////////////
// Edit a test form.
var default_form_schema = JSON.parse(require('fs').readFileSync('default_form_schema.json'));

app.get("/EditTestForm/:form_id?", middlewareCheckFormEditPrivs, async function(req,res){
  var rec = await getForm(req.params.form_id);
  // if(!rec) return res.status(404).send("No such form exists");
  if(!rec) rec = {
  	form_id: req.params.form_id,
  	schema:default_form_schema
  }
  res.render('EditTestForm.pug',
  	{form_id:req.params.form_id,
  	 rec: rec||{}
  	});
});

// Set a form schema
app.post("/EditTestForm/:form_id?", middlewareCheckFormEditPrivs, async function(req,res,next) {
	console.log(chalk.blue("New Schema submission","testForm"));
	console.log(req.body);

	var form_id = req.body.form_id;
	var forms = db.collection("testForms");

	var updateRes = await forms.updateMany({form_id:form_id, current:true}, {$set: {current: false}});
	// console.log('updateRes',updateRes);
	var new_record = JSON.parse(req.body.schema);
	var new_record = {
		schema: JSON.parse(req.body.schema),
		form_id: form_id,
		form_title:  req.body.title,
		current: true,
		revised: new Date
		// other metadata
	}
	console.log("inserting",new_record);
	await forms.insertOne(new_record);
	// Get it from the DB afresh.
	var rec = await getForm(form_id,);
  if(req.body.form_id != req.params.form_id) {
    console.error("redirecting");
    res.redirect(307, '/EditTestForm/'+req.body.form_id);
    return;
  }

	res.render('EditTestForm.pug',{form_id: form_id, rec:rec});
});



/// Get a form for testing

app.get("/"+uuid_regex+"/test/:form_id", async function(req,res,next) {
    var form = await getForm(req.params.form_id,);
    if(!form) return res.status(404).send("No such test form");
    res.render('test.pug',{form_id:req.params.form_id, form:form, submission:{component_uuid: req.params.uuid}})
});


/// submit test orm data

app.post("/submit/:form_id", async function(req,res,next) {
  console.log(chalk.blue("Form submission",req.params.form_id));
  console.dir(req.body);
  var data = req.body;
  // metadata.
  data.form_id = req.params.form_id;
  data.timestamp=new Date();
  data.ip = req.ip;
  data.user = req.user;
  var form_name = 'form_'+req.params.form_id.replace(/[^\w]/g,'');
  var col = db.collection(form_name);
  try {
    await col.insertOne(data);
    res.send();
  }
  catch(err) {
    console.error("error submitting form /submit/"+req.params.form_id);
    console.error(err);
    res.status(409).send(err);
  } 
});

// view test data.
app.get("/viewTest/:form_id/:record_id", async function(req,res,next) {
  var form = await getForm(req.params.form_id,);
  if(!form) return res.status(404).send("No such test form");  
  var form_name = 'form_'+req.params.form_id.replace(/[^\w]/g,'');
  var col = db.collection(form_name);
  var data = await col.findOne({_id:ObjectID(req.params.record_id)});
  console.log("retrieving",req.params.record_id,ObjectID(req.params.record_id),data);
  res.render('viewTest.pug',{form_id:req.params.form_id, form:form, submission:data.data})

});

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


// This version uses a form-in-a-form
// Although it works, it's pretty annoying in many ways to keep maintained; just not 
// worth the effort!
// // Edit a test form schema
// // Set a form schema
// app.get("/testBuilder/:form_id", middlewareCheckFormEditPrivs, async function(req,res,next) {
// 	var rec = await getForm(req.params.form_id,"testForms");
//   	res.render('testBuilderMeta.pug',
// 	  	{form_id:req.params.form_id,
// 	  	 rec: rec
//   		});

// });
// app.post("/testBuilder/:form_id", middlewareCheckFormEditPrivs, async function(req,res,next) {

// 	var data = req.body.data;

// 	// If the posted form ID doesn't match the URL, redirect so that it matches.
// 	if(data && data.form_id != req.params.form_id) {
// 		res.redirect(307, '/testBuilder/'+data.form_id);
// 		return;
// 	}

// 	console.log(chalk.blue("New Schema submission","testForm"));
// 	console.log(req.body);
// 	console.log(chalk.blue("end of body"));


// 	var form_id = data.form_id;
// 	var testForms = db.collection("testForms");
// 	var data = req.body.data;

// 	var updateRes = await testForms.updateMany({form_id:form_id, current:true}, {$set: {current: false}});
// 	console.log('updateRes',updateRes);
// 	var new_record = {
// 		schema: JSON.parse(data.schema),
// 		form_id: data.form_id,
// 		form_title:  data.title,
// 		current: true,
// 		revised: new Date
// 		// other metadata
// 	}
// 	console.log("inserting",new_record);
// 	await testForms.insertOne(new_record);

// 	var rec = await getForm(req.params.form_id,"testForms");
//   	res.render('testBuilderMeta.pug',
// 	  	{form_id:req.params.form_id,
// 	  	 rec: rec
//   		});

// });



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




app.get("/form/:form_id", async function(req,res,next) {
    var rec = await getForm(req.params.form_id,"forms");
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
  var rec = await getForm(req.params.form_id,"testForms");
  res.render('formbuilder.pug',
  	{form_id:req.params.form_id,
  	 form_title:((rec||{}).form_title)||"Untitiled",
  	 schema:(rec||{}).schema,
  	});
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
	if(!status_obj) status_obj = {status_object: true, version: 0};

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
