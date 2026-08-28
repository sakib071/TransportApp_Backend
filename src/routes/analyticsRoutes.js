const router = require('express').Router();
const ctrl = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('staff'));
router.get('/dashboard', ctrl.dashboard);
router.get('/trend', ctrl.trend);
router.get('/categories', ctrl.categoryBreakdown);
router.get('/hotspots', ctrl.hotspots);
router.get('/severity', ctrl.severityMix);

module.exports = router;
