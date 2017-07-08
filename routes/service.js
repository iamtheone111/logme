const express = require('express');
const moment = require('moment');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const router = express.Router();

const api = require('../helpers/api');
const functions = require('../helpers/functions');

const Account = require('../models/Account');
const Log = require('../models/Log');

router.get('/', function(req, res, next) {
  res.send('Logme!');
});

router.post('/receive', function(req, res, next) {
  const sms = req.body;

  const twiml = new MessagingResponse();

  Account.findOne({ phone: sms.From }).exec()
    .catch(err => {
      res.writeHead(200, {'Content-Type': 'text/xml'});
      res.end(twiml.toString());
    })
    .then(account => {
      const action = functions.getCommand(sms.Body).toLowerCase();

      if (! account && action != 'start') {
        console.log('Unregistered request from ' + sms.From);
        res.message('You are not registered for the service. To register, please sms `start` to this number.');
        res.writeHead(200, {'Content-Type': 'text/xml'});
        res.end(twiml.toString());
      }

      // if sleeping, wake up
      if (account.wake_time) {
        account.wake_time = null;

        account.save();
      }

      let log_data, log;

      switch (action) {
        case 'start':
          // start scheduler - if a new phone number, register

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: 'start',
          };

          if (account && account.is_active) {
            // account is already active

            console.log('Start request on an active account from ' + sms.From);

            twiml.message('The service is already running for your number.');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          } else {
            let result_message;

            if (account) {
              // account registered but not active

              account.is_active = true;
              result_message = 'Re-started. I’ll message you every 30 minutes.';
            } else {
              // new account

              const account_data = {
                phone: sms.From,
                city: sms.FromCity,
                state: sms.FromState,
                country: sms.FromCountry,
                zip: sms.FromZip,

                prompt: 'What are you doing?',
              };

              account = new Account(account_data);
              result_message = 'Thanks for signing up! I’ll text you every 30 minutes to ask what you’re doing. You can message me anytime and I’ll record your message in the log. Send ‘stop’ to stop receiving reminders.';
            }

            account.save()
              .catch(err => {
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
              })
              .then(saved_account => {
                log_data.account = saved_account._id;

                log = new Log(log_data);
                log.save()
                  .catch(err => {
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                  })
                  .then(saved_log => {

                    twiml.message(result_message);
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                  })
                ;
              })
            ;
          }
          break;

        case 'stop':
          // stop scheduler

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: 'stop',
          };

          if (! account.is_active) {
            // account is already inactive

            twiml.message('The service is already paused for your number.');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          } else {
            account.is_active = false;

            account.save()
              .catch(err => {
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
              })
              .then(saved_account => {
                log_data.account = saved_account._id;

                log = new Log(log_data);
                log.save()
                  .catch(err => {
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                  })
                  .then(saved_log => {
                    twiml.message('Ok, I won’t message you again until you text me ‘start’.');
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                  })
                ;
              })
            ;
          }
          break;

        case 'log':
          // return logs

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: 'log',
          };

          log = new Log(log_data);
          log.save()
            .catch(err => {
              res.writeHead(200, {'Content-Type': 'text/xml'});
              res.end(twiml.toString());
            })
            .then(saved_log => {
              var today = moment().startOf('day');
              var tomorrow = moment(today).add(1, 'days');

              Log.find({ account: account._id, is_command: false, createdAt: { $gte: today.toDate(), $lt: tomorrow.toDate() } }).exec()
                .catch(err => {
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
                .then(logs => {
                  let logs_message = moment().format('M/D/YYYY dddd') + "\n";

                  logs.forEach((log) => {
                    logs_message += moment(log.createdAt).format('hh:mm A') + ' ' + log.message + "\n";
                  });

                  console.log(logs_message);

                  twiml.message(logs_message);
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
              ;
            })
          ;
          break;

        case 'sleep':
          // sleep for set hours

          const sleep_hours = functions.getParameters(sms.Body);

          if (! /^\+?\d+$/.test(sleep_hours)) {
            twiml.message('Invalid syntax. An example valid command: `sleep 6`');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          }

          var wake_time = moment().add(parseInt(sleep_hours, 10), 'hour');

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: 'sleep',
          };

          account.wake_time = wake_time.toDate();

          account.save()
            .catch(err => {
              res.writeHead(200, {'Content-Type': 'text/xml'});
              res.end(twiml.toString());
            })
            .then(saved_account => {
              log_data.account = saved_account._id;

              log = new Log(log_data);
              log.save()
                .catch(err => {
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
                .then(saved_log => {
                  twiml.message('Good night. I won\'t message you until ' + wake_time.calendar() + '.');
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
              ;
            })
          ;
          break;

        default:
          log_data = {
            sid: sms.MessageSid,

           account: account._id,
            message: sms.Body,
          };

          log = new Log(log_data);
          log.save()
            .catch(err => {
              res.writeHead(200, {'Content-Type': 'text/xml'});
              res.end(twiml.toString());
            })
            .then(saved_log => {
              twiml.message('Got it.');
              res.writeHead(200, {'Content-Type': 'text/xml'});
              res.end(twiml.toString());
            })
          ;
          break;
      }
    })
  ;
});

module.exports = router;
