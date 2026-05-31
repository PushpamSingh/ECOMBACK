import cloudinary from '../config/cloudinary.js';

// Uploads an in-memory file buffer to Cloudinary and returns the secure URL.
export function uploadBuffer(buffer, folder = 'agarbattikart') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

// Uploads multiple files and returns an array of URLs.
export async function uploadMany(files = [], folder = 'agarbattikart') {
  const urls = [];
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    urls.push(await uploadBuffer(file.buffer, folder));
  }
  return urls;
}

// Injects a Cloudinary transformation (e.g. 'c_fill,w_1920,h_700,f_auto,q_auto')
// into an existing Cloudinary delivery URL. Returns the URL unchanged if it's not
// a Cloudinary '/upload/' URL (so external/seed URLs still work).
export function buildTransformUrl(url, transform) {
  if (!url || typeof url !== 'string' || !url.includes('/upload/')) return url || '';
  return url.replace('/upload/', `/upload/${transform}/`);
}
