const express = require('express');
const fs = require('fs');
const pino = require('pino');
const supertest = require('supertest');

const App = require('../lib/app');
const { db } = require('../lib/db');
const { getRoutes } = require('./getRoutes');

global.BaseDir = process.cwd();
const appPublic = express();
const appAuthorized = express();
const pino_opts = {
  customLevels: {
    http: 29,
  },
  level: 'http',
};

// Declare and initialise variables
let uuid, actionId, workflowId;
let routes_toBeTested = {};

// Set up a logger using the defined 'pino' settings and a destination file (in the same directory as this script)
const logger = pino(pino_opts, pino.destination('logger.log'));

// Set a string to append to all information to be set and get in the unit tests
const suffix = '_UnitTest';

// Set up a temporary user with full access permissions, to be used only within the unit tests ... this user will inherit some information from the currently logged in human user
const user = {
  email: `${process.env.USER}@${process.env.HOST}`,
  name: `[JEST] ${process.env.USER}`,
  nickname: `JEST`,
  user_id: `jest|${process.env.USER}`,
  permissions: [
    'actions:perform',
    'actions:view',
    'components:edit',
    'components:view',
    'forms:edit',
    'users:view',
    'workflows:edit',
    'workflows:view',
  ],
  roles: [
    'admin',
  ],
};

logger.info(`Set up 'user': ${user}`);
console.log(`Set up 'user': ${user}`);

// Set up a dummy type form (the actual schema doesn't matter ... there just has to be something!)
const dummySchema = {
  components: [{
    type: 'textfield',
    label: 'Dummy Text Field',
    key: 'name',
    placeholder: 'Enter some text here',
    tooltip: 'This is a dummy tooltip',
    validate: { required: true, },
    input: true,
  }]
};


//////////////////////////
/// INTERNAL FUNCTIONS ///
//////////////////////////

/// Function for removing a tested [method, route] combination from the global list of routes remaining to be tested
function checkRouteOffChecklist(method, route) {
  routes_toBeTested.all = routes_toBeTested.all.filter(function (entry) {
    if (method !== entry.method) return true;
    if (entry.prefix && !route.startsWith(entry.prefix)) return true;
    if (route.replace(entry.prefix, '').match(entry.regexp)) return false;

    return true;
  });
}

/// Function to call all relevant methods ('get', 'post', etc.) for a particular route, and then remove each [method, route] combination from the global list of routes remaining to be tested
function myrequest(app) {
  const r = supertest(app);

  return new function () {
    this.get = function (...args) { checkRouteOffChecklist('get', args[0]); return r.get(...args); }
    this.post = function (...args) { checkRouteOffChecklist('post', args[0]); return r.post(...args); }
  }
}

/// Function to run before starting the unit tests
beforeAll(async () => {
  try {
    logger.info(`Starting function: 'beforeAll'`);
    console.log(`Starting function: 'beforeAll'`);

    // Initialise and attach a new instance of the DB
    await db.open();
    logger.info('DB initialised and attached');
    console.log('DB initialised and attached');

    // Get a new Express app, initially without any user data
    await App.create_app(appPublic);

    // Inject the previously defined user data into the application stack, and then get a new Express app, now with the correct user authorisation setup
    appAuthorized.use((req, res, next) => { req.user = user; next(); });
    await App.create_app(appAuthorized);

    // Get a list of all routes that this app can use, and then remove any that don't need to be unit-tested (i.e. the ones defined in '/lib/auth.js')
    routes_toBeTested = getRoutes(appAuthorized);

    routes_toBeTested.all = routes_toBeTested.all.filter(function (e) {
      if (e.route == '/login') return false;
      if (e.route == '/callback') return false;
      if (e.route == '/logout') return false;

      if (e.route.startsWith('/api')) return false;

      return true;
    });

    // Write a list of the routes to be tested to a file (in the same directory as this script)
    let routes_toBeTested_list = [];

    for (const entry of routes_toBeTested.all) { routes_toBeTested_list.push(entry.route) }
    fs.writeFileSync('routes_toBeTested.log', routes_toBeTested_list.join('\n'));

    logger.info(`Found ${routes_toBeTested.all.length} routes to be tested ... logged in 'routes_toBeTested.log'`);
    console.log(`Found ${routes_toBeTested.all.length} routes to be tested ... logged in 'routes_toBeTested.log'`);

    logger.info(`Finished function: 'beforeAll'`);
    console.log(`Finished function: 'beforeAll'`);
  } catch (err) {
    logger.error(err);
    console.log(err);
  }
});

/// Function to run after completing all possible unit tests
afterAll(async () => {
  logger.info(`Starting function: 'afterAll'`);
  console.log(`Starting function: 'afterAll'`);

  // Write a list of the routes that were not tested to a file (in the same directory as this script)
  let routes_notTested = [];

  for (const entry of routes_toBeTested.all) { routes_notTested.push(entry.route) }
  fs.writeFileSync('routes_notTested.log', routes_notTested.join('\n'));

  logger.info(`Found ${routes_notTested.length} routes that were not tested ... logged in 'routes_notTested.log'`);
  console.log(`Found ${routes_notTested.length} routes that were not tested ... logged in 'routes_notTested.log'`);

  // Remove all of the records that were added to the DB as part of the unit tests, and then close the DB instance
  await db.collection('componentForms').deleteMany({ formId: `cform${suffix}` });
  await db.collection('actionForms').deleteMany({ formId: `aform${suffix}` });
  await db.collection('workflowForms').deleteMany({ formId: `wform${suffix}` });
  await db.collection('components').deleteMany({ formId: `cform${suffix}` });
  await db.collection('actions').deleteMany({ typeFormId: `aform${suffix}` });
  await db.collection('workflows').deleteMany({ typeFormId: `wform${suffix}` });
  await db.close();

  logger.info('Removed unit test records from DB');
  console.log('Removed unit test records from DB');

  logger.info(`Finished function: 'afterAll'`);
  console.log(`Finished function: 'afterAll'`);
});


//////////////////
/// UNIT TESTS ///
//////////////////

// Test the public routes ... i.e. ones that do not need user authorisation
// Also include in this an attempt to test a private route - i.e. one that is expected to fail (return '400' instead of '200'), to confirm that the user authorisation setup is working correctly
describe('Public routes', function () {
  test('GET /', function (done) {
    return myrequest(appPublic)
      .get('/')
      .expect(200, done);
  });

  test('GET /componentTypes/list', function (done) {
    return myrequest(appPublic)
      .get('/componentTypes/list')
      .expect(400, done);
  });
});

// Test the private routes ... i.e. browser interface and JSON prefixed
describe('Private routes', function () {
  // Form routes
  describe('Form routes', () => {
    test('POST /json/componentForms/<typeFormId>', function (done) {
      return myrequest(appAuthorized)
        .post(`/json/componentForms/cform${suffix}`)
        .send({
          formId: `cform${suffix}`,
          formName: `Component Type ${suffix}`,
          schema: dummySchema,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => done());
    });

    test('POST /json/actionForms/<typeFormId>', function (done) {
      return myrequest(appAuthorized)
        .post(`/json/actionForms/aform${suffix}`)
        .send({
          formId: `aform${suffix}`,
          formName: `Action Type ${suffix}`,
          schema: dummySchema,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => done());
    });

    test('POST /json/workflowForms/<typeFormId>', function (done) {
      return myrequest(appAuthorized)
        .post(`/json/workflowForms/wform${suffix}`)
        .send({
          formId: `wform${suffix}`,
          formName: `Workflow Type ${suffix}`,
          schema: dummySchema,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(() => done());
    });

    test('GET /json/componentForms/<typeFormId>', () => {
      return myrequest(appAuthorized)
        .get(`/json/componentForms/cform${suffix}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.formId).toBe(`cform${suffix}`);
        });
    });

    test('GET /json/actionForms/<typeFormId>', () => {
      return myrequest(appAuthorized)
        .get(`/json/actionForms/aform${suffix}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.formId).toBe(`aform${suffix}`);
        });
    });

    test('GET /json/workflowForms/<typeFormId>', () => {
      return myrequest(appAuthorized)
        .get(`/json/workflowForms/wform${suffix}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.formId).toBe(`wform${suffix}`);
        });
    });

    test('GET /json/componentForms/list', () => {
      return myrequest(appAuthorized)
        .get('/json/componentForms/list')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body[`cform${suffix}`]).toBeDefined();
        });
    });

    test('GET /json/actionForms/list', () => {
      return myrequest(appAuthorized)
        .get('/json/actionForms/list')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body[`aform${suffix}`]).toBeDefined();
        });
    });

    test('GET /json/workflowForms/list', () => {
      return myrequest(appAuthorized)
        .get('/json/workflowForms/list')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body[`wform${suffix}`]).toBeDefined();
        });
    });
  });

  // Component routes
  describe('Component routes', () => {
    test('GET /json/newComponentUUID', () => {
      return myrequest(appAuthorized)
        .get('/json/newComponentUUID')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          uuid = response.body;
        });
    });

    test('POST /json/component', () => {
      return myrequest(appAuthorized)
        .post('/json/action')
        .send({
          formId: `cform${suffix}`,
          data: { name: 'Dummy Component by JEST', },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeDefined();
          uuid = response.body;
        });
    });

    test('GET /json/component/<uuid>', () => {
      return myrequest(appAuthorized)
        .get(`/json/component/${uuid}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.typeFormId).toBe(`cform${suffix}`);
          expect(response.body.data.name).toBe('Dummy Component by JEST');
        });
    });

    test('GET /json/components/<typeFormId>/list', () => {
      return myrequest(appAuthorized)
        .get(`/json/components/cform${suffix}/list`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body.length).toBeGreaterThan(0);
          expect(response.body[0]).toBe(uuid);
        });
    });

    test('GET /component/<uuid>', () => {
      return myrequest(appAuthorized)
        .get(`/component/${uuid}`)
        .expect(200);
    });

    test('GET /component/<uuid>/qrCodes', () => {
      return myrequest(appAuthorized)
        .get(`/component/${uuid}/qrCodes`)
        .expect(200);
    });

    test('GET /component/<uuid>/summary', () => {
      return myrequest(appAuthorized)
        .get(`/component/${uuid}/summary`)
        .expect(200);
    });

    test('GET /component/<uuid>/execSummary', () => {
      return myrequest(appAuthorized)
        .get(`/component/${uuid}/execSummary`)
        .expect(200);
    });

    test('GET /component/<typeFormId>', () => {
      return myrequest(appAuthorized)
        .get(`/component/cform${suffix}`)
        .expect(200);
    });

    test('GET /component/<uuid>/edit', () => {
      return myrequest(appAuthorized)
        .get(`/component/${uuid}/edit`)
        .expect(200);
    });

    test('GET /component/<uuid>/updateBoardLocations/<criteria>', () => {
      return myrequest(appAuthorized)
        .get(`/component/${uuid}/updateBoardLocations/${'daresbury'}/${'2023-01-01'}`)
        .expect(200);
    });

    test('GET /componentTypes/<typeFormId>/new', () => {
      return myrequest(appAuthorized)
        .get(`/componentTypes/cform${suffix}/new`)
        .expect(200);
    });

    test('GET /componentTypes/<typeFormId>/edit', () => {
      return myrequest(appAuthorized)
        .get(`/componentTypes/cform${suffix}/edit`)
        .expect(200);
    });

    test('GET /componentTypes/list', () => {
      return myrequest(appAuthorized)
        .get('/componentTypes/list')
        .expect(200);
    });

    test('GET /components/list', () => {
      return myrequest(appAuthorized)
        .get('/components/list')
        .expect(200);
    });

    test('GET /components/<typeFormId>/list', () => {
      return myrequest(appAuthorized)
        .get(`/components/cform${suffix}/list`)
        .expect(200);
    });
  });

  // Action routes
  describe('Action routes', () => {
    test('POST /json/action', () => {
      return myrequest(appAuthorized)
        .post('/json/action')
        .send({
          typeFormId: `aform${suffix}`,
          componentUuid: uuid,
          data: { name: 'Dummy Action by JEST', },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeDefined();
          actionId = response.body;
        });
    });

    test('GET /json/action/<actionId>', () => {
      return myrequest(appAuthorized)
        .get(`/json/action/${actionId}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.typeFormId).toBe(`aform${suffix}`);
          expect(response.body.data.name).toBe('Dummy Action by JEST');
        });
    });

    test('POST /json/action/<actionId>/addImages', () => {
      return myrequest(appAuthorized)
        .post(`/json/action/${actionId}/addImages`)
        .expect('Content-Type', /json/)
        .then(response => {
          expect(response.body).toBe(actionId);
        });
    });

    test('GET /json/actions/<typeFormId>/list', () => {
      return myrequest(appAuthorized)
        .get(`/json/actions/aform${suffix}/list`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body.length).toBeGreaterThan(0);
          expect(response.body[0]).toBe(actionId);
        });
    });

    test('GET /action/<actionId>', () => {
      return myrequest(appAuthorized)
        .get(`/action/${actionId}`)
        .expect(200);
    });

    test('GET /action/<typeFormId>/unspec', () => {
      return myrequest(appAuthorized)
        .get(`/action/aform${suffix}/unspec`)
        .expect(200);
    });

    test('GET /action/<typeFormId>/<uuid>', () => {
      return myrequest(appAuthorized)
        .get(`/action/aform${suffix}/${uuid}`)
        .expect(200);
    });

    test('GET /action/<actionId>/edit', () => {
      return myrequest(appAuthorized)
        .get(`/action/${actionId}/edit`)
        .expect(200);
    });

    test('GET /actionTypes/<typeFormId>/new', () => {
      return myrequest(appAuthorized)
        .get(`/actionTypes/aform${suffix}/new`)
        .expect(200);
    });

    test('GET /actionTypes/<typeFormId>/edit', () => {
      return myrequest(appAuthorized)
        .get(`/actionTypes/aform${suffix}/edit`)
        .expect(200);
    });

    test('GET /actionTypes/list', () => {
      return myrequest(appAuthorized)
        .get('/actionTypes/list')
        .expect(200);
    });

    test('GET /actions/list', () => {
      return myrequest(appAuthorized)
        .get('/actions/list')
        .expect(200);
    });

    test('GET /actions/<typeFormId>/list', () => {
      return myrequest(appAuthorized)
        .get(`/actions/aform${suffix}/list`)
        .expect(200);
    });
  });

  // Workflow routes
  describe('Workflow routes', () => {
    test('POST /json/workflow', () => {
      return myrequest(appAuthorized)
        .post('/json/workflow')
        .send({
          typeFormId: `wform${suffix}`,
          data: { name: 'Dummy Workflow by JEST', },
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeDefined();
          workflowId = response.body;
        });
    });

    test('GET /json/workflow/<workflowId>', () => {
      return myrequest(appAuthorized)
        .get(`/json/workflow/${workflowId}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body).toBeTruthy();
          expect(response.body.typeFormId).toBe(`wform${suffix}`);
          expect(response.body.data.name).toBe('Dummy Workflow by JEST');
        });
    });

    test('GET /workflow/<workflowId>', () => {
      return myrequest(appAuthorized)
        .get(`/workflow/${workflowId}`)
        .expect(200);
    });

    test('GET /workflow/<typeFormId>', () => {
      return myrequest(appAuthorized)
        .get(`/workflow/wform${suffix}`)
        .expect(200);
    });

    test('GET /workflow/<workflowId>/edit', () => {
      return myrequest(appAuthorized)
        .get(`/workflow/${workflowId}/edit`)
        .expect(200);
    });

    test('GET /workflow/<workflowId>/<criteria>', () => {
      return myrequest(appAuthorized)
        .get(`/workflow/${workflowId}/${'component'}/${uuid}`)
        .expect(200);
    });

    test('GET /workflowTypes/<typeFormId>/new', () => {
      return myrequest(appAuthorized)
        .get(`/workflowTypes/wform${suffix}/new`)
        .expect(200);
    });

    test('GET /workflowTypes/<typeFormId>/edit', () => {
      return myrequest(appAuthorized)
        .get(`/workflowTypes/wform${suffix}/edit`)
        .expect(200);
    });

    test('GET /workflowTypes/list', () => {
      return myrequest(appAuthorized)
        .get('/workflowTypes/list')
        .expect(200);
    });

    test('GET /workflows/list', () => {
      return myrequest(appAuthorized)
        .get('/workflows/list')
        .expect(200);
    });

    test('GET /workflows/<typeFormId>/list', () => {
      return myrequest(appAuthorized)
        .get(`/workflows/wform${suffix}/list`)
        .expect(200);
    });
  });

  // Search routes
  describe('Search routes', () => {
    test('GET /search', () => {
      return myrequest(appAuthorized)
        .get('/search')
        .expect(200);
    });

    test('GET /search/recordByUUIDOrID', () => {
      return myrequest(appAuthorized)
        .get('/search/recordByUUIDOrID')
        .expect(200);
    });

    test('GET /search/geoBoardsByLocationOrPartNumber', () => {
      return myrequest(appAuthorized)
        .get('/search/geoBoardsByLocationOrPartNumber')
        .expect(200);
    });

    test('GET /json/search/geoBoardsByLocation/<location>', () => {
      return myrequest(appAuthorized)
        .get(`/json/search/geoBoardsByLocation/${'daresbury'}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    test('GET /json/search/geoBoardsByPartNumber/<partNumber>', () => {
      return myrequest(appAuthorized)
        .get(`/json/search/geoBoardsByPartNumber/${'123456'}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    test('GET /search/geoBoardsByVisInspectOrOrderNumber', () => {
      return myrequest(appAuthorized)
        .get('/search/geoBoardsByVisInspectOrOrderNumber')
        .expect(200);
    });

    test('GET /json/search/geoBoardsByVisualInspection/<criteria>', () => {
      return myrequest(appAuthorized)
        .get(`/json/search/geoBoardsByVisualInspection/${'disposition'}?issue=${'issue'}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    test('GET /json/search/geoBoardsByOrderNumber/<orderNumber>', () => {
      return myrequest(appAuthorized)
        .get(`/json/search/geoBoardsByOrderNumber/${'123456'}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    test('GET /search/boardShipmentsByReceptionDetails', () => {
      return myrequest(appAuthorized)
        .get('/search/boardShipmentsByReceptionDetails')
        .expect(200);
    });

    test('GET /json/search/boardShipmentsByReceptionDetails?<criteria>', () => {
      return myrequest(appAuthorized)
        .get(`/json/search/boardShipmentsByReceptionDetails?shipmentStatus=${'received'}&originLocation=${'daresbury'}&destinationLocation=${'lancaster'}&earliestDate=${''}&latestDate=${''}&receptionComment=${''}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    test('GET /search/workflowsByUUID', () => {
      return myrequest(appAuthorized)
        .get('/search/workflowsByUUID')
        .expect(200);
    });

    test('GET /json/search/workflowsByUUID/<uuid>', () => {
      return myrequest(appAuthorized)
        .get(`/json/search/workflowsByUUID/${uuid}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    test('GET /search/apaByRecordDetails', () => {
      return myrequest(appAuthorized)
        .get('/search/apaByRecordDetails')
        .expect(200);
    });

    test('GET /json/search/apaByRecordDetails/<criteria>', () => {
      return myrequest(appAuthorized)
        .get(`/json/search/apaByRecordDetails/${'daresbury'}/${'top'}/${'1'}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    test('GET /search/nonConformanceByComponentTypeOrUUID', () => {
      return myrequest(appAuthorized)
        .get('/search/nonConformanceByComponentTypeOrUUID')
        .expect(200);
    });

    test('GET /json/search/nonConformanceByComponentType?<criteria>', () => {
      return myrequest(appAuthorized)
        .get(`/json/search/nonConformanceByComponentType?componentType=${'componentType'}&disposition=${'disposition'}&status=${'status'}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    test('GET /json/search/nonConformanceByComponentUUID/<uuid>', () => {
      return myrequest(appAuthorized)
        .get(`/json/search/nonConformanceByComponentUUID/${uuid}`)
        .expect('Content-Type', /json/)
        .expect(200);
    });
  });

  // Autocomplete routes
  describe('Autocomplete routes', () => {
    test('GET /autocomplete/<uuid>', () => {
      return myrequest(appAuthorized)
        .get(`/autocomplete/uuid?q=${uuid.substr(0, 5)}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body.length).toBeGreaterThan(0);
        });
    });

    test('GET /autocomplete/<actionId>', () => {
      return myrequest(appAuthorized)
        .get(`/autocomplete/actionId?q=${actionId.substr(0, 5)}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body.length).toBeGreaterThan(0);
        });
    });

    test('GET /autocomplete/<workflowId>', () => {
      return myrequest(appAuthorized)
        .get(`/autocomplete/workflowId?q=${workflowId.substr(0, 5)}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(response => {
          expect(response.body.length).toBeGreaterThan(0);
        });
    });
  });

  // User routes
  describe('User routes', () => {
    test('GET /user', () => {
      return myrequest(appAuthorized)
        .get('/user')
        .expect(200);
    });

    test('GET /users/list', () => {
      return myrequest(appAuthorized)
        .get('/users/list')
        .expect(200);
    });

    test('GET /json/users/list', () => {
      return myrequest(appAuthorized)
        .get('/json/users/list')
        .expect('Content-Type', /json/)
        .expect(200);
    });
  });
});
