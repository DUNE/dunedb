
const { EMAIL } = require('./constants');
const logger = require('./logger');
const moment = require('moment');
const nodemailer = require('nodemailer');

let transport = nodemailer.createTransport(EMAIL.CONFIGURATION);

module.exports = async function(arg)
{
  var data = {from   : EMAIL.FROM,
              subject: "DUNE APA DB Message " + moment().toISOString(),
              to     : EMAIL.ADMIN_RECIPIENTS,
              ...arg};
  
  return await transport.sendMail(data);
}

