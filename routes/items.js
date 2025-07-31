const express = require('express');
const {
  getItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  claimItem,
  getItemStats,
  getMyItems,
  createItemValidation,
  updateItemValidation
} = require('../controllers/itemController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/stats', getItemStats);
router.get('/', optionalAuth, getItems);
router.get('/:id', optionalAuth, getItem);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.get('/user/my-items', getMyItems);
router.post('/', upload.array('images', 5), createItemValidation, createItem);
router.put('/:id', upload.array('images', 5), updateItemValidation, updateItem);
router.delete('/:id', deleteItem);
router.put('/:id/claim', claimItem);

module.exports = router;