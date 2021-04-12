var load_config = require("../lib/configuration.js"); // exports the global 'config' variable.const request = require('supertest');
const request = require('supertest');
const express = require('express');
const session = require('supertest-session');
const fs = require("fs");

const App= require("../lib/app.js");
const database = require("../lib/database.js");
global.BaseDir = process.cwd();


var appPublic = express();
var appAuthorized = express();

var suffix = "-THIS-IS-AN-AUTOMATED-UNIT-TEST";

var user =  {
         displayName: 'ntagg@otterbein.edu',
         id: 'auth0|5e4c0a06b6ef8d0e9ccffc5d',
         user_id: 'auth0|5e4c0a06b6ef8d0e9ccffc5d',
         emails: [ { value: 'ntagg@otterbein.edu' } ],
         nickname: 'ntagg',
         permissions:
         [ 'components:create',
           'components:edit',
           'components:view',
           'dev:components:create',
           'dev:components:edit',
           'dev:components:view',
           'dev:forms:edit',
           'dev:forms:view',
           'dev:jobs:process',
           'dev:jobs:submit',
           'dev:jobs:view',
           'dev:tests:submit',
           'dev:tests:view',
           'forms:view',
           'tests:submit',
           'tests:view' ],
           roles:
         [ 'component editor',
           'dev-admin',
           'dev component editor',
           'dev tester',
           'dev-user',
           'tester' ]
        };

var uuid, testId, jobId;
var draftTestId;

beforeAll(async () => {
  var pino_opts = {
    customLevels: {
        http: 29
    },
    level: 'error', 
  };
global.logger = require("pino")(pino_opts);

  // logger.info("beforeAll");
  await database.attach_to_database()

  await App.create_app(appPublic);
  await App.setup_routes(appPublic);

  // user data is injected into the application stack first.
  // Putting it between these causes issues downstream.
  appAuthorized.use((req,res,next)=>{ req.user = user; next();});
  await App.create_app(appAuthorized);
  await App.setup_routes(appAuthorized);


  // logger.info("done initializing");
  }
);

afterAll( async () => {
    await db.collection("componentForms").deleteMany({formId:"cform"+suffix});
    await db.collection("testForms").deleteMany({formId:"test"+suffix});
    await db.collection("jobForms").deleteMany({formId:"job"+suffix});
    await db.collection("components").deleteMany({type:"cform"+suffix});
    await db.collection("tests").deleteMany({formId:"test"+suffix});
    await db.collection("jobs").deleteMany({formId:"job"+suffix});
    await database.shutdown(true);
} );

// inject a custom user authorization here.
describe("public functions",function() {
  test('route /',function(done) {
    request(appPublic).get('/').expect(200,done);
  });
  test('route /components/type',function(done) {
    request(appPublic).get('/components/type').expect(400,done);
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
  //   request(appAuthorized).get('/').expect(200,done);
  // });
  // test('route /components/type',function(done) {
  //   request(appAuthorized).get('/components/type').expect(200,done);
  // });

  // // describe("API/JSON routes")

  // describe("job routes",()=>{
  //   test('route /workflows (job types)',function(done) { request(appAuthorized).get('/jobs/workflows').expect(200,done); });

  //   test('route /jobs (recent jobs)',function(done) { request(appAuthorized).get('/jobs').expect(200,done); });
  //   test('route /jobs/4by4workflow (recent 4by4)',function(done) { request(appAuthorized).get('/jobs/4by4_workflow').expect(200,done); });
  //   test('route /job/4by4workflow (run 4by4)',function(done) { request(appAuthorized).get('/job/4by4_workflow').expect(200,done); });
  //   test('route /EditWorkflowForm/4by4_workflow',function(done) { request(appAuthorized).get('/EditWorkflowForm/4by4_workflow').expect(200,done); });
  // });



  // nontrivial tests. Insert and query API, then check GUI routes


  describe("API/JSON",()=>{
    test('POST /json/componentForms/<type>',function(done){
      expect.assertions(0);
      return request(appAuthorized)
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
      return request(appAuthorized)
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
      return request(appAuthorized)
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
      return request(appAuthorized)
        .get('/json/testForms/test'+suffix)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.formId).toBe("test"+suffix);
        });
    });

    test('POST /json/jobForms/<type>',()=>{
      return request(appAuthorized)
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
      return request(appAuthorized)
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
      return request(appAuthorized)
        .get('/json/generateComponentUuid')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response=>{
          uuid = response.body;
          logger.info("GOT UUID",uuid);
        })
    });

    test('POST /json/component/<uuid>',()=>{
      return request(appAuthorized)
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
      return request(appAuthorized)
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
      return request(appAuthorized)
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
      return request(appAuthorized)
        .get('/json/component/'+uuid+"/simple")
        .expect('Content-Type', /json/)
        .expect(200);
        // FIXME do more here, include relationships in above object.
    });

    // Test data
     test('POST /json/test',()=>{
      return request(appAuthorized)
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
      return request(appAuthorized)
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


    // Job data
     test('POST /json/job',()=>{
      return request(appAuthorized)
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
      return request(appAuthorized)
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


    // Various listings

    test('GET /json/components/<type>',()=>{
      return request(appAuthorized)
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
      return request(appAuthorized)
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
      return request(appAuthorized)
        .get('/json/componentTypes')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          logger.info('componentTypesTags',r.body);
          expect(r.body['cform'+suffix]).toBeDefined();
        });
    });


    test('GET /componentForms',()=>{
      return request(appAuthorized)
        .get('/json/componentForms')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body['cform'+suffix]).toBeDefined();
        });
    });

    test('GET /testForms',()=>{
      return request(appAuthorized)
        .get('/json/testForms')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body['test'+suffix]).toBeDefined();
        });
    });

    test('GET /jobForms',()=>{
      return request(appAuthorized)
        .get('/json/jobForms')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(r=>{
          expect(r.body['job'+suffix]).toBeDefined();
        });
    });

    test('GET /tests/<uuid>',()=>{
      return request(appAuthorized)
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
        return request(appAuthorized)
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
        return request(appAuthorized)
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
        return request(appAuthorized)
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
        return request(appAuthorized)
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
      return request(appAuthorized)
        .get('/EditComponentForm/cform'+suffix)
        .expect(200);
    })
    test("EditComponentForm wrong type",()=>{
      return request(appAuthorized)
        .get('/EditComponentForm/nonexistent'+suffix)
        .expect(200);
    })

    test("List Types",()=>{
      return request(appAuthorized).get('/components/type')
        .expect(200)
        .expect(new RegExp('cform'+suffix));
    });

    test("NewComponentType",()=>{
      return request(appAuthorized)
        .get('/NewComponentType/cform+'+suffix)
        .expect(200);
    })

    test("List Recent of Type",()=>{
      return request(appAuthorized).get('/components/type/cform'+suffix).expect(200);
    });

    test("NewComponent",()=>{
      return request(appAuthorized)
        .get('/NewComponent/cform'+suffix)
        .expect(200);
    })
    test("Recent Components",()=>{
      return request(appAuthorized)
        .get('/components/recent')
        .expect(200);
    })

    test("Recent Components of type",()=>{
      return request(appAuthorized)
      .get('/components/type/cform'+suffix)
      .expect(200)
      .expect(new RegExp('cform'+suffix));
    });
  });


  describe("testRoutes",()=>{
   test("/test/<record_id>",()=>{
      return request(appAuthorized)
      .get('/test/'+testId)
      .expect(200)
      .expect(new RegExp('JEST'));
    });

   test("/test/<form_id>",()=>{
      return request(appAuthorized)
      .get('/test/test'+suffix)
      .expect(200)
      .expect(new RegExp('test'+suffix));
    });

   test("/test/<form_id>",()=>{
      return request(appAuthorized)
      .get('/test/test'+suffix)
      .expect(200)
      .expect(new RegExp('test'+suffix));
    });

   test("/tests/<formId>",()=>{
      return request(appAuthorized)
        .get('/tests/test'+suffix)
        .expect(200);
   })

   test("/test/copyAsDraft/<recordId>",()=>{
      return request(appAuthorized)
        .get('/test/copyAsDraft/'+testId)
        .expect(302); // redirected successfully to the new one
   })

   test("/test/draft/<record_id>",()=>{
      return request(appAuthorized)
      .get('/test/draft/'+draftTestId)
      .expect(200)
      .expect(new RegExp('test'+suffix));
    });

   test("/test/deleteDraft/<record_id>",()=>{
      return request(appAuthorized)
      .get('/test/deleteDraft/'+draftTestId)
      .expect(302); // redirect back 
    });
  });

  describe("jobRoutes",()=>{

   test("/job/<jobId>",()=>{
      return request(appAuthorized)
      .get('/job/'+jobId)
      .expect(200)
      .expect(new RegExp('JEST'));
    });

   test("/job/<formId>",()=>{
      return request(appAuthorized)
      .get('/job/job'+suffix)
      .expect(200);
    });

   test("/job/edit/<jobId>",()=>{
      return request(appAuthorized)
      .get('/job/edit/'+jobId)
      .expect(200);
    });

   test("/job/<jobId>/history",()=>{
      return request(appAuthorized)
      .get('/job/'+jobId+"/history")
      .expect(200);
    });
   
   test("/jobs/<formId>",()=>{
      return request(appAuthorized)
      .get('/jobs/job'+suffix)
      .expect(200)
      .expect(new RegExp('job'+suffix));
    });
   test("/job/copyAsDraft/<jobId>",()=>{
      return request(appAuthorized)
      .get('/job/copyAsDraft/'+jobId)
      .expect(302);
    });
   test("/drafts",()=>{
      return request(appAuthorized)
      .get('/drafts')
      .expect(200);
    });


 });

  describe("userRoutes",()=>{

    test("/profile",()=>{
      return request(appAuthorized)
      .get('/profile')
      .expect(200);
    });
    test("/profile/<userId>",()=>{
      return request(appAuthorized)
      .get('/profile/'+user.user_id)
      .expect(200);
    });
    test("/promoteYourself",()=>{
      return request(appAuthorized)
      .get('/promoteYourself')
      .expect(200);
    });
    test("/promoteYourself limits rate",async ()=>{
      var userSession = session(appAuthorized);
      await userSession.post('/promoteYourself').send({user:"dummy",password:"dummy"});
      await userSession.post('/promoteYourself').send({user:"dummy",password:"dummy"});
      await userSession.post('/promoteYourself').send({user:"dummy",password:"dummy"})
      await userSession.post('/promoteYourself').send({user:"dummy",password:"dummy"})
      .expect(403);
    });


 });

  describe("file routes",()=>{
    var fileurl;
    test("POST file to /gridfs ",(done)=>{
      
        // fs.readFile("static/images/Otterbein.png",
          // function(buffer){
            request(appAuthorized)
              .post("/file/gridfs")
              // .attach('name', buffer, {filename:'myTestFile.png', contentType:"image/png"})
              .attach('name', "static/images/browser_icon.png")
              .expect('Content-Type', /json/)
              .expect(200)
              .then(r=>{
                // logger.info("search result:",r.body);
                expect(r.body).toBeTruthy();
                var url = r.body.url;
                fileurl = '/' + url.split('/').splice(3).join('/')
                logger.info("fileurl",url, fileurl);
                done();
              });
          // });


    });
    test("GET file from gridfs",()=>{
        return request(appAuthorized)
          .get(fileurl)
          .expect(200);

    });
  })
  describe("done",()=>{
    test("done",()=>{})
  });

});

