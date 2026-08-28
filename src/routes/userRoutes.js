const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('staff'));
router.get('/', ctrl.list);
router.patch('/:id/flag', ctrl.setFlag);

module.exports = router;
