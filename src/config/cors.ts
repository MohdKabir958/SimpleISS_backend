import cors from 'cors';
import { config } from './env';

function productionCorsOrigin(): cors.CorsOptions['origin'] {
  const origins = config.cors.origins;
  if (origins.length === 0) return false;
  if (origins.length === 1) return origins[0];
  return origins;
}

export const corsOptions: cors.CorsOptions = {
  origin: config.isDev
    ? [/http:\/\/localhost:\d+/, /http:\/\/127\.0\.0\.1:\d+/]
    : productionCorsOrigin(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400,
};
