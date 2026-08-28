const Report = require('../models/Report');
const catchAsync = require('../utils/catchAsync');

exports.dashboard = catchAsync(async (req, res) => {
  const openFilter = { status: { $nin: ['resolved', 'closed'] }, moderation: { $nin: ['rejected', 'spam'] } };
  const [openCount, highCount, pendingModCount, resolvedWeek] = await Promise.all([
    Report.countDocuments(openFilter),
    Report.countDocuments({ ...openFilter, severity: 'high' }),
    Report.countDocuments({ moderation: 'pending' }),
    Report.countDocuments({ status: 'resolved', updatedAt: { $gte: new Date(Date.now() - 7 * 86400000) } })
  ]);
  res.json({
    kpis: { open: openCount, highSeverity: highCount, pendingModeration: pendingModCount, resolvedThisWeek: resolvedWeek }
  });
});

exports.trend = catchAsync(async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 7, 60);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const rows = await Report.aggregate([
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));

  const series = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: map[key] || 0 });
  }
  res.json({ series });
});

exports.categoryBreakdown = catchAsync(async (req, res) => {
  const scope = req.query.scope === 'open' ? { status: { $nin: ['resolved', 'closed'] } } : {};
  const rows = await Report.aggregate([
    { $match: scope },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  res.json({ breakdown: rows.map((r) => ({ category: r._id, count: r.count })) });
});

exports.hotspots = catchAsync(async (req, res) => {
  const rows = await Report.aggregate([
    { $match: { 'location.label': { $nin: [null, ''] } } },
    { $group: { _id: '$location.label', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 }
  ]);
  res.json({ hotspots: rows.map((r) => ({ label: r._id, count: r.count })) });
});

exports.severityMix = catchAsync(async (req, res) => {
  const rows = await Report.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  res.json({ severity: { low: map.low || 0, medium: map.medium || 0, high: map.high || 0 } });
});
