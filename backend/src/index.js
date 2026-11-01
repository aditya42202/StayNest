import 'express-async-errors';
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';

import connectDB from './config/db.js';
import { getJWTSecret } from './utils/generateToken.js';

import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import ownerRoutes from './routes/ownerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import { handleStripeWebhook } from './controllers/paymentController.js';
import { getEmailConfigurationStatus } from './utils/sendEmail.js';
import User from './models/User.js';

import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

getJWTSecret();
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

// Connect Database
connectDB().then(() => {
  const clearExpiredVerificationData = async () => {
    try {
      const result = await User.updateMany(
        {
          emailVerificationRequired: true,
          emailVerificationExpires: { $lte: new Date() }
        },
        {
          $unset: {
            emailVerificationCodeHash: '',
            emailVerificationSalt: '',
            emailVerificationExpires: ''
          },
          $set: { emailVerificationAttempts: 0 }
        }
      );
      if (result.modifiedCount > 0) {
        console.info(JSON.stringify({
          event: 'expired_verification_tokens_cleared',
          count: result.modifiedCount
        }));
      }
    } catch (error) {
      console.error(JSON.stringify({
        event: 'expired_verification_cleanup_failed',
        name: error instanceof Error ? error.name : 'UnknownError',
        code: typeof error?.code === 'string' ? error.code : undefined
      }));
    }
  };
  void clearExpiredVerificationData();
  const cleanupInterval = setInterval(() => {
    void clearExpiredVerificationData();
  }, 60 * 60 * 1000);
  cleanupInterval.unref();
});

const isProduction = process.env.NODE_ENV === 'production';
const configuredClientUrls = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CORS_ALLOWED_ORIGINS
]
  .filter(Boolean)
  .flatMap((value) => value.split(','))
  .map((url) => url.trim())
  .filter(Boolean);
const clientUrls = configuredClientUrls.length
  ? [...new Set(configuredClientUrls.map((url) => new URL(url).origin))]
  : isProduction
    ? []
    : ['http://localhost:5173'];

if (isProduction && clientUrls.length === 0) {
  throw new Error('FRONTEND_URL or CLIENT_URL must be configured in production');
}

const emailConfiguration = getEmailConfigurationStatus();
if (emailConfiguration.configured) {
  console.info(JSON.stringify({
    event: 'email_provider_configured',
    provider: emailConfiguration.provider
  }));
} else {
  console.warn(JSON.stringify({
    event: 'email_provider_configuration_invalid',
    provider: emailConfiguration.provider,
    reason: emailConfiguration.reason
  }));
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || clientUrls.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error('CORS blocked');
      error.status = 403;
      callback(error);
    },
    credentials: true
  })
);

const requireTrustedCookieOrigin = (req, res, next) => {
  const origin = req.get('origin');
  if (!origin || !clientUrls.includes(origin)) {
    return res.status(403).json({ message: 'Request origin is not allowed' });
  }
  return next();
};

app.use('/api/auth/refresh', requireTrustedCookieOrigin);
app.use('/api/auth/logout', requireTrustedCookieOrigin);

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'StayNest AI backend is running',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);

// Error Middleware
app.use(notFound);
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 StayNest AI backend listening on port ${PORT}`);
});