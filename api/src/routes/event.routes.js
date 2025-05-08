const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', eventController.getEvents);

// Protected routes
router.use(protect); // Bu noktadan sonraki tüm routelar için auth gerekli

// Admin only routes - Özel route'ları dynamic route'lardan önce tanımla
router.get('/all', authorize('admin'), eventController.getAllEvents);
router.put('/:id/status', authorize('admin'), eventController.updateEventStatus);
router.post('/', authorize('admin'), eventController.createEvent); // Yeni eklenen route

// Dynamic routes
router.get('/:id', eventController.getEvent);

// Organizatör ve admin routeları
router.get('/user/my-events', authorize('organizer', 'admin'), eventController.getMyEvents);
router.put('/:id', authorize('organizer', 'admin'), eventController.updateEvent);
router.delete('/:id', authorize('organizer', 'admin'), eventController.deleteEvent);

module.exports = router;