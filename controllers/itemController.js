const { body, validationResult } = require('express-validator');
const Item = require('../models/Item');
const User = require('../models/User');

// @desc    Get all items with filtering, sorting, and pagination
// @route   GET /api/items
// @access  Public
const getItems = async (req, res) => {
  try {
    // Build query object
    let query = Item.find();

    // Filter by type (lost/found)
    if (req.query.type) {
      query = query.where('type').equals(req.query.type);
    }

    // Filter by category
    if (req.query.category) {
      query = query.where('category').equals(req.query.category);
    }

    // Filter by status
    if (req.query.status) {
      query = query.where('status').equals(req.query.status);
    } else {
      // Default to active items only
      query = query.where('status').equals('active');
    }

    // Filter by location building
    if (req.query.building) {
      query = query.where('location.building').regex(new RegExp(req.query.building, 'i'));
    }

    // Filter by urgent items
    if (req.query.urgent === 'true') {
      query = query.where('isUrgent').equals(true);
    }

    // Text search
    if (req.query.search) {
      query = query.find({
        $text: { $search: req.query.search }
      });
    }

    // Date range filter
    if (req.query.dateFrom) {
      query = query.where('dateTime').gte(new Date(req.query.dateFrom));
    }
    if (req.query.dateTo) {
      query = query.where('dateTime').lte(new Date(req.query.dateTo));
    }

    // Clone query for counting
    const countQuery = query.clone();

    // Sorting
    let sortBy = '-createdAt'; // Default sort by newest first
    if (req.query.sortBy) {
      switch (req.query.sortBy) {
        case 'newest':
          sortBy = '-createdAt';
          break;
        case 'oldest':
          sortBy = 'createdAt';
          break;
        case 'date-newest':
          sortBy = '-dateTime';
          break;
        case 'date-oldest':
          sortBy = 'dateTime';
          break;
        case 'views':
          sortBy = '-views';
          break;
        case 'urgent':
          sortBy = '-isUrgent -createdAt';
          break;
        default:
          sortBy = '-createdAt';
      }
    }

    query = query.sort(sortBy);

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    query = query.skip(startIndex).limit(limit);

    // Populate reportedBy with selected fields
    query = query.populate({
      path: 'reportedBy',
      select: 'name studentId profileImage department year'
    });

    // Execute query
    const items = await query;
    const total = await countQuery.countDocuments();

    // Pagination info
    const pagination = {
      current: page,
      total: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      pagination,
      data: items
    });

  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Public
const getItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate({
        path: 'reportedBy',
        select: 'name studentId profileImage department year phoneNumber email',
        transform: (doc) => {
          // Only return contact info if it's public or user is authenticated
          if (!doc) return doc;
          
          if (!req.user || (!doc.contactInfo?.isPublic && doc._id.toString() !== req.user._id.toString())) {
            const { phoneNumber, email, ...publicInfo } = doc.toObject();
            return publicInfo;
          }
          return doc;
        }
      })
      .populate({
        path: 'claimedBy',
        select: 'name studentId profileImage'
      });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Increment view count (async, don't wait)
    item.incrementViews();

    res.status(200).json({
      success: true,
      data: item
    });

  } catch (error) {
    console.error('Get item error:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new item
// @route   POST /api/items
// @access  Private
const createItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Add user to req.body
    req.body.reportedBy = req.user._id;

    // Handle images from file upload
    if (req.files && req.files.length > 0) {
      req.body.images = req.files.map(file => ({
        url: file.path, // Cloudinary URL
        publicId: file.filename // Cloudinary public ID
      }));
    }

    const item = await Item.create(req.body);

    // Add item to user's reported items
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { itemsReported: item._id } },
      { new: true }
    );

    // Populate the created item
    await item.populate({
      path: 'reportedBy',
      select: 'name studentId profileImage department year'
    });

    res.status(201).json({
      success: true,
      message: 'Item reported successfully',
      data: item
    });

  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during item creation'
    });
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private (Owner only)
const updateItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check ownership
    if (item.reportedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own items.'
      });
    }

    // Don't allow updating if item is claimed
    if (item.status === 'claimed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update claimed items'
      });
    }

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => ({
        url: file.path,
        publicId: file.filename
      }));
      
      // Append to existing images or replace
      if (req.body.replaceImages === 'true') {
        req.body.images = newImages;
      } else {
        req.body.images = [...(item.images || []), ...newImages];
      }
    }

    item = await Item.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate({
      path: 'reportedBy',
      select: 'name studentId profileImage department year'
    });

    res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: item
    });

  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during item update'
    });
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private (Owner only)
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check ownership
    if (item.reportedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own items.'
      });
    }

    // Don't allow deleting if item is claimed
    if (item.status === 'claimed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete claimed items'
      });
    }

    await Item.findByIdAndDelete(req.params.id);

    // Remove from user's reported items
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { itemsReported: req.params.id } }
    );

    res.status(200).json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during item deletion'
    });
  }
};

// @desc    Claim item
// @route   PUT /api/items/:id/claim
// @access  Private
const claimItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    if (item.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Item is not available for claiming'
      });
    }

    // Users cannot claim their own items
    if (item.reportedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot claim your own reported item'
      });
    }

    // Update item status
    item.status = 'claimed';
    item.claimedBy = req.user._id;
    await item.save();

    // Add to user's claimed items
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { itemsClaimed: item._id } }
    );

    // Populate the updated item
    await item.populate([
      {
        path: 'reportedBy',
        select: 'name studentId profileImage department year'
      },
      {
        path: 'claimedBy',
        select: 'name studentId profileImage'
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Item claimed successfully',
      data: item
    });

  } catch (error) {
    console.error('Claim item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during item claiming'
    });
  }
};

// @desc    Get items statistics
// @route   GET /api/items/stats
// @access  Public
const getItemStats = async (req, res) => {
  try {
    const stats = await Item.getStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get item stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user's items
// @route   GET /api/items/my-items
// @access  Private
const getMyItems = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    let query = { reportedBy: req.user._id };

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    const items = await Item.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'claimedBy',
        select: 'name studentId profileImage'
      });

    const total = await Item.countDocuments(query);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      data: items
    });

  } catch (error) {
    console.error('Get my items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Validation middlewares
const createItemValidation = [
  body('title')
    .trim()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Title is required and must be less than 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .isLength({ max: 500 })
    .withMessage('Description is required and must be less than 500 characters'),
  body('category')
    .isIn(['Electronics', 'Clothing', 'Books', 'Accessories', 'Keys', 'Bags', 'Sports Equipment', 'Documents', 'Jewelry', 'Other'])
    .withMessage('Please select a valid category'),
  body('type')
    .isIn(['lost', 'found'])
    .withMessage('Type must be either lost or found'),
  body('location.building')
    .trim()
    .notEmpty()
    .withMessage('Building location is required'),
  body('dateTime')
    .isISO8601()
    .withMessage('Please provide a valid date and time')
];

const updateItemValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must be less than 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('category')
    .optional()
    .isIn(['Electronics', 'Clothing', 'Books', 'Accessories', 'Keys', 'Bags', 'Sports Equipment', 'Documents', 'Jewelry', 'Other'])
    .withMessage('Please select a valid category'),
  body('location.building')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Building location cannot be empty'),
  body('dateTime')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date and time')
];

module.exports = {
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
};