const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  type: { type: String, enum: ['rail', 'bus'], default: 'bus' },
  stations: { type: [String], default: [] },
  color: { type: String, default: '#1D3557' }
}, { timestamps: true });

module.exports = mongoose.model('Line', lineSchema);
