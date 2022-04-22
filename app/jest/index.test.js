// app-module-path doesn't work in this context...
// require('app-module-path').addPath('./');
const request = require('supertest');
const express = require('express');
const session = require('supertest-session');
const { getRoutes } = require('./getRoutes.js');
const fs = require("fs");

const App= require("../lib/app.js");
const { db } = require("../lib/db");
global.BaseDir = process.cwd();


var appPublic = express();
var appAuthorized = express();

var suffix = "-THIS-IS-AN-AUTOMATED-UNIT-TEST";

var user =  {
         displayName: 'JEST '+process.env.USER,
         id: 'jest|'+process.env.USER,
         user_id: 'jest|'+process.env.USER,
         emails: [ { value:  process.env.USER+'@'+process.env.HOST} ],
         nickname: 'JEST',
         permissions:
         [ 'components:edit',
           'components:view',
           'forms:edit',
           'tests:submit',
           'tests:view' ,
           'users:view',
           // 'users:edit'
           ],
           roles:
         [ 'component editor',
           'tester' ]
        };

var uuid, testId, jobId;
var draftTestId;

var routes_unfinished ={};

function checkRouteOffChecklist(method,route) {
  // console.log("checking off route",method,route);

  routes_unfinished.all = routes_unfinished.all.filter(
    function(entry){
      // console.log("compare",entry,method,route);
      if(method !== entry.method) return true;
      if(entry.prefix && !route.startsWith(entry.prefix)) return true;
      var trimmed = route.replace(entry.prefix,'');
      var m = trimmed.match(entry.regexp);
      if(m) {
        return false;
      }
      return true;
    }
  );
}

function myrequest(app){
  var r = request(app);
  return new function() {
    this.get = function(...args)  { checkRouteOffChecklist('get',args[0]); return r.get(...args); }
    this.post = function(...args) { checkRouteOffChecklist('post',args[0]); return r.post(...args); }
 }
}

pino = require("pino");
  var pino_opts = {
    customLevels: {
        http: 29
    },
    level: 'http', 
  };
var dest = pino.destination("jest.log");
const logger = pino(pino_opts, pino.destination('jest.log') );


beforeAll(async () => {
  try{
  console.log("beforeAll");
  
  await db.open();
  console.log("attached");
 
  await App.create_app(appPublic);

  // user data is injected into the application stack first.
  // Putting it between these causes issues downstream.
  appAuthorized.use((req,res,next)=>{ req.user = user; next();});
  await App.create_app(appAuthorized);

  // Get a list of all routes that this application CAN use. 
  // This is used to check that we are actually testing most of the routes.
  routes_unfinished = getRoutes(appAuthorized);
  // remove some.
  routes_unfinished.all = routes_unfinished.all.filter(function(e){
      if(e.route == "/login") return false;
      if(e.route == "/logout") return false;
      if(e.route == "/callback") return false;
      if(e.route == "/machineAuthenticate") return false;
      if(e.route.startsWith("/api")) return false;
      return true;
    });
   console.log("found ",routes_unfinished.all.length," routes to check");

  } catch(err) {
    console.log(err);
  }

});

afterAll( async () => {
    // console.log("afterAll()");
    var not_checked = [];
    for(var entry of routes_unfinished.all) { not_checked.push(entry.route) }
    console.log(not_checked.length+" unchecked routes in unchecked.log");
    require('fs').writeFileSync("unchecked.log",not_checked.join('\n'));
    await db.collection("componentForms").deleteMany({formId:"cform"+suffix});
    await db.collection("testForms").deleteMany({formId:"test"+suffix});
    await db.collection("jobForms").deleteMany({formId:"job"+suffix});
    await db.collection("components").deleteMany({type:"cform"+suffix});
    await db.collection("tests").deleteMany({formId:"test"+suffix});
    await db.collection("jobs").deleteMany({formId:"job"+suffix});
    await db.close();
} );

// inject a custom user authorization here.
describe("public functions",function() {
  test('route /',function(done) {
    myrequest(appPublic).get('/').expect(200,done);
  });
  test('route /components/type',function(done) {
    myrequest(appPublic).get('/components/type').expect(400,done);
  });
});



/// Some sample form
var dummyschema = {
  "components": [
    {
      "label": "Dummy Field",
      "placeholder": "example: apa 10",
      "tooltip": "Dummy tooltip",
      "tableView": true,
      "key": "name",
      "type": "textfield",
      "validate": {
        "required": true
      },
      "input": true
    }
  ]
};

// inject a custom user authorization here.
describe("private routes",function() {


  // test('route /',function(done) {
  //   myrequest(appAuthorized).get('/').expect(200,done);
  // });
  // test('route /components/type',function(done) {
  //   myrequest(appAuthorized).get('/components/type').expect(200,done);
  // });

  // // describe("API/JSON routes")

  // describe("job routes",()=>{
  //   test('route /workflows (job types)',function(done) { myrequest(appAuthorized).get('/jobs/workflows').expect(200,done); });

  //   test('route /jobs (recent jobs)',function(done) { myrequest(appAuthorized).get('/jobs').expect(200,done); });
  //   test('route /jobs/4by4workflow (recent 4by4)',function(done) { myrequest(appAuthorized).get('/jobs/4by4_workflow').expect(200,done); });
  //   test('route /job/4by4workflow (run 4by4)',function(done) { myrequest(appAuthorized).get('/job/4by4_workflow').expect(200,done); });
  //   test('route /EditWorkflowForm/4by4_workflow',function(done) { myrequest(appAuthorized).get('/EditWorkflowForm/4by4_workflow').expect(200,done); });
  // });



  // nontrivial tests. Insert and query API, then check GUI routes


  describe("API/JSON",()=>{
    test('POST /json/componentForms/<type>',function(done){
      expect.assertions(0);
      return myrequest(appAuthorized)
        .post('/json/componentForms/cform'+suffix)
        .send({
          formId: "cform"+suffix,
          formName: "Compnent Type "+suffix,
          schema: dummyschema
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(()=>done());
    });

    test('GET /json/componentForms/<type>',()=>{
      return myrequest(appAuthorized)
        .get('/json/componentForms/cform'+suffix)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.formId).toBe("cform"+suffix);
        })
      r.then(done)
    });

    test('POST /json/testForms/<type>',()=>{
      return myrequest(appAuthorized)
        .post('/json/testForms/test'+suffix)
        .send({
          formId: "test"+suffix,
          formName: "Test"+suffix,
          schema: dummyschema
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.formId).toBe("test"+suffix);
        });
    });

    test('GET /json/testForms/<type>',()=>{
      return myrequest(appAuthorized)
        .get('/json/testForms/test'+suffix)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.formId).toBe("test"+suffix);
        });
    });

    test('POST /json/jobForms/<type>',()=>{
      return myrequest(appAuthorized)
        .post('/json/jobForms/job'+suffix)
        .send({
          formId: "job"+suffix,
          formName: "Job"+suffix,
          schema: dummyschema
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.formId).toBe("job"+suffix);
        });
    });

    test('GET /json/jobForms/<type>',()=>{
      return myrequest(appAuthorized)
        .get('/json/jobForms/job'+suffix)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.formId).toBe("job"+suffix);
        });
    });


    // insert some data
    test('GET /json/generateComponentUuid',()=>{
      return myrequest(appAuthorized)
        .get('/json/generateComponentUuid')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response=>{
          uuid = response.body;
          logger.info("GOT UUID",uuid);
        })
    });

    test('POST /json/component/<uuid>',()=>{
      return myrequest(appAuthorized)
        .post('/json/component/'+uuid)
        .send({
          type: 'cform'+suffix,
          data: {
            name: "Dummy Test Object by JEST",
            dummyVal: 999,
          },
          metadata: { deleteme: true },
          validity: { startDate: new Date() }
        })
        .expect('Content-Type', /json/)
        .expect(200)
    });

    test('GET /json/component/<uuid>',()=>{
      return myrequest(appAuthorized)
        .get('/json/component/'+uuid)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body.type).toBe('cform'+suffix);
          expect(r.body.data.name).toBe("Dummy Test Object by JEST");
          expect(r.body.validity).toBeTruthy();
          expect(r.body.insertion).toBeTruthy();
        })
    });

    test('GET /json/component/<uuid>/simple',()=>{
      return myrequest(appAuthorized)
        .get('/json/component/'+uuid+"/simple")
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body.type).toBe('cform'+suffix);
          expect(r.body.data.name).toBe("Dummy Test Object by JEST");
          expect(r.body.data.dummyVal).toBeUndefined(); // Shoudl remove detail
          expect(r.body.validity).toBeTruthy();
          expect(r.body.insertion).toBeTruthy();
        })
    });

    test('GET /json/component/<uuid>/relationships',()=>{
      return myrequest(appAuthorized)
        .get('/json/component/'+uuid+"/simple")
        .expect('Content-Type', /json/)
        .expect(200);
        // FIXME do more here, include relationships in above object.
    });

    // Test data
     test('POST /json/test',()=>{
      return myrequest(appAuthorized)
        .post('/json/test')
        .send({
          formId: 'test'+suffix,
          componentUuid: uuid,
          data: {
            name: "Dummy Test Object by JEST",
            dummyVal: 999,
          },
          metadata: { deleteme: true },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          logger.info('/json/test',r.body);
          expect(r.body).toBeDefined();
          testId = r.body;
        });
    });

    // Test data as draft
     test('POST /json/test draft',()=>{
      return myrequest(appAuthorized)
        .post('/json/test')
        .send({
          formId: 'test'+suffix,
          componentUuid: uuid,
          data: {
            name: "DRAFT Dummy Test Object by JEST",
            dummyVal: 999,
          },
          state: "draft",
          metadata: { deleteme: true },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          logger.info('/json/test',r.body);
          expect(r.body).toBeDefined();
          draftTestId = r.body;
        })
      });

    // get test data back.
    test('GET /json/test/<id>',()=>{
      return myrequest(appAuthorized)
        .get('/json/test/'+testId)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body.formId).toBe('test'+suffix);
          expect(r.body.data.name).toBe("Dummy Test Object by JEST");
          expect(r.body.insertion).toBeTruthy();
        })

    });


    // get test data back.
    test('POST /json/test/getBulk',()=>{
      return myrequest(appAuthorized)
        .post('/json/test/getBulk')
        .send([testId])
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body.length).toBeGreaterThan(0)
          expect(r.body[0].formId).toBe('test'+suffix);
          expect(r.body[0].data.name).toBe("Dummy Test Object by JEST");
          expect(r.body[0].insertion).toBeTruthy();
        })

    });

    // Job data
     test('POST /json/job',()=>{
      return myrequest(appAuthorized)
        .post('/json/job')
        .send({
          formId: 'job'+suffix,
          data: {
            name: "Dummy Test Object by JEST",
            dummyVal: 999,
          },
          metadata: { deleteme: true },
        })
        .expect('Content-Type', /json/)
        // .expect(200)
        .then(r=>{
          logger.info("json/job",r.body);
          expect(r.body).toBeDefined();
          jobId = r.body;

        })
    });

    // get job data back.
    test('GET /json/job/<id>',()=>{
      return myrequest(appAuthorized)
        .get('/json/job/'+jobId)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body.formId).toBe('job'+suffix);
          expect(r.body.data.name).toBe("Dummy Test Object by JEST");
          expect(r.body.validity).toBeTruthy();
          expect(r.body.insertion).toBeTruthy();
        })

    });

    test('POST /json/course/<courseId>',()=>{
      return myrequest(appAuthorized)
        .post('/json/course/JEST_TEST_COURSE')
        .send({
          courseId: 'JEST_TEST_COURSE',
          componentType: 'cform'+suffix,
          name: 'Dummy Course by JEST',
          icon: [],
          tags: ['JEST'],
          path: [
            {  type: 'component',
              formId: "cform"+suffix,
              identifier: 'componentUuid',
              advice: "advice1", },
            { type: 'test',
              formId: "test"+suffix,
              advice: "advice2",
              identifier: 'componentUuid',
            }
          ]
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(()=>{});
    });
    
    test('GET /json/course/<courseId>',()=>{
      return myrequest(appAuthorized)
        .get('/json/course/JEST_TEST_COURSE')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body).toBeDefined();
          expect(r.body.path.length).toEqual(2);
        });
    });

    test('GET /json/course/<courseId>/<objectId> (course evaluation)',()=>{
      return myrequest(appAuthorized)
        .get('/json/course/JEST_TEST_COURSE/'+uuid)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body).toBeDefined();
          expect(r.body.score).toEqual(2);
          expect(r.body.score_denominator).toEqual(2);
        });
    })

    test('GET /json/courses',()=>{
      return myrequest(appAuthorized)
        .get('/json/courses')
        .expect('Content-Type', /json/)
        .expect(200);
    })


    // Various listings

    test('GET /json/components/<type>',()=>{
      return myrequest(appAuthorized)
        .get('/json/components/'+'cform'+suffix)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          logger.info(r.body);
          expect(r.body).toBeDefined();
          expect(r.body.length).toBeDefined();
          expect(r.body.pop().componentUuid).toBe(uuid);
        });
    });

    test('GET /json/componentTypes',()=>{
      return myrequest(appAuthorized)
        .get('/json/componentTypes')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          logger.info(r.body);
          expect(r.body).toBeDefined();
          expect(r.body['cform'+suffix]).toBeDefined();
        });
    });

    test('GET /json/componentTypesTags',()=>{
      return myrequest(appAuthorized)
        .get('/json/componentTypes')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          logger.info('componentTypesTags',r.body);
          expect(r.body['cform'+suffix]).toBeDefined();
        });
    });


    test('GET /componentForms',()=>{
      return myrequest(appAuthorized)
        .get('/json/componentForms')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body['cform'+suffix]).toBeDefined();
        });
    });

    test('GET /testForms',()=>{
      return myrequest(appAuthorized)
        .get('/json/testForms')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body['test'+suffix]).toBeDefined();
        });
    });

    test('GET /jobForms',()=>{
      return myrequest(appAuthorized)
        .get('/json/jobForms')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body['job'+suffix]).toBeDefined();
        });
    });

    test('GET /tests/<uuid>',()=>{
      return myrequest(appAuthorized)
        .get('/json/tests/'+uuid)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body.length).toBeGreaterThan(0);
        });
    });


  });  

  describe("autocomplete",()=>{
    test('GET /autocomplete/uuid/...',()=>{
        return myrequest(appAuthorized)
          .get('/autocomplete/uuid?q='+uuid.substr(0,5))
          .expect('Content-Type', /json/)
          .expect(200)
          .then(r=>{
            // logger.info("autocomplete",r.body);
            expect(r.body.length).toBeGreaterThan(0);
          });
    });
  });

  describe("searching",()=>{
    test('POST /json/search/component',()=>{
        return myrequest(appAuthorized)
          .post('/json/search/component')
          .send({search:"JEST"})
          .expect('Content-Type', /json/)
          .expect(200)
          .then(r=>{
            // logger.info("search result:",r.body);
            expect(r.body.length).toBeGreaterThan(0);
          });
    });

    test('POST /json/search/test',()=>{
        return myrequest(appAuthorized)
          .post('/json/search/test')
          .send({search:"JEST"})
          .expect('Content-Type', /json/)
          .expect(200)
          .then(r=>{
            // logger.info("search result:",r.body);
            expect(r.body.length).toBeGreaterThan(0);
          });
    });


    test('POST /json/search/job',()=>{
        return myrequest(appAuthorized)
          .post('/json/search/job')
          .send({search:"JEST"})
          .expect('Content-Type', /json/)
          .expect(200)
          .then(r=>{
            // logger.info("search result:",r.body);
            expect(r.body.length).toBeGreaterThan(0);
          });
    });
  });


  describe("componentRoutes",()=>{

    test("EditComponentForm",()=>{
      return myrequest(appAuthorized)
        .get('/EditComponentForm/cform'+suffix)
        .expect(200);
    })
    test("EditComponentForm wrong type",()=>{
      return myrequest(appAuthorized)
        .get('/EditComponentForm/nonexistent'+suffix)
        .expect(200);
    })

    test("List Types",()=>{
      return myrequest(appAuthorized).get('/components/type')
        .expect(200)
        .expect(new RegExp('cform'+suffix));
    });

    test("NewComponentType",()=>{
      return myrequest(appAuthorized)
        .get('/NewComponentType/cform+'+suffix)
        .expect(200);
    })

    test("List Recent of Type",()=>{
      return myrequest(appAuthorized).get('/components/type/cform'+suffix).expect(200);
    });

    test("NewComponent",()=>{
      return myrequest(appAuthorized)
        .get('/NewComponent/cform'+suffix)
        .expect(200);
    })
    test("Recent Components",()=>{
      return myrequest(appAuthorized)
        .get('/components/recent')
        .expect(200);
    })

    test("Recent Components of type",()=>{
      return myrequest(appAuthorized)
      .get('/components/type/cform'+suffix)
      .expect(200)
      .expect(new RegExp('cform'+suffix));
    });
  });


  describe("testRoutes",()=>{
   test("/test/<record_id>",()=>{
      return myrequest(appAuthorized)
      .get('/test/'+testId)
      .expect(200)
      .expect(new RegExp('JEST'));
    });


   test("/test/<form_id>",()=>{
      return myrequest(appAuthorized)
      .get('/test/test'+suffix)
      .expect(200)
      .expect(new RegExp('test'+suffix));
    });

   test("/test/<form_id>",()=>{
      return myrequest(appAuthorized)
      .get('/test/test'+suffix)
      .expect(200)
      .expect(new RegExp('test'+suffix));
    });

   test("/tests/<formId>",()=>{
      return myrequest(appAuthorized)
        .get('/tests/test'+suffix)
        .expect(200);
   })

   test("/test/copyAsDraft/<recordId>",()=>{
      return myrequest(appAuthorized)
        .get('/test/copyAsDraft/'+testId)
        .expect(302); // redirected successfully to the new one
   })

   test("/test/draft/<record_id>",()=>{
      return myrequest(appAuthorized)
      .get('/test/draft/'+draftTestId)
      .expect(200)
      .expect(new RegExp('test'+suffix));
    });

   test("/test/deleteDraft/<record_id>",()=>{
      return myrequest(appAuthorized)
      .get('/test/deleteDraft/'+draftTestId)
      .expect(302); // redirect back 
    });
  });

  describe("jobRoutes",()=>{

   test("/job/<jobId>",()=>{
      return myrequest(appAuthorized)
      .get('/job/'+jobId)
      .expect(200)
      .expect(new RegExp('JEST'));
    });

   test("/job/<formId>",()=>{
      return myrequest(appAuthorized)
      .get('/job/job'+suffix)
      .expect(200);
    });

   test("/job/edit/<jobId>",()=>{
      return myrequest(appAuthorized)
      .get('/job/edit/'+jobId)
      .expect(200);
    });

   test("/job/<jobId>/history",()=>{
      return myrequest(appAuthorized)
      .get('/job/'+jobId+"/history")
      .expect(200);
    });
   
   test("/jobs/<formId>",()=>{
      return myrequest(appAuthorized)
      .get('/jobs/job'+suffix)
      .expect(200)
      .expect(new RegExp('job'+suffix));
    });
   test("/job/copyAsDraft/<jobId>",()=>{
      return myrequest(appAuthorized)
      .get('/job/copyAsDraft/'+jobId)
      .expect(302);
    });
   test("/drafts",()=>{
      return myrequest(appAuthorized)
      .get('/drafts')
      .expect(200);
    });


 });
  describe("categories and courses",()=>{

    test("/category/:tag",()=>{
      return myrequest(appAuthorized)
      .get('/category/flute')
      .expect(200);
    });

    test("/courses",()=>{
      return myrequest(appAuthorized)
      .get('/courses')
      .expect(200);
    });
    test("/EditCourse/:courseId",()=>{
      return myrequest(appAuthorized)
      .get('/EditCourse/test-course')
      .expect(200);
    });
    // FIXME  need more

  });

  describe("userRoutes",()=>{

    test("/profile",()=>{
      return myrequest(appAuthorized)
      .get('/profile')
      .expect(200);
    });
    test("/promoteYourself",()=>{
      return myrequest(appAuthorized)
      .get('/promoteYourself')
      .expect(200);
    });
    // test("/promoteYourself limits rate",async ()=>{
    //   var userSession = session(appAuthorized);
    //   checkRouteOffChecklist('post','/promoteYourself');
    //   await userSession.post('/promoteYourself').send({user:"dummy",password:"badpassword"});
    //   await userSession.post('/promoteYourself').send({user:"dummy",password:"badpassword"});
    //   await userSession.post('/promoteYourself').send({user:"dummy",password:"badpassword"});
    //   await userSession.post('/promoteYourself').send({user:"dummy",password:"badpassword"})
    //   .expect(403);
    // });

    test("/users",()=>{
      return myrequest(appAuthorized)
      .get('/users')
      .expect(200);
    });
    test("/user/auth0%7C5e4c0a06b6ef8d0e9ccffc5d",()=>{
      return myrequest(appAuthorized)
      .get('/users')
      .expect(200);
    });
    test("/json/roles",()=>{
      return myrequest(appAuthorized)
      .get('/json/roles')
      .expect(200);
    });
    test("/json/users",()=>{
      return myrequest(appAuthorized)
      .get('/json/users')
      .expect(200);
    });
    test("/json/user/auth0%7C5e4c0a06b6ef8d0e9ccffc5d",()=>{
      return myrequest(appAuthorized)
      .get('/json/user/auth0%7C5e4c0a06b6ef8d0e9ccffc5d')
      .expect(200);
    });
    test("post /json/user/auth0%7C5e4c0a06b6ef8d0e9ccffc5d",()=>{
      return myrequest(appAuthorized)
      .post('/json/user/auth0%7C5e4c0a06b6ef8d0e9ccffc5d')
      .send({user_metadata:{dummy:"dummy"}})
      .expect(400);
    });
 });

  describe("file routes",()=>{
    var fileurl;
    test("POST file to /gridfs ",(done)=>{
      
        // fs.readFile("static/images/Otterbein.png",
          // function(buffer){
            myrequest(appAuthorized)
              .post("/file/gridfs")
              // .attach('name', buffer, {filename:'myTestFile.png', contentType:"image/png"})
              .attach('name', "static/images/browser_icon.png")
              .expect('Content-Type', /json/)
              .expect(200)
              .then(r=>{
                logger.info("gridfs post result:",r.body);
                expect(r.body).toBeTruthy();
                var url = r.body.url;
                fileurl = '/' + url.split('/').splice(3).join('/')
                logger.info("fileurl",url, fileurl);
                done();
              });
          // });


    });
    test("GET file from gridfs",()=>{
        return myrequest(appAuthorized)
          .get(fileurl)
          .expect(200);

    });
  })
  describe("done",()=>{
    test("done",()=>{})
  });

});

