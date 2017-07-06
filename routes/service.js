var express = require('express');
var router = express.Router();

var config = require('../config');

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/send/:to', function(req, res, next) {
  var client = require('twilio')(config.accountSid, config.authToken);

  const to = req.params.to;
  const message = req.body.message;

  // console.log(client.api.messages.create())
  return client.api.messages
    .create({
      body: message,
      to: to,
      from: config.sendingNumber,
    }).then(function(data) {
      console.log(data);
      return res.json({ status: 'success' });
    }).catch(function(err) {
      return res.json({ status: 'failure', error: err });
    });
});

router.post('/receive', function(req, res, next) {
  console.log(req.body);
});

module.exports = router;
