global.config = require("./configuration.js");
const request = require('supertest');

const createApp = require("./lib/app.js");
const database = require("./lib/database.js");

var app;
beforeAll(async () => {
  console.log("beforeAll");
  await database.attach_to_database()
  app = await createApp();
  console.log("done initializiong");

  }
);

afterAll( async () => {
  await database.shutdown(true);
  console.log("shutdown");

  // FIXME express-bouncer being run in userRoutes is keeping things alive..!
} );
// inject a custom user authorization here.

  test('route /',function(done) {
    console.log("testing route /");
    request(app)
      .get('/')
      .expect(200,done);
  });


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