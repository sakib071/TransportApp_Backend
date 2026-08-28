const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/aiController');
const { protect, optionalAuth } = require('../middleware/auth');

// AI calls cost real money on your Anthropic account — keep this modest.
const aiLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 30, message: { message: 'Too many AI requests — slow down a little.' } });

router.post('/suggest-category', protect, aiLimiter, ctrl.suggestCategory);
router.post('/chat', optionalAuth, aiLimiter, ctrl.chat);

module.exports = router;
