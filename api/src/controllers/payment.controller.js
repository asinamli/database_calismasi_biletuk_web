const Iyzipay = require('iyzipay');
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Event = require('../models/event.model');
const Ticket = require('../models/ticket.model');

// İyzico yapılandırması
const iyzipay = new Iyzipay({
  apiKey: 'sandbox-luZf3MGYu38BWWYEr4lRYAxXLbBjbigz',
  secretKey: 'sandbox-ynEiofbGunrCv9749gKbx2F5IRGymK4A',
  uri: 'https://sandbox-api.iyzipay.com'
});

// Rastgele benzersiz bir ID oluştur
const createUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// IP adresini al
const getIp = (req) => {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
};

// Ödeme başlat
exports.initiatePayment = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { cartItems, userId, contactInfo } = req.body;
    
    // Kullanıcı bilgilerini kontrol et
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    if (cartItems.length === 0) {
      throw new Error('Sepetinizde ürün bulunmamaktadır');
    }

    // Toplam tutarı hesapla
    const totalPrice = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const serviceFee = Math.round(totalPrice * 0.05); // %5 hizmet bedeli
    const totalWithFee = totalPrice + serviceFee;
    
    // İyzico için öğeleri hazırla
    const basketItems = cartItems.map(item => {
      return {
        id: item.eventId,
        name: item.eventTitle,
        category1: 'Bilet',
        itemType: 'VIRTUAL',
        price: item.price,
      };
    });
    
    // İyzico ödeme isteği oluştur
    const randomConversationId = createUniqueId();
    
    const request = {
      locale: 'tr',
      conversationId: randomConversationId,
      price: totalPrice.toString(),
      paidPrice: totalWithFee.toString(),
      currency: 'TRY',
      installment: '1',
      basketId: 'B' + Date.now(),
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',
      callbackUrl: 'http://localhost:3000/checkout/success', // Frontend callback URL'i
      
      buyer: {
        id: req.user.id,
        name: contactInfo.firstName || user.username,
        surname: contactInfo.lastName || "User",
        gsmNumber: contactInfo.phone || '+905350000000',
        email: contactInfo.email || user.email, 
        identityNumber: '11111111111', // Test için sabit değer
        registrationAddress: 'Test Adres',
        ip: getIp(req),
        city: 'Istanbul',
        country: 'Turkey',
      },
      
      shippingAddress: {
        contactName: contactInfo.firstName + ' ' + contactInfo.lastName || user.username,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Test Adres',
        zip: '34000',
      },
      
      billingAddress: {
        contactName: contactInfo.firstName + ' ' + contactInfo.lastName || user.username,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Test Adres',
        zip: '34000',
      },
      
      basketItems: basketItems
    };
    
    // İyzico ile checkout form oluştur
    iyzipay.checkoutFormInitialize.create(request, async function (err, result) {
      if (err) {
        console.log("İyzico Hata:", err);
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({
          success: false,
          message: "Ödeme başlatılırken bir hata oluştu",
          error: err
        });
      }
      
      console.log("İyzico Sonuç:", result);
      
      if (result.status !== 'success') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Ödeme başlatılamadı: " + result.errorMessage,
          error: result
        });
      }
      
      // Ödeme formunun URL'sini ve token bilgisini döndür
      res.status(200).json({
        success: true,
        paymentPageUrl: result.paymentPageUrl,
        token: result.token
      });
      
      // İşlem başarılıysa transaksiyon tamamla
      await session.commitTransaction();
      session.endSession();
    });
  } catch (err) {
    console.error('Ödeme hatası:', err);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      success: false,
      message: err.message || 'Ödeme başlatılırken bir hata oluştu'
    });
  }
};

// Ödeme doğrulama
exports.verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const { token } = req.body;
    
    if (!token) {
      throw new Error('Token bulunamadı');
    }
    
    // Ödeme durumunu doğrula
    const request = {
      locale: 'tr',
      conversationId: createUniqueId(),
      token: token
    };
    
    iyzipay.checkoutForm.retrieve(request, async function (err, result) {
      if (err) {
        console.log("İyzico Hata:", err);
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({
          success: false,
          message: "Ödeme doğrulanırken bir hata oluştu",
          error: err
        });
      }
      
      console.log("İyzico Ödeme Sonucu:", result);
      
      if (result.status !== 'success' || result.paymentStatus !== 'SUCCESS') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Ödeme başarısız: " + (result.errorMessage || ""),
          paymentStatus: result.paymentStatus
        });
      }
      
      try {
        // Sepetteki ürünleri alma
        // İyzico'dan gelen basket items'ı kullanıyoruz
        const basketItems = result.basketItems;
        
        // Biletleri oluştur
        for (const item of basketItems) {
          const eventId = item.id;
          
          // Event bilgisini al
          const event = await Event.findById(eventId).session(session);
          if (!event) {
            throw new Error(`Etkinlik bulunamadı: ${eventId}`);
          }
          
          // Etkinliğin bilet sayısını güncelle
          if (event.availableTickets > 0) {
            event.availableTickets -= 1;
            await event.save({ session });
          }
          
          // Bilet objesi oluştur
          const ticket = new Ticket({
            userId: req.user.id,
            eventId: eventId,
            price: parseFloat(item.price),
            isPaid: true,
            purchaseDate: new Date(), // Satın alma tarihi
            qrCode: `${req.user.id}-${eventId}-${Date.now()}`, // Bilet için QR kod oluştur
            status: 'confirmed'
          });
          
          // Bileti kaydet
          await ticket.save({ session });
        }
        
        // İşlem başarılıysa transaksiyon tamamla
        await session.commitTransaction();
        session.endSession();
        
        return res.status(200).json({
          success: true,
          message: 'Ödeme başarıyla tamamlandı, biletleriniz oluşturuldu'
        });
      } catch (saveError) {
        console.error('Bilet kaydetme hatası:', saveError);
        await session.abortTransaction();
        session.endSession();
        
        return res.status(500).json({
          success: false,
          message: saveError.message || 'Biletler kaydedilirken bir hata oluştu'
        });
      }
    });
  } catch (err) {
    console.error('Ödeme doğrulama hatası:', err);
    await session.abortTransaction();
    session.endSession();
    
    return res.status(500).json({
      success: false,
      message: err.message || 'Ödeme doğrulanırken bir hata oluştu'
    });
  }
};