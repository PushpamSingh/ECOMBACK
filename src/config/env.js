import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agarbattikart',

  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },

  admin: {
    name: process.env.ADMIN_NAME || 'Store Admin',
    email: process.env.ADMIN_EMAIL || 'admin@agarbattikart.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
  },
};

export const isProd = env.nodeEnv === 'production';

// Fails fast on misconfiguration so we never run with an insecure default secret in prod.
export function validateEnv() {
  if (!isProd) return;
  const problems = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_secret_change_me') {
    problems.push('JWT_SECRET must be set to a strong, non-default value');
  }
  if (!process.env.MONGO_URI) problems.push('MONGO_URI must be set');
  if (env.razorpay.keyId && !env.razorpay.keySecret) {
    problems.push('RAZORPAY_KEY_SECRET is missing while RAZORPAY_KEY_ID is set');
  }
  if (problems.length) {
    throw new Error(`Invalid environment configuration:\n - ${problems.join('\n - ')}`);
  }
}
