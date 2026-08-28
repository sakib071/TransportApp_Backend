const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

function extractToken(req) {
  const header = req.headers.authorization;
  return header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;
}

// protect: route fails with 401 if there's no valid session.
exports.protect = catchAsync(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated — please log in.' });
  }
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired session — please log in again.' });
  }
  const user = await User.findById(payload.id);
  if (!user) {
    return res.status(401).json({ message: 'Account no longer exists.' });
  }
  if (user.flagged) {
    return res.status(403).json({ message: 'This account has been flagged by staff.' });
  }
  req.user = user;
  next();
});

// optionalAuth: attaches req.user when a valid token is present, but never blocks the request.
exports.optionalAuth = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (user && !user.flagged) req.user = user;
  } catch (e) {
    // invalid/expired token on an optional route — just proceed unauthenticated
  }
  next();
};

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Staff access only.' });
  }
  next();
};
