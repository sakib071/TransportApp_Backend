const Update = require('../models/Update');
const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');

exports.list = catchAsync(async (req, res) => {
  const updates = await Update.find().populate('author', 'name').sort('-createdAt').limit(50);
  res.json({ updates });
});

exports.create = catchAsync(async (req, res) => {
  const { title, message, severity } = req.body;
  if (!title || title.trim().length < 4 || !message || message.trim().length < 6) {
    return res.status(400).json({ message: 'Add a title (4+ chars) and a message (6+ chars).' });
  }
  const update = await Update.create({
    title: title.trim(),
    message: message.trim(),
    severity: severity || 'advisory',
    author: req.user._id
  });
  await AuditLog.create({
    action: 'broadcast',
    detail: `Posted update: ${title}`,
    actor: req.user._id,
    actorName: req.user.name
  });
  res.status(201).json({ update });
});
