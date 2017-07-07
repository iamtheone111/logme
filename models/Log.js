const mongoose = require('bluebird').promisifyAll(require('mongoose'));

const logSchema = new mongoose.Schema({
  sid: String,

  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  message: String,
  date: String,
  time: String,

  is_command: { type: Boolean, default: false },
  command: { type: String, default: '' },
}, { timestamps: true });

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
