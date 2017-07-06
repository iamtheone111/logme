var express = require('express');
var router = express.Router();

var config = require('../config');

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/send', function(req, res, next) {
  console.log('Outgoing SMS');
  console.log(req.body);
});

module.exports = router;
