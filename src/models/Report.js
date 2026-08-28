const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  status: String,
  note: String,
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

// location.coordinates follows GeoJSON order: [lng, lat] — NOT [lat, lng].
// type/coordinates are left undefined when only a text label was given (no GPS),
// so the 2dsphere index simply skips those documents for $near queries.
const locationSchema = new mongoose.Schema({
  label: { type: String, default: '' },
  type: { type: String, enum: ['Point'] }
}, { _id: false });

const reportSchema = new mongoose.Schema({
  category: { type: String, required: true },
  description: { type: String, required: true, minlength: 8 },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  line: { type: String, default: '' },
  location: { type: locationSchema, default: () => ({}) },
  photo: { type: String, default: null },
  status: { type: String, enum: ['reported', 'under_review', 'in_progress', 'resolved', 'closed'], default: 'reported' },
  moderation: { type: String, enum: ['pending', 'approved', 'rejected', 'spam'], default: 'pending' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  confirmedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  aiSuggested: {
    category: String,
    confidence: Number
  },
  history: [historySchema]
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Index the coordinates path specifically (not the whole location object),
// and mark it sparse so label-only reports (no GPS/coordinates) are skipped
// by the index instead of throwing "can't extract geo keys".
// reportSchema.index({ 'location.coordinates': '2dsphere' }, { sparse: true });
reportSchema.index({ category: 1, status: 1, createdAt: -1 });

reportSchema.virtual('confirmations').get(function () {
  return this.confirmedBy ? this.confirmedBy.length : 0;
});

module.exports = mongoose.model('Report', reportSchema);