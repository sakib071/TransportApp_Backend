const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const catchAsync = require('../utils/catchAsync');

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}
function sanitize(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

exports.register = catchAsync(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: role === 'staff' ? 'staff' : 'rider'
  });
  await AuditLog.create({
    action: 'account_created',
    detail: `${user.name} joined as ${user.role}`,
    actor: user._id,
    actorName: user.name
  });
  const token = signToken(user);
  res.status(201).json({ token, user: sanitize(user) });
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }
  if (user.flagged) {
    return res.status(403).json({ message: 'This account has been flagged by staff.' });
  }
  const token = signToken(user);
  res.json({ token, user: sanitize(user) });
});

exports.me = catchAsync(async (req, res) => {
  res.json({ user: sanitize(req.user) });
});
