const Event = require('../models/event.model');
const Category = require('../models/category.model');

// @desc    Tüm etkinlikleri getir
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    // Sorgu parametrelerini al
    const { category, search, page = 1, limit = 10 } = req.query;

    // Sorgu oluştur - sadece onaylı ve aktif etkinlikleri getir
    const query = { 
      isApproved: true,
      status: { $ne: 'cancelled' } // İptal edilmiş etkinlikleri hariç tut
    };

    // Kategori filtresi
    if (category) {
      query.category = category;
    }

    // Arama filtresi
    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Etkinlikleri getir
    const events = await Event.find(query)
      .populate('category', 'name')
      .populate('organizerId', 'username email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: 1 });

    // Toplam etkinlik sayısı
    const totalEvents = await Event.countDocuments(query);

    res.status(200).json({
      success: true,
      count: events.length,
      totalPages: Math.ceil(totalEvents / parseInt(limit)),
      currentPage: parseInt(page),
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlikler getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Admin için tüm etkinlikleri getir (onaylı/onaysız)
// @route   GET /api/events/all
// @access  Private/Admin
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('category', 'name')
      .populate('organizerId', 'username email')
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlikler getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Etkinlik durumunu güncelle
// @route   PUT /api/events/:id/status
// @access  Private/Admin
exports.updateEventStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Status validasyonu
    const validStatuses = ['active', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz etkinlik durumu',
      });
    }

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('category', 'name').populate('organizerId', 'username email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Etkinlik bulunamadı',
      });
    }

    res.status(200).json({
      success: true,
      data: event,
      message: 'Etkinlik durumu başarıyla güncellendi',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlik durumu güncellenemedi',
      error: error.message,
    });
  }
};

// @desc    Belirli bir etkinliği getir
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('category', 'name')
      .populate('organizerId', 'username email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Etkinlik bulunamadı',
      });
    }

    // Etkinlik onaylanmadıysa sadece organizatörü ve admin görebilir
    if (!event.isApproved) {
      if (!req.user || (req.user.role !== 'admin' && req.user.id !== event.organizerId.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Bu etkinliğe erişim izniniz yok',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlik getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Organizatörün etkinliklerini getir
// @route   GET /api/events/my-events
// @access  Private/Organizer
exports.getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizerId: req.user.id })
      .populate('category', 'name')
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlikler getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Etkinlik güncelle
// @route   PUT /api/events/:id
// @access  Private/Organizer/Admin
exports.updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Etkinlik bulunamadı',
      });
    }

    // Organizatör yalnızca kendi etkinliklerini güncelleyebilir (admin hariç)
    if (req.user.role !== 'admin' && event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bu etkinliği güncelleme yetkiniz yok',
      });
    }

    // Kategori ID'sinin geçerliliğini kontrol et
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz kategori ID',
        });
      }
    }

    // Etkinliği güncelle
    event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name').populate('organizerId', 'username email');

    res.status(200).json({
      success: true,
      data: event,
      message: 'Etkinlik başarıyla güncellendi',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlik güncellenemedi',
      error: error.message,
    });
  }
};

// @desc    Etkinlik sil
// @route   DELETE /api/events/:id
// @access  Private/Organizer/Admin
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Etkinlik bulunamadı',
      });
    }

    // Organizatör yalnızca kendi etkinliklerini silebilir (admin hariç)
    if (req.user.role !== 'admin' && event.organizerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bu etkinliği silme yetkiniz yok',
      });
    }

    // TODO: İlişkili biletleri ve diğer verileri de sil
    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Etkinlik başarıyla silindi',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlik silinemedi',
      error: error.message,
    });
  }
};

// Öne çıkan etkinlikleri getir (maksimum 4 tane)
exports.getFeaturedEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;
    const events = await Event.find()
      .sort({ createdAt: -1 }) // En yeni etkinlikleri getir
      .limit(limit);
    
    return res.status(200).json(events);
  } catch (error) {
    console.error("Öne çıkan etkinlikler getirilirken hata:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

// @desc    Etkinlik oluştur (Admin için)
// @route   POST /api/events
// @access  Private/Admin
exports.createEvent = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      date, 
      location, 
      price, 
      availableTickets,
      category,
      organizerId,
      coverImage,
      sliderImages 
    } = req.body;

    // Kategori kontrolü
    const categoryExists = await Category.findById(category);
    if (!category || !categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir kategori seçilmelidir',
      });
    }

    const event = await Event.create({
      title,
      description,
      date,
      location,
      price,
      availableTickets,
      category,
      organizerId,
      coverImage: coverImage || '',
      sliderImages: sliderImages || [],
      status: 'active',
      isApproved: true // Admin oluşturduğu için otomatik onaylı
    });

    res.status(201).json({
      success: true,
      data: event,
      message: 'Etkinlik başarıyla oluşturuldu',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Etkinlik oluşturulamadı',
      error: error.message,
    });
  }
};