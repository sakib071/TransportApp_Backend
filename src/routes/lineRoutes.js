const router = require('express').Router();
const ctrl = require('../controllers/lineController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', ctrl.list);
router.post('/', protect, restrictTo('staff'), ctrl.create);
router.delete('/:id', protect, restrictTo('staff'), ctrl.remove);

module.exports = router;
