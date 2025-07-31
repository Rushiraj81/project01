const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item reference is required']
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reporter information is required']
  },
  type: {
    type: String,
    required: [true, 'Please specify report type'],
    enum: ['claim', 'match', 'spam', 'inappropriate', 'duplicate', 'resolved', 'inquiry']
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'reviewed', 'approved', 'rejected', 'resolved']
  },
  message: {
    type: String,
    required: [true, 'Please provide a message'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  attachments: [{
    url: String,
    type: {
      type: String,
      enum: ['image', 'document']
    },
    publicId: String
  }],
  contactInfo: {
    email: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please provide a valid email'
      }
    },
    phone: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\d{3}-\d{4}$/.test(v) || /^\d{10}$/.test(v.replace(/\D/g, ''));
        },
        message: 'Please provide a valid phone number'
      }
    }
  },
  priority: {
    type: String,
    default: 'normal',
    enum: ['low', 'normal', 'high', 'urgent']
  },
  adminNotes: {
    type: String,
    trim: true
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [500, 'Feedback cannot exceed 500 characters']
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
reportSchema.index({ item: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ type: 1, status: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ priority: 1 });

// Virtual for response time
reportSchema.virtual('responseTime').get(function() {
  if (!this.resolvedAt) return null;
  
  const diffTime = this.resolvedAt - this.createdAt;
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 24) {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  } else {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  }
});

// Static method to get report statistics
reportSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        resolved: {
          $sum: {
            $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
          }
        },
        avgResponseTime: {
          $avg: {
            $cond: [
              { $and: [{ $ne: ['$resolvedAt', null] }, { $ne: ['$createdAt', null] }] },
              { $subtract: ['$resolvedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    }
  ]);

  const totalReports = await this.countDocuments();
  const pendingReports = await this.countDocuments({ status: 'pending' });
  
  return {
    total: totalReports,
    pending: pendingReports,
    byType: stats,
    avgRating: await this.aggregate([
      { $match: { 'rating.score': { $exists: true } } },
      { $group: { _id: null, avgRating: { $avg: '$rating.score' } } }
    ])
  };
};

// Instance method to mark as resolved
reportSchema.methods.markResolved = function(resolvedBy) {
  this.status = 'resolved';
  this.resolvedBy = resolvedBy;
  this.resolvedAt = new Date();
  return this.save();
};

// Pre-save middleware to auto-set priority based on type
reportSchema.pre('save', function(next) {
  if (this.isNew) {
    switch (this.type) {
      case 'spam':
      case 'inappropriate':
        this.priority = 'high';
        break;
      case 'claim':
        this.priority = 'normal';
        break;
      case 'inquiry':
        this.priority = 'low';
        break;
      default:
        this.priority = 'normal';
    }
  }
  next();
});

module.exports = mongoose.model('Report', reportSchema);