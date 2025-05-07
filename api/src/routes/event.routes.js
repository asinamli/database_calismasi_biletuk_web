const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', eventController.getEvents);

router.get('/:id', eventController.getEvent);

// Protected routes
router.use(protect); // Bu noktadan sonraki tüm routelar için auth gerekli

// Organizatör ve admin routeları
router.get('/user/my-events', authorize('organizer', 'admin'), eventController.getMyEvents);
router.put('/:id', authorize('organizer', 'admin'), eventController.updateEvent);
router.delete('/:id', authorize('organizer', 'admin'), eventController.deleteEvent);

module.exports = router;