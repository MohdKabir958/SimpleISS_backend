import { z } from 'zod';
import dotenv from 'dotenv';
import { resolveRedisUrl } from './redisUrl';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3000').transform(Number),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  /** Local / self-hosted Redis, or any rediss:// URL (takes effect if Upstash vars are not set). */
  REDIS_URL: z.string().optional(),

  /** Upstash REST API base URL, e.g. https://xxx.upstash.io — used with token to build rediss:// for ioredis */
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  /** Comma-separated browser origins allowed to call the API (Flutter web port varies, e.g. 56611). */
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:8080')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  STORAGE_TYPE: z.enum(['local', 's3', 'cloudinary']).default('local'),

  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  CLOUDINARY_URL: z.string().optional(),

  QR_BASE_URL: z.string().default('http://localhost:8080'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const { url: redisConnectionUrl, source: redisUrlSource } = resolveRedisUrl({
  upstashRestUrl: parsed.data.UPSTASH_REDIS_REST_URL,
  upstashToken: parsed.data.UPSTASH_REDIS_REST_TOKEN,
  redisUrl: parsed.data.REDIS_URL,
});

export const config = {
  env: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  isDev: parsed.data.NODE_ENV === 'development',
  isProd: parsed.data.NODE_ENV === 'production',

  database: {
    url: parsed.data.DATABASE_URL,
  },

  redis: {
    /** Resolved URL for ioredis (Upstash → rediss://default:...@host:6379) */
    url: redisConnectionUrl,
    source: redisUrlSource,
  },

  jwt: {
    accessSecret: parsed.data.JWT_ACCESS_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },

  cors: {
    /** Parsed from CORS_ORIGIN (comma-separated in .env). */
    origins: parsed.data.CORS_ORIGIN,
  },

  storage: {
    type: parsed.data.STORAGE_TYPE,
    s3: {
      bucket: parsed.data.S3_BUCKET,
      region: parsed.data.S3_REGION,
      accessKey: parsed.data.S3_ACCESS_KEY,
      secretKey: parsed.data.S3_SECRET_KEY,
    },
    cloudinary: {
      url: parsed.data.CLOUDINARY_URL,
    },
  },

  qr: {
    baseUrl: parsed.data.QR_BASE_URL,
  },
} as const;
