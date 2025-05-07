const Category = require('../models/category.model');

// @desc    Tüm kategorileri getir
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort('name');

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kategoriler getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Belirli bir kategoriyi getir
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı',
      });
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kategori getirilemedi',
      error: error.message,
    });
  }
};

// @desc    Kategori oluştur
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    // Kategori isminin zaten var olup olmadığını kontrol et
    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Bu isimde bir kategori zaten mevcut',
      });
    }

    const category = await Category.create({
      name,
      description,
      image,
    });

    res.status(201).json({
      success: true,
      data: category,
      message: 'Kategori başarıyla oluşturuldu',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kategori oluşturulamadı',
      error: error.message,
    });
  }
};

// @desc    Kategori güncelle
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı',
      });
    }

    // Eğer isim değiştirildiyse, yeni isim başka bir kategoride var mı kontrol et
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Bu isimde bir kategori zaten mevcut',
        });
      }
    }

    // Kategoriyi güncelle
    category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: name || category.name,
        description: description || category.description,
        image: image || category.image,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: category,
      message: 'Kategori başarıyla güncellendi',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kategori güncellenemedi',
      error: error.message,
    });
  }
};

// @desc    Kategori sil
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı',
      });
    }

    // TODO: Bu kategoriye ait etkinlikler varsa silme işlemini engelle veya kategorileri güncelle

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Kategori başarıyla silindi',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kategori silinemedi',
      error: error.message,
    });
  }
};