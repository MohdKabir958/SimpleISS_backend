import cors from 'cors';
import { config } from './env';

export const corsOptions: cors.CorsOptions = {
  origin: config.isDev
    ? [/http:\/\/localhost:\d+/, /http:\/\/127\.0\.0\.1:\d+/]
    : config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400,
};
