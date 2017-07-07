const config = require('../config');

var sendSMS = function(to, message, done) {
  const client = require('twilio')(config.accountSid, config.authToken);

  return client.api.messages
    .create({
      body: message,
      to: to,
      from: config.sendingNumber,
    }).then(function(data) {
      done(null, data);
    }).catch(function(err) {
      done(err);
    });
}

module.exports = {
  sendSMS,
};
