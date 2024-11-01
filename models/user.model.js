const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  profileImages: [{
    data: {
      type: Buffer, // To store image as binary data (blob)
      required: true
    },
    contentType: {
      type: String, // MIME type, e.g., 'image/jpeg', 'image/png'
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  dpImage: { // Display picture field
    data: {
      type: Buffer, // To store image as binary data (blob)
      required: false // Not required, user may not have a dp image
    },
    contentType: {
      type: String, // MIME type, e.g., 'image/jpeg', 'image/png'
      required: false // Not required
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }
}, 
{
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User;
