const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Etkinlik başlığı zorunludur'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Etkinlik açıklaması zorunludur'],
    },
    date: {
      type: Date,
      required: [true, 'Etkinlik tarihi zorunludur'],
    },
    location: {
      type: String,
      required: [true, 'Etkinlik konumu zorunludur'],
    },
    price: {
      type: Number,
      required: [true, 'Etkinlik fiyatı zorunludur'],
      min: [0, 'Fiyat 0\'dan küçük olamaz'],
    },
    availableTickets: {
      type: Number,
      required: [true, 'Mevcut bilet sayısı belirtilmelidir'],
      min: [0, 'Mevcut bilet sayısı negatif olamaz'],
    },
    coverImage: {
      type: String,
      default: '',
    },
    sliderImages: {
      type: [String],
      default: [],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Etkinlik kategorisi zorunludur'],
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizatör ID zorunludur'],
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals: Etkinliğe ait biletler için virtual populate
eventSchema.virtual('tickets', {
  ref: 'Ticket',
  foreignField: 'eventId',
  localField: '_id',
});

// İndex oluştur - performans için
eventSchema.index({ title: 'text', description: 'text' });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;