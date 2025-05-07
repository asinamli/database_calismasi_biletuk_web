const mongoose = require('mongoose');

// MongoDB bağlantısını kurma
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB bağlantısı kuruldu: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Hata: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;