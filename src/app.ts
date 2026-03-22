import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import { corsOptions } from './config/cors';
import { requestLogger } from './middleware/requestLogger.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { generalLimiter } from './middleware/rateLimiter.middleware';

import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import restaurantRoutes from './modules/restaurant/restaurant.routes';
import menuRoutes from './modules/menu/menu.routes';
import tableRoutes from './modules/table/table.routes';
import sessionRoutes from './modules/session/session.routes';
import orderRoutes from './modules/order/order.routes';
import paymentRoutes from './modules/payment/payment.routes';
import qrcodeRoutes from './modules/qrcode/qrcode.routes';
import reportRoutes from './modules/report/report.routes';
const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(cors(corsOptions));

// --- Body parsing ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// --- Rate limiting ---
app.use(generalLimiter);

// --- Request logging ---
app.use(requestLogger);

// --- Static file serving (uploads) ---
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// --- API Routes ---
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', restaurantRoutes);
app.use('/api/v1', menuRoutes);
app.use('/api/v1', tableRoutes);
app.use('/api/v1', sessionRoutes);
app.use('/api/v1', orderRoutes);
app.use('/api/v1', paymentRoutes);
app.use('/api/v1', qrcodeRoutes);
app.use('/api/v1', reportRoutes);

// --- Error handling (must be last) ---
app.use(errorHandler);

export default app;
