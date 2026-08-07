import 'express-async-errors';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from 'passport';

import connectDB from './config/db.js';

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

import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// Connect Database
connectDB();

// Allowed Client URLs
const clientUrls = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((url) => url.trim());

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalOrigin =
        origin?.startsWith("http://localhost") ||
        origin?.startsWith("http://127.0.0.1");

      if (!origin || clientUrls.includes(origin) || isLocalOrigin) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
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