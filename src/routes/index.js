const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/updates', require('./updateRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/categories', require('./categoryRoutes'));
router.use('/lines', require('./lineRoutes'));
router.use('/audit', require('./auditRoutes'));
router.use('/analytics', require('./analyticsRoutes'));
router.use('/ai', require('./aiRoutes'));

module.exports = router;
