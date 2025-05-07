const mongoose = require('mongoose');

const organizerRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Kullanıcı ID zorunludur'],
    },
    title: {
      type: String,
      required: [true, 'Başlık zorunludur'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Açıklama zorunludur'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// Aynı kullanıcı için bekleyen başka bir istek varsa, yeni istek oluşturulmasını engelle
organizerRequestSchema.index(
  { userId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' }
  }
);

const OrganizerRequest = mongoose.model('OrganizerRequest', organizerRequestSchema);

module.exports = OrganizerRequest;