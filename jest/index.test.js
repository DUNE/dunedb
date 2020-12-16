global.config = require("../configuration.js");
const request = require('supertest');
const express = require('express');

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

beforeAll(async () => {
  // console.log("beforeAll");
  await database.attach_to_database()

  await App.create_app(appPublic);
  await App.setup_routes(appPublic);

  // user data is injected into the application stack first.
  // Putting it between these causes issues downstream.
  appAuthorized.use((req,res,next)=>{ req.user = user; next();});
  await App.create_app(appAuthorized);
  await App.setup_routes(appAuthorized);


  // console.log("done initializing");
  }
);

afterAll( async () => {
    await db.collection("componentForms").deleteMany({formId:"cform"+suffix});
    await db.collection("testForms").deleteMany({formId:"test"+suffix});
    await db.collection("jobForms").deleteMany({formId:"job"+suffix});
    await db.collection("components").deleteMany({type:"cform"+suffix});
    await db.collection("tests").deleteMany({formId:"test"+suffix});
    await db.collection("jobs").deleteMany({formId:"jobs"+suffix});

  await database.shutdown(true);
  console.log("shutdown");

  // FIXME express-bouncer being run in userRoutes is keeping things alive..!
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
          console.log("GOT UUID",uuid);
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
          expect(r.body).toBeDefined();
          expect(r.body._id).toBeDefined();
          testId = r.body._id;

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
          console.log("json/job",r.body);
          expect(r.body).toBeDefined();
          expect(r.body.jobId).toBeDefined();
          jobId = r.body.jobId;

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
          console.log(r.body);
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
          console.log(r.body);
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
          console.log('componentTypesTags',r.body);
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
            // console.log("autocomplete",r.body);
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
            // console.log("search result:",r.body);
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
            // console.log("search result:",r.body);
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
            // console.log("search result:",r.body);
            expect(r.body.length).toBeGreaterThan(0);
          });
    });
  });


  describe("ComponentForm",()=>{

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


  }) // Component Form

  describe("Component",()=>{

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

    // Fails!  Something to do with automatic parsing from processes.
    // test("NewComponent wrong type",()=>{
    //   return request(appAuthorized)
    //     .get('/NewComponent/nonexistent'+suffix)
    //     .expect(400);
    // })

  });

  // create new component form with distintive FormId via api
  // create new component  via api
  // get component via api
  // view component in page
  // check component shows up in lists

  // create new testform via api
  // create new test component made above
  // retrive test via api
  // view test via page
  // check test shows up in component list

  // create new workflow form via api
  // create new job from workflow
  // retrive via api
  // view with page
  // check it shows up in recent list

});

  // delete the component form
  // delete the component
  // delete the test form
  // delete the test
  // delete the workfow form
  // delete the job



// (async function () {
// const browser = new Browser();
// try {
//   var res = await browser.visit('/');
//   console.log(res);
//   res = await browser.visit('/bad');
//   console.log(res);
// } catch (err) {
//   console.log("CAUGHT",err);
// }
// })();





// test('adds 1 + 2 to equal 3', () => {
//   expect(sum(1, 2)).toBe(3);
// });






// const Browser = require('zombie');

// // We're going to make requests to http://example.com/signup
// // Which will be routed to our test server localhost:3000
// Browser.localhost('example.com', 3000);

// describe('User visits signup page', function() {

//   const browser = new Browser();

//   before(function(done) {
//     browser.visit('/signup', done);
//   });

//   describe('submits form', function() {

//     before(function(done) {
//       browser
//         .fill('email',    'zombie@underworld.dead')
//         .fill('password', 'eat-the-living')
//         .pressButton('Sign Me Up!', done);
//     });

//     it('should be successful', function() {
//       browser.assert.success();
//     });

//     it('should see welcome page', function() {
//       browser.assert.text('title', 'Welcome To Brains Depot');
//     });
//   });
// });