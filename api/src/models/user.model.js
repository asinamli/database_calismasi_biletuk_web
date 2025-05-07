const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Kullanıcı adı zorunludur'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email zorunludur'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        // Firebase kullanıcıları için şifre zorunlu olmamalı
        return !this.isFirebaseUser;
      },
      minlength: 8,
      select: false, // Sorgu sonuçlarında şifrenin görünmesini engeller
    },
    role: {
      type: String,
      enum: ['user', 'organizer', 'admin'],
      default: 'user',
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    // Firebase alanları
    firebaseUid: {
      type: String,
      sparse: true, // Sadece varsa unique olacak
      unique: true,
      index: true,
    },
    isFirebaseUser: {
      type: Boolean,
      default: false
    },
    profileImage: {
      type: String,
    },
    // Şifre sıfırlama alanları
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetPasswordCode: String,  // Şifre sıfırlama kodu için eklendi
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals: Kullanıcının aldığı biletler için virtual populate
userSchema.virtual('tickets', {
  ref: 'Ticket',
  foreignField: 'userId',
  localField: '_id',
});

// Kayıt edilmeden önce şifreyi hash'le
userSchema.pre('save', async function (next) {
  // Firebase kullanıcıları veya şifre değişmediyse hash'leme
  if (this.isFirebaseUser || !this.isModified('password')) {
    return next();
  }

  // Şifreyi hash'le
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Şifre kontrolü için metod
userSchema.methods.matchPassword = async function (enteredPassword) {
  // Firebase kullanıcıları için şifre kontrolü yapılmaz
  if (this.isFirebaseUser) {
    return false;
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;