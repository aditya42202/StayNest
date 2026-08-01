import cloudinary from '../config/cloudinary.js';

export const uploadImage = async (req, res) => {
  if (!req.body.image) {
    res.status(400);
    throw new Error('No image data provided');
  }

  const uploadResponse = await cloudinary.uploader.upload(req.body.image, {
    folder: 'staynest_ai/properties',
    resource_type: 'image'
  });

  res.status(201).json({ url: uploadResponse.secure_url, publicId: uploadResponse.public_id });
};
