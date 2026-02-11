const { v2: cloudinary } = require('cloudinary');
const dotenv = require('dotenv');

dotenv.config();

// On configure globalement dès le chargement du fichier
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;