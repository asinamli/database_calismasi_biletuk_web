const mongoose = require('mongoose');

const eventRequestSchema = new mongoose.Schema(
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
      default: '', // Kapak fotoğrafı URL'si
    },
    sliderImages: {
      type: [String], // Birden çok slider fotoğrafı URL'si için dizi
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

const EventRequest = mongoose.model('EventRequest', eventRequestSchema);

module.exports = EventRequest;