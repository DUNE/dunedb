const nodemailer = require('nodemailer');
const moment = require('moment');


let transport = nodemailer.createTransport( config.mail_config );


// Test code.
// transport.sendMail({
//   to: 'nathaniel.tagg@gmail.com',
//   subject: "Test " + moment().toISOString(),
//   text: "Hi there!"
// })


//
// By default, send emails to admins with standard message, from sietch.
//
// Override any of these fields in the code
module.exports = async function(arg) {
  var data = {
    from: config.email_from,
    subject: "Sietch Message " + moment().toISOString(),
    to: config.admin_email,
    ...arg
  };
  logger.info("sending email",data);
  return await transport.sendMail(data);
}