const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const admin = require('../config/firebase');

// Kullanıcının JWT token ile kimlik doğrulamasını yapar
exports.protect = async (req, res, next) => {
  let token;
  let isFirebaseToken = false;

  try {
    // Headers'dan token'ı al
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
      console.log("Token alındı:", token.substring(0, 10) + "...");

      // Firebase ID token'ı mı standart JWT mi kontrol et
      isFirebaseToken = token.length > 500; // Firebase tokenları genellikle daha uzun
    } else if (req.headers.authorization) {
      console.log("Authorization başlığı var ama 'Bearer' formatında değil:", req.headers.authorization);
    } else {
      console.log("Authorization başlığı bulunamadı");
    }

    // Token yoksa hata döndür
    if (!token) {
      console.log("Token bulunamadı - 401 döndürülüyor");
      return res.status(401).json({
        success: false,
        message: 'Bu sayfaya erişmek için giriş yapmalısınız',
      });
    }

    let userId;

    // Token tipine göre doğrulama yap
    if (isFirebaseToken) {
      try {
        // Firebase ID token doğrulama
        console.log("Firebase ID token doğrulanıyor...");
        const decodedFirebaseToken = await admin.auth().verifyIdToken(token);

        // Firebase UID ile kullanıcıyı bul
        const firebaseUser = await User.findOne({ firebaseUid: decodedFirebaseToken.uid });

        if (!firebaseUser) {
          console.log("Firebase UID ile kullanıcı bulunamadı:", decodedFirebaseToken.uid);
          return res.status(401).json({
            success: false,
            message: 'Firebase hesabı sistemde kayıtlı değil',
          });
        }

        userId = firebaseUser._id;
        console.log("Firebase token doğrulandı, User ID:", userId);
      } catch (firebaseError) {
        console.error("Firebase token doğrulama hatası:", firebaseError);
        return res.status(401).json({
          success: false,
          message: 'Geçersiz Firebase token'
        });
      }
    } else {
      // Standart JWT token doğrulama
      console.log("JWT token doğrulanıyor...");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      console.log("JWT token doğrulandı, ID:", userId);
    }

    // Kullanıcıyı bul ve request nesnesine ekle
    const user = await User.findById(userId);

    if (!user) {
      console.log("Kullanıcı bulunamadı, ID:", userId);
      return res.status(401).json({
        success: false,
        message: 'Token geçerli değil - kullanıcı bulunamadı',
      });
    }

    console.log("Kullanıcı bulundu:", user._id, "Rol:", user.role);
    req.user = user;
    next();
  } catch (error) {
    console.error("Token doğrulama hatası:", error.message);
    return res.status(401).json({
      success: false,
      message: 'Bu sayfaya erişme yetkiniz yok - ' + error.message,
    });
  }
};

// Belirli rollere sahip kullanıcılara erişim sağlar
exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log("Rol kontrolü: Kullanıcı rolü", req.user.role, "- Gerekli roller:", roles);

    if (!roles.includes(req.user.role)) {
      console.log("Rol yetkisi reddedildi");
      return res.status(403).json({
        success: false,
        message: `${req.user.role} rolünün bu işlemi yapma yetkisi yok`,
      });
    }

    console.log("Rol yetkisi onaylandı");
    next();
  };
};