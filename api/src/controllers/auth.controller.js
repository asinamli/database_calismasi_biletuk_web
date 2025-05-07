const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const admin = require('../config/firebase'); // Firebase Admin SDK

// JWT Token oluşturma fonksiyonu
const generateToken = (id) => {
  console.log("Token oluşturuluyor, ID:", id);
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
  console.log("Token oluşturuldu:", token.substring(0, 15) + "...");
  return token;
};

// Email gönderme fonksiyonu
const sendEmail = async (options) => {
  // NodeMailer ile email gönderme yapılandırması
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Email gönderme ayarları
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  // Email gönder
  await transporter.sendMail(mailOptions);
};

// @desc    Kullanıcı kayıt işlemi
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Email veya username zaten var mı kontrol et
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Bu e-posta adresi veya kullanıcı adı zaten kullanılıyor',
      });
    }

    // Yeni kullanıcı oluştur
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role: 'user', // Varsayılan rol user
    });

    console.log("Kullanıcı oluşturuldu:", user._id);

    // Password hariç kullanıcı verilerini dön
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
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
    console.error("Kayıt hatası:", error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı kaydı başarısız',
      error: error.message,
    });
  }
};

// @desc    Kullanıcı girişi
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    console.log("Giriş isteği:", { identifier });

    // Email veya username ile kullanıcıyı bul
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    }).select('+password');

    if (!user) {
      console.log("Kullanıcı bulunamadı:", identifier);
      return res.status(401).json({
        success: false,
        message: 'Geçersiz giriş bilgileri',
      });
    }

    // Şifre doğrulama
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      console.log("Şifre eşleşmedi");
      return res.status(401).json({
        success: false,
        message: 'Geçersiz giriş bilgileri',
      });
    }

    console.log("Giriş başarılı, kullanıcı:", user.username, "ID:", user._id);

    // JWT token oluştur
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
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
    console.error("Login hatası:", error);
    res.status(500).json({
      success: false,
      message: 'Giriş başarısız',
      error: error.message,
    });
  }
};

// @desc    Mevcut kullanıcıyı getir
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

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
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri alınamadı',
      error: error.message,
    });
  }
};

// @desc    Şifre güncelleme
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Mevcut şifre doğrulama
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mevcut şifre yanlış',
      });
    }

    // Şifreyi güncelle
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Şifre başarıyla güncellendi',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şifre güncellenemedi',
      error: error.message,
    });
  }
};

// @desc    Şifre sıfırlama isteği
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Email ile kullanıcı bul
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı',
      });
    }

    // 6 haneli rastgele kod oluştur
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpire = Date.now() + 15 * 60 * 1000; // 15 dakika geçerli

    // Kullanıcı için reset kodunu kaydet
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpire = resetCodeExpire;
    await user.save();

    // Email gönder
    const message = `
      <h1>Şifre Sıfırlama İsteği</h1>
      <p>Şifrenizi sıfırlamak için aşağıdaki kodu kullanın:</p>
      <h2>${resetCode}</h2>
      <p>Bu kod 15 dakika boyunca geçerlidir.</p>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Şifre Sıfırlama Kodu',
      message,
    });

    res.status(200).json({
      success: true,
      message: 'E-posta adresinize şifre sıfırlama kodu gönderildi',
    });
  } catch (error) {
    console.error("Şifre sıfırlama hatası:", error);
    res.status(500).json({
      success: false,
      message: 'Şifre sıfırlama kodu gönderilemedi',
      error: error.message,
    });
  }
};

// @desc    Şifre sıfırlama kodu doğrulama
// @route   POST /api/auth/verify-reset-code
// @access  Public
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Email ve kod ile kullanıcı bul
    const user = await User.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz veya süresi dolmuş sıfırlama kodu',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Kod doğrulandı, şimdi şifrenizi sıfırlayabilirsiniz',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kod doğrulanamadı',
      error: error.message,
    });
  }
};

// @desc    Şifre sıfırlama
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Email ve kod ile kullanıcı bul
    const user = await User.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz veya süresi dolmuş sıfırlama kodu',
      });
    }

    // Şifreyi güncelle
    user.password = newPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Şifreniz başarıyla sıfırlandı, şimdi giriş yapabilirsiniz',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Şifre sıfırlanamadı',
      error: error.message,
    });
  }
};

// @desc    Firebase ile giriş yapma
// @route   POST /api/auth/firebase-login
// @access  Public
exports.firebaseLogin = async (req, res) => {
  try {
    const { idToken, email, displayName, photoURL } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token gerekli'
      });
    }

    // Firebase token doğrulama
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    console.log('Firebase token doğrulandı:', { uid: firebaseUid, email: decodedToken.email });

    // Firebase UID ile kullanıcı ara
    let user = await User.findOne({ firebaseUid });

    if (!user) {
      // Email ile kullanıcı ara (hesap birleştirme için)
      if (email) {
        user = await User.findOne({ email });

        // Kullanıcı varsa, Firebase UID'sini güncelle
        if (user) {
          user.firebaseUid = firebaseUid;
          user.isFirebaseUser = true;
          await user.save();
          console.log('Mevcut hesap Firebase ile bağlandı:', user._id);
        }
      }

      // Kullanıcı hala yoksa, yeni kullanıcı oluştur
      if (!user) {
        // Firebase'den gelen email veya UID'den türetilen varsayılan bir kullanıcı adı oluştur
        const username = email ? email.split('@')[0] : `user_${firebaseUid.substring(0, 8)}`;

        // Yeni kullanıcı oluştur
        user = await User.create({
          username,
          email: email || '',
          firstName: displayName ? displayName.split(' ')[0] : '',
          lastName: displayName ? displayName.split(' ')[1] || '' : '',
          profileImage: photoURL || '',
          firebaseUid,
          isFirebaseUser: true,
          role: 'user', // Varsayılan rol
        });

        console.log('Firebase kullanıcısı MongoDB\'ye kaydedildi:', user._id);
      }
    }

    // JWT token oluştur
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImage: user.profileImage
      },
      message: 'Firebase ile giriş başarılı'
    });
  } catch (error) {
    console.error('Firebase login hatası:', error);

    res.status(401).json({
      success: false,
      message: 'Firebase doğrulama başarısız',
      error: error.message
    });
  }
};

// @desc    Firebase ile kayıt olma
// @route   POST /api/auth/firebase-signup
// @access  Public
exports.firebaseSignup = async (req, res) => {
  try {
    const { idToken, username, email, firstName, lastName, firebaseUid } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token gerekli'
      });
    }

    // Firebase token doğrulama
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Token'daki UID ile gönderilen UID eşleşmeli
    if (firebaseUid && decodedToken.uid !== firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz Firebase UID'
      });
    }

    const uid = decodedToken.uid;

    // Firebase UID ile kullanıcı var mı kontrol et
    let user = await User.findOne({ firebaseUid: uid });

    if (user) {
      return res.status(400).json({
        success: false,
        message: 'Bu Firebase hesabı ile zaten kayıt olunmuş'
      });
    }

    // Email ile kullanıcı var mı kontrol et
    if (email) {
      user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({
          success: false,
          message: 'Bu e-posta adresi ile zaten kayıt olunmuş'
        });
      }
    }

    // Username ile kullanıcı var mı kontrol et
    if (username) {
      user = await User.findOne({ username });

      if (user) {
        return res.status(400).json({
          success: false,
          message: 'Bu kullanıcı adı zaten kullanılıyor'
        });
      }
    }

    // Yeni kullanıcı oluştur
    const newUser = await User.create({
      username: username || email.split('@')[0],
      email: email || decodedToken.email || '',
      firstName: firstName || '',
      lastName: lastName || '',
      firebaseUid: uid,
      isFirebaseUser: true,
      role: 'user', // Varsayılan rol
      profileImage: decodedToken.picture || ''
    });

    console.log('Firebase kullanıcısı oluşturuldu:', newUser._id);

    // JWT token oluştur
    const token = generateToken(newUser._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        profileImage: newUser.profileImage
      },
      message: 'Firebase ile kayıt başarılı'
    });
  } catch (error) {
    console.error('Firebase signup hatası:', error);

    res.status(500).json({
      success: false,
      message: 'Kayıt başarısız',
      error: error.message
    });
  }
};

// @desc    Kullanıcı çıkışı
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // JWT token ile çıkış yapma özel bir işlem gerektirmez
    // Client tarafında token silinir
    // Ancak kullanıcı aktivitesi kaydedilebilir
    console.log('Kullanıcı çıkış yaptı:', req.user?._id);

    res.status(200).json({
      success: true,
      message: 'Başarıyla çıkış yapıldı'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Çıkış işlemi başarısız',
      error: error.message
    });
  }
};