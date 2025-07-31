const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  studentId: {
    type: String,
    required: [true, 'Please provide your student ID'],
    unique: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please provide your phone number'],
    validate: {
      validator: function(v) {
        return /^\d{3}-\d{4}$/.test(v) || /^\d{10}$/.test(v.replace(/\D/g, ''));
      },
      message: 'Please provide a valid phone number'
    }
  },
  profileImage: {
    type: String,
    default: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0DyhgcJTXENF9zTVde1Bo1RO4eRuICR_EhQQjF4Hb0GsXUSxQtJBSDvpacMWNe0ecQhqD3cahs0BP-j4MZTQp9ab52P-U1ZWhGYFzUq_FjMNIUwE4GI5_7rerz2-IKvNYJV1her_B4Y74X9GokZFeUunzlVq3XuFA1iCFbV_PbVGOQ07vjaE6WY29P4POm4pNOBV_52RDA84iMQOMh0AHRf9-p3tdcWYYOQ8Nl4R0KBpj7SwP80OX6cYL-PRyfNzZse_XZZdJM4g'
  },
  department: {
    type: String,
    required: [true, 'Please provide your department'],
    trim: true
  },
  year: {
    type: String,
    required: [true, 'Please provide your academic year'],
    enum: ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  itemsReported: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  }],
  itemsClaimed: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  }]
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ studentId: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Hide sensitive information when converting to JSON
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);