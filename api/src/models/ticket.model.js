const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Bilet sahibi kullanıcı ID zorunludur'],
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Etkinlik ID zorunludur'],
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  price: {
    type: Number,
    required: [true, 'Bilet fiyatı zorunludur'],
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  qrCode: {
    type: String,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending',
  }
});

// Unique index kısıtlamasını kaldırıyoruz
// Bir kullanıcı artık aynı etkinlik için birden fazla bilet alabilecek
// ticketSchema.index({ userId: 1, eventId: 1 }, { unique: true });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;