const User = require('../models/user.model');

// @desc    Tüm kullanıcıları getir (admin için)
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Belirli bir kullanıcıyı getir
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Mevcut kullanıcı bilgilerini getir
// @route   GET /api/users/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    console.log("getCurrentUser çağrıldı, user:", req.user ? {
      _id: req.user._id,
      id: req.user.id,
      role: req.user.role
    } : "User bilgisi yok");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı bulunamadı veya oturum süresi doldu',
      });
    }

    // MongoDB _id kullanılıyor - req.user.id değil
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      console.log("Kullanıcı veritabanında bulunamadı, ID:", req.user._id);
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    console.log("Kullanıcı bulundu:", user._id, "Rol:", user.role);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("getCurrentUser hatası:", error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri alınamadı',
      error: error.message,
    });
  }
};

// @desc    Kullanıcı profilini güncelle
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, username } = req.body;

    // Email veya username değişti mi kontrol et
    if (email || username) {
      const existingUser = await User.findOne({
        $or: [
          { email: email, _id: { $ne: req.user._id } },
          { username: username, _id: { $ne: req.user._id } }
        ]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Bu e-posta adresi veya kullanıcı adı zaten kullanılıyor',
        });
      }
    }

    // Profili güncelle
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(email && { email }),
        ...(username && { username }),
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Profil başarıyla güncellendi',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Profil güncellenemedi',
      error: error.message,
    });
  }
};

// @desc    Kullanıcı rolünü güncelle (admin için)
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'organizer', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz rol',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'Kullanıcı rolü başarıyla güncellendi',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı rolü güncellenemedi',
      error: error.message,
    });
  }
};

// @desc    Kullanıcı sil (admin için)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinemedi',
      error: error.message,
    });
  }
};