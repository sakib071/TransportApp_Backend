const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, lowercase: true, trim: true },
  label: { type: String, required: true, trim: true },
  icon: { type: String, default: '🏷️' },
  color: { type: String, default: '#3D5A80' },
  tint: { type: String, default: '#E3E9F0' },
  builtIn: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
