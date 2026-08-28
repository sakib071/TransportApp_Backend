const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

// NOTE: static paths (/mine, /nearby, /manage, /check-duplicates) must be
// declared before the dynamic /:id route or Express will treat them as ids.
router.get('/', ctrl.getFeed);
router.get('/mine', protect, ctrl.getMine);
router.get('/nearby', ctrl.nearby);
router.get('/manage', protect, restrictTo('staff'), ctrl.manage);
router.post('/check-duplicates', protect, ctrl.checkDuplicates);
router.post('/', protect, upload.single('photo'), ctrl.createReport);

router.get('/:id', optionalAuth, ctrl.getOne);
router.post('/:id/confirm', protect, ctrl.confirm);
router.patch('/:id/status', protect, restrictTo('staff'), ctrl.updateStatus);
router.patch('/:id/moderate', protect, restrictTo('staff'), ctrl.moderate);

module.exports = router;
