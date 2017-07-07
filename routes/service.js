const express = require('express');
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

  Account.findOne({ phone: sms.From }).exec()
    .catch(err => {
      return res.json({ status: 'failure', error: err });
    })
    .then(account => {
      const action = functions.getFirstWord(sms.Body).toLowerCase();

      if (! account && action != 'start') {
        console.log('Unregistered request from ' + sms.From);
        return res.json({ status: 'failure', error: 'You are not registered' });
      }

      let log_data, log;

      switch (action) {
        case 'start':
          // start scheduler - if a new phone number, register

          log_data = {
            sid: sms.MessageSid,

            message: sms.Body,
            date: functions.getFormattedDate('date'),
            time: functions.getFormattedDate('time'),

            is_command: true,
            command: 'start',
          };

          if (account && account.is_active) {
            // account is already active

            console.log('Start request on an active account from ' + sms.From);
            api.sendSMS(sms.From, 'The service is already running for your number.', (err, data) => {
              if (err) {
                return res.json({ status: 'failure', error: err });
              }

              return res.json({ status: 'success' });
            });
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
              result_message = 'Thanks for signing up! I’ll text you every 30 minutes to ask what you’re doing.';
            }

            account.save()
              .catch(err => {
                return res.json({ status: 'failure', error: err });
              })
              .then(saved_account => {
                log_data.account = saved_account._id;

                log = new Log(log_data);
                log.save()
                  .catch(err => {
                    return res.json({ status: 'failure', error: err });
                  })
                  .then(saved_log => {
                    api.sendSMS(sms.From, result_message, (err, data) => {
                      if (err) {
                        return res.json({ status: 'failure', error: err });
                      }

                      return res.json({ status: 'success' });
                    });
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
            date: functions.getFormattedDate('date'),
            time: functions.getFormattedDate('time'),

            is_command: true,
            command: 'stop',
          };

          if (! account.is_active) {
            // account is already inactive

            api.sendSMS(sms.From, 'The service is already paused for your number.', (err, data) => {
              if (err) {
                return res.json({ status: 'failure', error: err });
              }

              return res.json({ status: 'success' });
            });
          } else {
            account.is_active = false;

            account.save()
              .catch(err => {
                return res.json({ status: 'failure', error: err });
              })
              .then(saved_account => {
                log_data.account = saved_account._id;

                log = new Log(log_data);
                log.save()
                  .catch(err => {
                    return res.json({ status: 'failure', error: err });
                  })
                  .then(saved_log => {
                    api.sendSMS(sms.From, 'Ok, I won’t message you again until you text me ‘start’.', (err, data) => {
                      if (err) {
                        return res.json({ status: 'failure', error: err });
                      }

                      return res.json({ status: 'success' });
                    });
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
            date: functions.getFormattedDate('date'),
            time: functions.getFormattedDate('time'),

            is_command: true,
            command: 'log',
          };

          log = new Log(log_data);
          log.save()
            .catch(err => {
              return res.json({ status: 'failure', error: err });
            })
            .then(saved_log => {
              Log.find({ account: account._id, is_command: false, date: functions.getFormattedDate('date') }).exec()
                .catch(err => {
                  return res.json({ status: 'failure', error: err });
                })
                .then(logs => {
                  let logs_message = functions.getFormattedDate('week_date') + "\n";

                  logs.forEach((log) => {
                    logs_message += log.time + ' ' + log.message + "\n";
                  });

                  console.log(logs_message);

                  api.sendSMS(sms.From, logs_message, (err, data) => {
                    if (err) {
                      return res.json({ status: 'failure', error: err });
                    }

                    return res.json({ status: 'success', message: logs_message });
                  });
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
            date: functions.getFormattedDate('date'),
            time: functions.getFormattedDate('time'),
          };

          log = new Log(log_data);
          log.save()
            .catch(err => {
              return res.json({ status: 'failure', error: err });
            })
            .then(saved_log => {
              api.sendSMS(sms.From, 'Got it.', (err, data) => {
                if (err) {
                  return res.json({ status: 'failure', error: err });
                }

                return res.json({ status: 'success' });
              });
            })
          ;
          break;
      }

      return res.json({ status: 'no_action' });
    })
  ;
});

module.exports = router;