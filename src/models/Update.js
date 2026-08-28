const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  severity: { type: String, enum: ['info', 'advisory', 'alert'], default: 'advisory' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Update', updateSchema);
