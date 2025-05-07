const Ticket = require('../models/ticket.model');
const Event = require('../models/event.model');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

// @desc    Bilet satın al / sepete ekle
// @route   POST /api/tickets
// @access  Private
exports.createTicket = async (req, res) => {
  try {
    const { eventId } = req.body;

    // Etkinliği kontrol et
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Etkinlik bulunamadı',
      });
    }

    // Etkinlik onaylı mı kontrol et
    if (!event.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Bu etkinlik için henüz bilet satışı başlamadı',
      });
    }

    // Yeterli bilet var mı kontrol et
    if (event.availableTickets <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu etkinlik için bilet kalmadı',
      });
    }

    // Kullanıcı zaten bu etkinlik için bilet almış mı kontrol et
    const existingTicket = await Ticket.findOne({
      userId: req.user._id,
      eventId: eventId,
    });

    if (existingTicket) {
      return res.status(400).json({
        success: false,
        message: 'Bu etkinlik için zaten bir bilet almışsınız',
      });
    }

    // Bilet oluştur (ödeme henüz tamamlanmadı - sepete eklenmiş durumda)
    const ticket = await Ticket.create({
      userId: req.user._id,
      eventId,
      price: event.price,
      status: 'pending',
      isPaid: false,
    });

    res.status(201).json({
      success: true,
      data: ticket,
      message: 'Bilet sepete eklendi',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bilet oluşturulamadı',
      error: error.message,
    });
  }
};

// @desc    Sepetteki biletleri getir
// @route   GET /api/tickets/cart
// @access  Private
exports.getCartTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({
      userId: req.user._id,
      status: 'pending',
      isPaid: false,
    }).populate({
      path: 'eventId',
      select: 'title date location price image',
      populate: {
        path: 'category',
        select: 'name',
      },
    });

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Sepet biletleri getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Sepetten bilet kaldır
// @route   DELETE /api/tickets/:id
// @access  Private
exports.removeTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Bilet bulunamadı',
      });
    }

    // Sadece kendi biletini silebilir
    if (ticket.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bu bileti silme yetkiniz yok',
      });
    }

    // Ödenmiş bilet silinemez
    if (ticket.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'Ödenmiş biletler silinemez',
      });
    }

    await ticket.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Bilet sepetten kaldırıldı',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bilet silinemedi',
      error: error.message,
    });
  }
};

// @desc    Ödeme işlemini tamamla
// @route   POST /api/tickets/checkout
// @access  Private
exports.checkout = async (req, res) => {
  try {
    // Sepetteki tüm biletleri getir
    const tickets = await Ticket.find({
      userId: req.user._id,
      status: 'pending',
      isPaid: false,
    });

    if (tickets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sepetinizde bilet bulunmuyor',
      });
    }

    // Simülasyon: Gerçek projede burada iyzico veya başka bir ödeme entegrasyonu olacak
    // Şu anda direkt olarak başarılı kabul ediyoruz

    // Biletlerin toplam tutarını hesapla
    let totalAmount = 0;
    for (const ticket of tickets) {
      totalAmount += ticket.price;
    }

    // Her bir bileti güncelle
    const updatedTickets = [];
    for (let ticket of tickets) {
      const event = await Event.findById(ticket.eventId);

      // Etkinlik bilet sayısını azalt
      event.availableTickets -= 1;
      await event.save();

      // QR kod oluştur
      const qrCodeData = `ticket-${ticket._id}-event-${ticket.eventId}-user-${ticket.userId}`;
      const qrCodeImage = await QRCode.toDataURL(qrCodeData);

      // Bileti güncelle
      ticket.status = 'confirmed';
      ticket.isPaid = true;
      ticket.qrCode = qrCodeImage;
      await ticket.save();

      updatedTickets.push(ticket);
    }

    // E-posta gönderimi simülasyonu (gerçek projede ayarlanmalı)
    // Bu kısım nodemailer ile gerçekleştirilecek

    res.status(200).json({
      success: true,
      data: updatedTickets,
      totalAmount,
      message: 'Ödeme başarıyla tamamlandı. Biletleriniz e-posta adresinize gönderildi.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Ödeme işlemi başarısız',
      error: error.message,
    });
  }
};

// @desc    Kullanıcının tüm biletlerini getir
// @route   GET /api/tickets/my-tickets
// @access  Private
exports.getMyTickets = async (req, res) => {
  try {
    // Kullanıcıya ait biletleri bul ve eventId'leri populate et
    const tickets = await Ticket.find({ userId: req.user.id })
      .populate({
        path: 'eventId',
        select: '_id title date time location coverImage'
      })
      .sort('-purchaseDate'); // En son alınan biletler önce gösterilsin

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets
    });
  } catch (err) {
    console.error('Bilet getirme hatası:', err);
    res.status(500).json({
      success: false,
      message: 'Biletleriniz alınırken bir sorun oluştu',
      error: err.message
    });
  }
};

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private
exports.getTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find();

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Biletler alınırken bir sorun oluştu'
    });
  }
};

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Bilet bulunamadı'
      });
    }

    // Kullanıcı sadece kendi biletini veya admin görebilir
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Bu bileti görüntüleme yetkiniz yok'
      });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Bilet alınırken bir sorun oluştu'
    });
  }
};

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// @access  Private
exports.updateTicket = async (req, res) => {
  try {
    let ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Bilet bulunamadı'
      });
    }

    // Kullanıcı sadece kendi biletini veya admin güncelleyebilir
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Bu bileti güncelleme yetkiniz yok'
      });
    }

    ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Bilet güncellenirken bir sorun oluştu'
    });
  }
};

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
// @access  Private
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Bilet bulunamadı'
      });
    }

    // Kullanıcı sadece kendi biletini veya admin silebilir
    if (ticket.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        error: 'Bu bileti silme yetkiniz yok'
      });
    }

    await ticket.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Bilet silinirken bir sorun oluştu'
    });
  }
};