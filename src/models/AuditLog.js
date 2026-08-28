const mongoose = require('mongoose');

// actorName is a denormalized snapshot of the actor's display name at the time
// of the action, so the log entry still reads sensibly if the account is later removed.
const auditSchema = new mongoose.Schema({
  action: { type: String, required: true },
  detail: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditSchema);
