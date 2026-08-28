const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');

exports.list = catchAsync(async (req, res) => {
  const logs = await AuditLog.find().sort('-createdAt').limit(300);
  res.json({ logs });
});
