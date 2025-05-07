const express = require('express');
const {
  createEventRequest,
  getEventRequests,
  getEventRequest,
  updateEventRequestStatus,
  getMyEventRequests
} = require('../controllers/eventRequest.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Organizer routes
router.post('/', protect, authorize('organizer'), createEventRequest);
router.get('/my-requests', protect, authorize('organizer'), getMyEventRequests);

// Admin routes
router.get('/', protect, authorize('admin'), getEventRequests);
router.put('/:id', protect, authorize('admin'), updateEventRequestStatus);

// Admin or Owner routes
router.get('/:id', protect, getEventRequest); // Access control in the controller

module.exports = router;