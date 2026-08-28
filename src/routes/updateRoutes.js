const router = require('express').Router();
const ctrl = require('../controllers/updateController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', ctrl.list);
router.post('/', protect, restrictTo('staff'), ctrl.create);

module.exports = router;
