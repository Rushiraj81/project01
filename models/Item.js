const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide item title'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide item description'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Please select item category'],
    enum: [
      'Electronics',
      'Clothing',
      'Books',
      'Accessories',
      'Keys',
      'Bags',
      'Sports Equipment',
      'Documents',
      'Jewelry',
      'Other'
    ]
  },
  type: {
    type: String,
    required: [true, 'Please specify if item is lost or found'],
    enum: ['lost', 'found']
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'claimed', 'expired', 'cancelled']
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter information is required']
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  location: {
    building: {
      type: String,
      required: [true, 'Please specify building'],
      trim: true
    },
    room: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Location description cannot exceed 200 characters']
    }
  },
  dateTime: {
    type: Date,
    required: [true, 'Please provide date and time'],
    validate: {
      validator: function(v) {
        return v <= new Date();
      },
      message: 'Date cannot be in the future'
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    }
  }],
  contactInfo: {
    preferredMethod: {
      type: String,
      enum: ['email', 'phone', 'both'],
      default: 'email'
    },
    isPublic: {
      type: Boolean,
      default: false
    }
  },
  reward: {
    offered: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      min: 0
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Reward description cannot exceed 200 characters']
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  views: {
    type: Number,
    default: 0
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }
  },
  adminNotes: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
itemSchema.index({ type: 1, status: 1 });
itemSchema.index({ category: 1 });
itemSchema.index({ reportedBy: 1 });
itemSchema.index({ 'location.building': 1 });
itemSchema.index({ createdAt: -1 });
itemSchema.index({ expiresAt: 1 });
itemSchema.index({ tags: 1 });

// Text index for search functionality
itemSchema.index({
  title: 'text',
  description: 'text',
  'location.building': 'text',
  'location.description': 'text',
  tags: 'text'
});

// Virtual for time elapsed
itemSchema.virtual('timeElapsed').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
});

// Virtual for days until expiry
itemSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const diffTime = this.expiresAt - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Middleware to automatically expire items
itemSchema.pre(/^find/, function() {
  this.where({ expiresAt: { $gte: new Date() } });
});

// Static method to get statistics
itemSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        claimed: {
          $sum: {
            $cond: [{ $eq: ['$status', 'claimed'] }, 1, 0]
          }
        }
      }
    }
  ]);

  const totalItems = await this.countDocuments();
  const activeItems = await this.countDocuments({ status: 'active' });
  
  return {
    total: totalItems,
    active: activeItems,
    byType: stats,
    successRate: totalItems > 0 ? (stats.reduce((acc, stat) => acc + stat.claimed, 0) / totalItems * 100).toFixed(1) : 0
  };
};

// Instance method to increment views
itemSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('Item', itemSchema);