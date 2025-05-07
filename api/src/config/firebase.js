const admin = require('firebase-admin');

// Servis hesabı anahtarı dosyası (Firebase Console'dan indirilecek)
// NOT: Bu dosya .gitignore'a eklenmelidir
let serviceAccount;
try {
  serviceAccount = require('../firebase-service-account-key.json');
} catch (error) {
  console.error('Firebase servis hesabı anahtarı yüklenemedi:', error.message);
  console.info('Firebase servis hesabı anahtarı bulunamadı, ortam değişkenlerinden yüklemeye çalışılacak...');

  // Eğer dosya bulunamazsa, environment variable kullan
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (parseError) {
      console.error('Firebase servis hesabı JSON parse hatası:', parseError);
      serviceAccount = null;
    }
  }
}

// Firebase Admin SDK başlatma
if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`
  });
  console.log('Firebase Admin SDK başarıyla başlatıldı');
} else {
  console.error('Firebase Admin SDK başlatılamadı: Servis hesabı anahtarı bulunamadı');
}

module.exports = admin;