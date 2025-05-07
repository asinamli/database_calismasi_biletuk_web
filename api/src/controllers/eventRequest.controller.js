const EventRequest = require('../models/eventRequest.model');
const Event = require('../models/event.model');
const Category = require('../models/category.model');
const User = require('../models/user.model');

// @desc    Etkinlik isteği oluştur (organizatörler için)
// @route   POST /api/event-requests
// @access  Private/Organizer
exports.createEventRequest = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      location,
      price,
      availableTickets,
      category,
      coverImage,
      sliderImages
    } = req.body;

    // Kategori ID'sinin geçerliliğini kontrol et
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz kategori ID',
      });
    }

    // Yeni etkinlik isteği oluştur
    const eventRequest = await EventRequest.create({
      title,
      description,
      date,
      location,
      price,
      availableTickets,
      category,
      organizerId: req.user._id,
      status: 'pending',
      coverImage: coverImage || '',
      sliderImages: sliderImages || [],
    });

    res.status(201).json({
      success: true,
      data: eventRequest,
      message: 'Etkinlik isteği başarıyla oluşturuldu. Admin onayını bekliyor.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlik isteği oluşturulamadı',
      error: error.message,
    });
  }
};

// @desc    Tüm etkinlik isteklerini getir (admin için)
// @route   GET /api/event-requests
// @access  Private/Admin
exports.getEventRequests = async (req, res) => {
  try {
    // Status filtresi uygula
    const status = req.query.status || 'pending';

    const requests = await EventRequest.find({ status })
      .populate('organizerId', 'username email firstName lastName')
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlik istekleri getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Belirli bir etkinlik isteğini getir
// @route   GET /api/event-requests/:id
// @access  Private/Admin, Private/Owner
exports.getEventRequest = async (req, res) => {
  try {
    const request = await EventRequest.findById(req.params.id)
      .populate('organizerId', 'username email firstName lastName')
      .populate('category', 'name');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Etkinlik isteği bulunamadı',
      });
    }

    // Yalnızca admin veya etkinlik sahibi bu bilgiye erişebilir
    if (req.user.role !== 'admin' && request.organizerId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bu etkinlik isteğine erişim izniniz yok',
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlik isteği getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Etkinlik isteği güncelle (admin için)
// @route   PUT /api/event-requests/:id
// @access  Private/Admin
exports.updateEventRequestStatus = async (req, res) => {
  try {
    const { status, adminComment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum. Sadece "approved" veya "rejected" olabilir',
      });
    }

    const request = await EventRequest.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminComment: adminComment || '',
        reviewedBy: req.user._id,
        reviewedAt: Date.now()
      },
      { new: true, runValidators: true }
    )
      .populate('organizerId', 'username email firstName lastName')
      .populate('category', 'name');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Etkinlik isteği bulunamadı',
      });
    }

    // Eğer istek onaylandıysa, yeni bir etkinlik oluştur
    if (status === 'approved') {
      await Event.create({
        title: request.title,
        description: request.description,
        date: request.date,
        location: request.location,
        price: request.price,
        availableTickets: request.availableTickets,
        category: request.category,
        organizerId: request.organizerId,
        isApproved: true,
        coverImage: request.coverImage,
        sliderImages: request.sliderImages,
      });
    }

    res.status(200).json({
      success: true,
      data: request,
      message: `Etkinlik isteği başarıyla ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlik isteği durumu güncellenemedi',
      error: error.message,
    });
  }
};

// @desc    Organizatörün kendi etkinlik isteklerini getir
// @route   GET /api/event-requests/my-requests
// @access  Private/Organizer
exports.getMyEventRequests = async (req, res) => {
  try {
    const requests = await EventRequest.find({ organizerId: req.user.id })
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlik istekleri getirilemedi',
      error: error.message,
    });
  }
};