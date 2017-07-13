const mongoose = require('bluebird').promisifyAll(require('mongoose'));

const accountSchema = new mongoose.Schema({
  phone: String,
  city: String,
  state: String,
  country: String,
  zip: String,

  prompt: String,
  first: Number,
  last: Number,
  range: String,
  wake_time: Date,
  frequency: { type: Number, default: 30 },
  is_active: { type: Boolean, default: true},

  last_sent: Date,
}, { timestamps: true });

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
