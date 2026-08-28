const User = require('../models/User');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');

exports.list = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.role && ['rider', 'staff'].includes(req.query.role)) filter.role = req.query.role;
  if (req.query.flagged === 'true') filter.flagged = true;
  const users = await User.find(filter).sort('-createdAt');

  const withCounts = await Promise.all(
    users.map(async (u) => {
      const reportsCount = await Report.countDocuments({ reportedBy: u._id });
      const confirmAgg = await Report.aggregate([
        { $match: { reportedBy: u._id } },
        { $project: { confirmCount: { $size: '$confirmedBy' } } },
        { $group: { _id: null, total: { $sum: '$confirmCount' } } }
      ]);
      return {
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        flagged: u.flagged,
        joinedAt: u.createdAt,
        reportsCount,
        confirmationsReceived: confirmAgg[0] ? confirmAgg[0].total : 0
      };
    })
  );
  res.json({ users: withCounts });
});

exports.setFlag = catchAsync(async (req, res) => {
  const { flagged } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  user.flagged = !!flagged;
  await user.save();
  await AuditLog.create({
    action: 'user_flag',
    detail: `${user.name} ${flagged ? 'flagged' : 'unflagged'}`,
    actor: req.user._id,
    actorName: req.user.name
  });
  res.json({ user: { id: user._id, name: user.name, flagged: user.flagged } });
});
