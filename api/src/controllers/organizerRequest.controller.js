const OrganizerRequest = require('../models/organizerRequest.model');
const User = require('../models/user.model');

// @desc    Organizatör olma isteği oluştur
// @route   POST /api/organizer-requests
// @access  Private
exports.createOrganizerRequest = async (req, res) => {
  try {
    const { title, description } = req.body;

    // Kullanıcının daha önce bekleyen isteği var mı kontrol et
    const existingRequest = await OrganizerRequest.findOne({
      userId: req.user._id,
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Zaten bekleyen bir organizatör olma isteğiniz bulunmaktadır',
      });
    }

    // Kullanıcı zaten organizatör mü kontrol et
    if (req.user.role === 'organizer' || req.user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Zaten organizatör veya admin rolüne sahipsiniz',
      });
    }

    // Yeni istek oluştur
    const organizerRequest = await OrganizerRequest.create({
      userId: req.user._id,
      title,
      description,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      data: organizerRequest,
      message: 'Organizatör olma isteğiniz başarıyla oluşturuldu',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstek oluşturulamadı',
      error: error.message,
    });
  }
};

// @desc    Tüm organizatör isteklerini getir (admin için)
// @route   GET /api/organizer-requests
// @access  Private/Admin
exports.getOrganizerRequests = async (req, res) => {
  try {
    // Status filtresi uygula
    const status = req.query.status || 'pending';

    const requests = await OrganizerRequest.find({ status })
      .populate('userId', 'username email firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstekler getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Organizatör isteğini getir
// @route   GET /api/organizer-requests/:id
// @access  Private/Admin
exports.getOrganizerRequest = async (req, res) => {
  try {
    const request = await OrganizerRequest.findById(req.params.id)
      .populate('userId', 'username email firstName lastName');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'İstek bulunamadı',
      });
    }

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstek getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Organizatör isteğini güncelle (admin için)
// @route   PUT /api/organizer-requests/:id
// @access  Private/Admin
exports.updateOrganizerRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz durum. Sadece "approved" veya "rejected" olabilir',
      });
    }

    const request = await OrganizerRequest.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewedBy: req.user._id,
        reviewedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('userId', 'username email firstName lastName');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'İstek bulunamadı',
      });
    }

    // Eğer istek onaylandıysa, kullanıcı rolünü güncelle
    if (status === 'approved') {
      const updatedUser = await User.findByIdAndUpdate(
        request.userId,
        { role: 'organizer' },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        console.error(`Kullanıcı ${request.userId} güncellenemedi. Rol atanamazken hata oluştu.`);
        return res.status(500).json({
          success: false,
          message: 'Kullanıcı rolü güncellenirken hata oluştu',
        });
      }

      console.log(`Kullanıcı ${updatedUser._id} organizatör olarak güncellendi. Yeni rol: ${updatedUser.role}`);
    }

    res.status(200).json({
      success: true,
      data: request,
      message: `İstek başarıyla ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`,
    });
  } catch (error) {
    console.error('Organizatör isteği güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstek durumu güncellenemedi',
      error: error.message,
    });
  }
};

// @desc    Kullanıcının organizatör isteklerini getir
// @route   GET /api/organizer-requests/my-requests
// @access  Private
exports.getMyOrganizerRequests = async (req, res) => {
  try {
    const requests = await OrganizerRequest.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'İstekler getirilemedi',
      error: error.message,
    });
  }
};