const mongoose = require('mongoose');

const relaySchema = new mongoose.Schema({
  index:  { type: Number, required: true, unique: true }, // 0,1,2,3
  name:   { type: String, required: true },   // "Đèn phòng khách"
  device: { type: String, required: true },   // "💡 Đèn LED"
  state:  { type: Boolean, default: false },  // true = BẬT
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Relay', relaySchema);