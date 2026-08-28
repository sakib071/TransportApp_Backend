const Line = require('../models/Line');
const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');

exports.list = catchAsync(async (req, res) => {
  const lines = await Line.find().sort('name');
  res.json({ lines });
});

exports.create = catchAsync(async (req, res) => {
  const { name, type } = req.body;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ message: 'Enter a line or route name.' });
  }
  const existing = await Line.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
  if (existing) return res.status(409).json({ message: 'That line already exists.' });
  const line = await Line.create({ name: name.trim(), type: type === 'rail' ? 'rail' : 'bus' });
  await AuditLog.create({
    action: 'route_added',
    detail: `Line added: ${name}`,
    actor: req.user._id,
    actorName: req.user.name
  });
  res.status(201).json({ line });
});

exports.remove = catchAsync(async (req, res) => {
  const line = await Line.findById(req.params.id);
  if (!line) return res.status(404).json({ message: 'Line not found.' });
  await line.deleteOne();
  await AuditLog.create({
    action: 'route_removed',
    detail: `Line removed: ${line.name}`,
    actor: req.user._id,
    actorName: req.user.name
  });
  res.json({ success: true });
});
