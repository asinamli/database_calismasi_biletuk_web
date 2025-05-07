const express = require('express');
const {
  createOrganizerRequest,
  getOrganizerRequests,
  getOrganizerRequest,
  updateOrganizerRequestStatus,
  getMyOrganizerRequests
} = require('../controllers/organizerRequest.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// User routes
router.post('/', protect, createOrganizerRequest);
router.get('/my-requests', protect, getMyOrganizerRequests);

// Admin routes
router.get('/', protect, authorize('admin'), getOrganizerRequests);
router.get('/:id', protect, authorize('admin'), getOrganizerRequest);
router.put('/:id', protect, authorize('admin'), updateOrganizerRequestStatus);

module.exports = router;