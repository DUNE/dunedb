const nodemailer = require('nodemailer');
const moment = require('moment');
const { EMAIL } = require('./constants');
const logger = require('./logger');

let transport = nodemailer.createTransport(EMAIL.CONFIGURATION);

// Test code.
// transport.sendMail({
//   to: 'someone@example.com',
//   subject: "Test " + moment().toISOString(),
//   text: "Hi there!"
// })

//
// By default, send emails to admins with standard message, from dunedb.
//
// Override any of these fields in the code
module.exports = async function(arg) {
  var data = {
    from: EMAIL.FROM,
    subject: "Dune DB Message " + moment().toISOString(),
    to: EMAIL.ADMIN_RECIPIENTS,
    ...arg
  };
  logger.info("sending email",data);
  return await transport.sendMail(data);
}
