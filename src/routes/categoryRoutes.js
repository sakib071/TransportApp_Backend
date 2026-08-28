const router = require('express').Router();
const ctrl = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', ctrl.list);
router.post('/', protect, restrictTo('staff'), ctrl.create);
router.delete('/:key', protect, restrictTo('staff'), ctrl.remove);

module.exports = router;
