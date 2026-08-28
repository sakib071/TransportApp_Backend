const router = require('express').Router();
const ctrl = require('../controllers/auditController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', protect, restrictTo('staff'), ctrl.list);

module.exports = router;
