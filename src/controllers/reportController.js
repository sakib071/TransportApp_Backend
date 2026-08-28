const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');
const { findDuplicates } = require('../services/duplicateDetection');
const { textSimilarity } = require('../utils/similarity');

const STATUS_FLOW = ['reported', 'under_review', 'in_progress', 'resolved', 'closed'];

function buildLocation(location) {
  const loc = { label: (location && location.label) || '' };
  if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
    loc.type = 'Point';
    loc.coordinates = location.coordinates; // [lng, lat]
  }
  return loc;
}

exports.checkDuplicates = catchAsync(async (req, res) => {
  const { category, description, location } = req.body;
  if (!category || !description) {
    return res.status(400).json({ message: 'Category and description are required.' });
  }
  const candidates = await findDuplicates({ category, description, location });
  res.json({
    candidates: candidates.map((r) => ({
      id: r._id,
      description: r.description,
      category: r.category,
      location: r.location,
      createdAt: r.createdAt,
      similarity: Math.round(textSimilarity(description, r.description) * 100)
    }))
  });
});

exports.createReport = catchAsync(async (req, res) => {
  const { category, description, severity, line } = req.body;
  // location and aiSuggested may arrive as JSON strings when the request is multipart/form-data (photo upload)
  const location = typeof req.body.location === 'string' ? JSON.parse(req.body.location || '{}') : req.body.location;
  const aiSuggested = typeof req.body.aiSuggested === 'string' ? JSON.parse(req.body.aiSuggested) : req.body.aiSuggested;

  if (!category || !description || description.trim().length < 8) {
    return res.status(400).json({ message: 'Category and a description of at least 8 characters are required.' });
  }

  const report = await Report.create({
    category,
    description: description.trim(),
    severity: severity || 'medium',
    line: line || '',
    location: buildLocation(location),
    photo: req.file ? `/uploads/${req.file.filename}` : null,
    reportedBy: req.user._id,
    aiSuggested: aiSuggested || undefined,
    history: [{ status: 'reported', note: 'Report submitted' }]
  });

  await AuditLog.create({
    action: 'report_submitted',
    detail: `${report._id} submitted (${category})`,
    actor: req.user._id,
    actorName: req.user.name
  });

  res.status(201).json({ report });
});

exports.getFeed = catchAsync(async (req, res) => {
  const filter = { moderation: 'approved' };
  if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
  const reports = await Report.find(filter).sort('-createdAt').limit(200);
  res.json({ reports });
});

exports.getMine = catchAsync(async (req, res) => {
  const filter = { reportedBy: req.user._id };
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  const reports = await Report.find(filter).sort('-createdAt');
  res.json({ reports });
});

exports.getOne = catchAsync(async (req, res) => {
  const report = await Report.findById(req.params.id).populate('reportedBy', 'name role');
  if (!report) return res.status(404).json({ message: 'Report not found.' });

  const isStaff = req.user && req.user.role === 'staff';
  const isOwner = req.user && report.reportedBy && String(report.reportedBy._id) === String(req.user._id);
  const out = report.toObject();
  if (!isStaff && !isOwner) out.reportedBy = undefined; // hide identity from other riders
  res.json({ report: out });
});

exports.confirm = catchAsync(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found.' });
  if (report.moderation !== 'approved') {
    return res.status(400).json({ message: 'Only approved reports can be confirmed.' });
  }
  if (report.confirmedBy.some((id) => String(id) === String(req.user._id))) {
    return res.status(400).json({ message: "You've already confirmed this report." });
  }
  report.confirmedBy.push(req.user._id);
  await report.save();
  res.json({ report });
});

exports.updateStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  if (!STATUS_FLOW.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found.' });
  report.status = status;
  report.history.push({ status, note: 'Status updated by staff' });
  await report.save();
  await AuditLog.create({
    action: 'status_change',
    detail: `${report._id} marked ${status}`,
    actor: req.user._id,
    actorName: req.user.name
  });
  res.json({ report });
});

exports.moderate = catchAsync(async (req, res) => {
  const { decision } = req.body;
  if (!['approved', 'rejected', 'spam'].includes(decision)) {
    return res.status(400).json({ message: 'Invalid moderation decision.' });
  }
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found.' });
  report.moderation = decision;
  if (decision === 'rejected' || decision === 'spam') report.status = 'closed';
  report.history.push({ status: report.status, note: `Moderation: ${decision}` });
  await report.save();
  await AuditLog.create({
    action: 'moderation',
    detail: `${report._id} ${decision}`,
    actor: req.user._id,
    actorName: req.user.name
  });
  res.json({ report });
});

exports.manage = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
  if (req.query.moderation && req.query.moderation !== 'all') filter.moderation = req.query.moderation;
  if (req.query.q) {
    const rx = new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ description: rx }, { 'location.label': rx }];
  }
  let reports = await Report.find(filter).populate('reportedBy', 'name').sort('-createdAt').limit(500);
  // stable secondary sort: pending-moderation items surface first
  reports = [...reports].sort((a, b) => (a.moderation === 'pending' ? 0 : 1) - (b.moderation === 'pending' ? 0 : 1));
  res.json({ reports });
});

// Geospatial lookup — used by the frontend map to fetch reports near the
// user's current position, or near a point they've clicked/dragged to.
exports.nearby = catchAsync(async (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng) return res.status(400).json({ message: 'lat and lng query params are required.' });
  const reports = await Report.find({
    moderation: 'approved',
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: parseFloat(radius) || 2000
      }
    }
  }).limit(100);
  res.json({ reports });
});
