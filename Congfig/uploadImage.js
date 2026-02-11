const cloudinary = require("./cloudinary");

// Upload d’une image Base64 ou URL
const uploadImage = async (image) => {
  try {
    const result = await cloudinary.uploader.upload(image, {
      folder: "agora/posts",
      resource_type: "image",
      transformation: [
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Erreur Cloudinary:", error);
    throw error;
  }
};

module.exports = uploadImage;
