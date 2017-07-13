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
      const splitBody = functions.splitString(sms.Body, ' ');
      const action = splitBody[0].toLowerCase();

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

      const parameter = splitBody[1];

      switch (action) {
        case 'commands':
          // return useful commands

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: action,
          };

          log = new Log(log_data);
          log.save()
            .catch(err => {
              res.writeHead(200, {'Content-Type': 'text/xml'});
              res.end(twiml.toString());
            })
            .then(saved_log => {
              twiml.message(functions.getCommandList());
              res.writeHead(200, {'Content-Type': 'text/xml'});
              res.end(twiml.toString());
            })
          ;
          break;

        case 'resume':
          // start scheduler - if a new phone number, register

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: action,
          };

          if (account && account.is_active) {
            // account is already active

            console.log('Start request on an active account from ' + sms.From);

            twiml.message('Ok! I\'ll ping you every ' + account.frequency + ' minutes.');
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
              result_message = functions.getCommandList();
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

        case 'pause':
          // stop scheduler

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: action,
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
            command: action,
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

              Log.find({
                account: account._id,
                is_command: false,
                createdAt: {
                  $gte: today.toDate(),
                  $lt: tomorrow.toDate()
                }
              }).sort({
                createdAt: 1
              }).exec()
                .catch(err => {
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
                .then(logs => {
                  let logs_message = moment().format('M/D/YYYY dddd') + "\n";

                  logs.forEach((log) => {
                    logs_message += moment(log.createdAt).format('HH:mm') + ' ' + log.message + "\n";
                  });

                  logs_message += "\n" + 'To view full log, go to following url :' + "\n";
                  logs_message += process.env.SITE_URL + '/view/' + account._id + "\n";

                  console.log(logs_message);

                  twiml.message(logs_message);
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
              ;
            })
          ;
          break;

        case 'undo':
          // remove last log

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: action,
          };

          log = new Log(log_data);
          log.save()
            .catch(err => {
              res.writeHead(200, {'Content-Type': 'text/xml'});
              res.end(twiml.toString());
            })
            .then(saved_log => {
              Log.findOneAndRemove({ account: account._id, is_command: false }).sort({ createdAt: -1 }).exec()
                .catch(err => {
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
                .then(removed_log => {
                  twiml.message('Removed your last log at ' + moment().format('HH:mm') + ' - ' + removed_log.message);
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
              ;
            })
          ;
          break;

        case 'sleep':
          // sleep for set hours

          if (! /^\+?\d+$/.test(parameter)) {
            twiml.message('Invalid syntax. An example valid command: `sleep 6`');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          }

          var wake_time = moment().add(parseInt(parameter, 10), 'hour');

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: action,
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

        case 'first':
          // set first time - time when notification starts every day

          if (! /^\+?\d+$/.test(parameter)) {
            twiml.message('Invalid syntax. An example valid command: `first 8`');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          } else if (parameter >= 24) {
            twiml.message('When do you really want me to start?');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          } else if (parameter >= account.last) {
            twiml.message('You can\'t set first hour after last hour. Current last hour set is ' + account.last);
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          }

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: action,
          };

          account.first = parseInt(parameter, 10);

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
                  twiml.message('Ok, I\'ll now send notifications from ' + parameter + ' o\'clock every day.');
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
              ;
            })
          ;
          break;

        case 'last':
          // set last time - time when notification ends every day

          if (! /^\+?\d+$/.test(parameter)) {
            twiml.message('Invalid syntax. An example valid command: `first 8`');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          } else if (parameter > 24) {
            twiml.message('When do you really want me to end?');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          } else if (parameter <= account.first) {
            twiml.message('You can\'t set last hour before first hour. Current first hour set is ' + account.first);
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          }

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: action,
          };

          account.last = parseInt(parameter, 10);

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
                  twiml.message('Ok, I\'ll now send notifications until ' + parameter + ' o\'clock every day.');
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
              ;
            })
          ;
          break;

        case 'frequency':
          // set notification frequency

          if (! /^\+?\d+$/.test(parameter)) {
            twiml.message('Invalid syntax. An example valid command: `frequency 30`');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          }

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: action,
          };

          account.frequency = parseInt(parameter, 10);

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
                  twiml.message('Ok, now I\'ll send you notifications every ' + parameter + ' mins.');
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
              ;
            })
          ;
          break;

        case 'prompt':
          // set prompt text

          if (! parameter.trim()) {
            twiml.message('Please enter text to be used as a prompt');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          }

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: action,
          };

          account.prompt = parameter;

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
                  twiml.message('Ok, in the future I’ll use this phrase to prompt you: ' + parameter);
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
              ;
            })
          ;
          break;

        case 'today':
          // combine logs

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: action,
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

              Log.find({
                account: account._id,
                is_command: false,
                createdAt: {
                  $gte: today.toDate(),
                  $lt: tomorrow.toDate()
                }
              }).sort({
                createdAt: 1
              }).exec()
                .catch(err => {
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
                .then(logs => {
                  let logs_message = moment().format('M/D/YYYY dddd') + "\n";
                  let log_time, combined_logs = {};

                  logs.forEach(log => {
                    log_time = parseInt(moment(log.createdAt).format('mm')) < 30 ? moment(log.createdAt).format('HH') + ':00' : moment(log.createdAt).format('HH') + ':30' ;

                    if (! combined_logs[log_time]) combined_logs[log_time] = [];
                    combined_logs[log_time].push(log.message);
                  });

                  for (let log_interval in combined_logs) {
                    if (combined_logs.hasOwnProperty(log_interval)) {
                      logs_message += log_interval + ' ' + combined_logs[log_interval].join() + "\n";
                    }
                  }

                  logs_message += "\n" + 'To view full log, go to following url :' + "\n";
                  logs_message += process.env.SITE_URL + '/view/' + account._id + "\n";

                  console.log(logs_message);

                  twiml.message(logs_message);
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
              ;
            })
          ;
          break;

        case 'week':
          // combine logs for past week

          log_data = {
            sid: sms.MessageSid,
            message: sms.Body,

            is_command: true,
            command: action,
          };

          log = new Log(log_data);
          log.save()
            .catch(err => {
              res.writeHead(200, {'Content-Type': 'text/xml'});
              res.end(twiml.toString());
            })
            .then(saved_log => {
              var today = moment().startOf('day');
              var lastweek = moment(today).add(-6, 'days');
              var tomorrow = moment(today).add(1, 'days');

              Log.find({
                account: account._id,
                is_command: false,
                createdAt: {
                  $gte: lastweek.toDate(),
                  $lt: tomorrow.toDate()
                }
              }).sort({
                createdAt: 1
              }).exec()
                .catch(err => {
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
                .then(logs => {
                  let logs_message = '', combined_logs = {};

                  logs.forEach(log => {
                    let log_day = moment(log.createdAt).format('M/D/YYYY dddd');
                    let log_time = parseInt(moment(log.createdAt).format('mm')) < 30 ? moment(log.createdAt).format('HH') + ':00' : moment(log.createdAt).format('HH') + ':30' ;

                    if (! combined_logs[log_day]) combined_logs[log_day] = {};

                    if (! combined_logs[log_day][log_time]) combined_logs[log_day][log_time] = [];

                    combined_logs[log_day][log_time].push(log.message);
                  });

                  for (let log_day in combined_logs) {
                    if (combined_logs.hasOwnProperty(log_day)) {
                      logs_message += log_day + "\n";

                      for (let log_time in combined_logs[log_day]) {
                        if (combined_logs[log_day].hasOwnProperty(log_time)) {
                          logs_message += log_time + ' ' + combined_logs[log_day][log_time].join() + "\n";
                        }
                      }

                      logs_message += "\n";
                    }
                  }

                  logs_message += 'To view full log, go to following url :' + "\n";
                  logs_message += process.env.SITE_URL + '/view/' + account._id + "\n";

                  console.log(logs_message);

                  twiml.message(logs_message);
                  res.writeHead(200, {'Content-Type': 'text/xml'});
                  res.end(twiml.toString());
                })
              ;
            })
          ;
          break;

        default:
          let is_time = /^([0-1]?[0-9]|2[0-4]):([0-5][0-9])(:[0-5][0-9])?$/.test(action);
          let is_range = /^([0-1]?[0-9]|2[0-4]):([0-5][0-9])(:[0-5][0-9])?-([0-1]?[0-9]|2[0-4]):([0-5][0-9])(:[0-5][0-9])?$/.test(action);

          if (is_time) {
            log_data = {
              sid: sms.MessageSid,
              account: account._id,

              command: 'catchup',

              message: parameter,
              createdAt: moment(action, 'HH:mm').toDate(),
            };
          } else if (is_range) {
            log_data = {
              sid: sms.MessageSid,
              account: account._id,

              command: 'range',
              is_command: true,

              message: sms.Body,
            };
          } else {
            log_data = {
              sid: sms.MessageSid,
              account: account._id,

              message: sms.Body,
            };
          }

          if ((is_time || is_range) && parameter.trim() == '') {
            twiml.message('Sorry, please specify what I have to log during these hours.');
            res.writeHead(200, {'Content-Type': 'text/xml'});
            res.end(twiml.toString());
          }

          log = new Log(log_data);
          log.save()
            .catch(err => {
              res.writeHead(200, {'Content-Type': 'text/xml'});
              res.end(twiml.toString());
            })
            .then(saved_log => {
              if (is_range) {
                // save range in account

                let dashPosition = action.indexOf('-');
                let range_start_time = moment(action.substr(0, dashPosition), 'HH:mm');
                let range_end_time = moment(action.substr(dashPosition + 1), 'HH:mm');

                if (range_end_time.isBefore(range_start_time)) {
                  // end time is tomorrow
                  range_end_time = moment(range_end_time).add(1, 'days');
                }

                account.range = moment(range_start_time).format('YYYY-MM-DD HH:mm') + '~' + moment(range_end_time).format('YYYY-MM-DD HH:mm') + '*:*' + parameter;
                account.save()
                  .catch(err => {
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                  })
                  .then(saved_account => {
                    twiml.message('Ok, I will log `' + parameter + '` during ' + action);
                    res.writeHead(200, {'Content-Type': 'text/xml'});
                    res.end(twiml.toString());
                  })
                ;
              } else {
                twiml.message('Got it.');
                res.writeHead(200, {'Content-Type': 'text/xml'});
                res.end(twiml.toString());
              }
            })
          ;
          break;
      }
    })
  ;
});

module.exports = router;
