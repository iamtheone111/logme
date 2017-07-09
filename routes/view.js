var express = require('express');
const moment = require('moment');
var router = express.Router();

const Account = require('../models/Account');
const Log = require('../models/Log');

router.get('/:account', function(req, res, next) {
  const account_id = req.params.account;

  var promises = [];

  promises.push(new Promise(function(resolve, reject) {
    // fetch account info

    Account.findById(account_id).exec()
      .catch(err => {
        return reject(err);
      })
      .then(account => {
        return resolve(account);
      })
    ;

  }));

  promises.push(new Promise(function(resolve, reject) {

    Log.find({ account: account_id, is_command: false }).exec()
      .catch(err => {
        return reject(err);
      })
      .then(logs => {
        return resolve(logs);
      })
    ;

  }));

  Promise.all(promises)
    .then(data => {
      let logs_data = {
        title: 'Full Log',
        account: data[0],
        logs: data[1],
      };

      res.render('full_log', logs_data);
    })
    .catch(err => {
      console.log(err);

      return res.render('sorry', {
        title: 'Sorry',
        message: 'Sorry, an error occurred while fetching full log.'
      });
    })
  ;

});

module.exports = router;
