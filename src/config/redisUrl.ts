/**
 * Upstash exposes a REST API (UPSTASH_REDIS_REST_*) and a Redis protocol endpoint.
 * ioredis + @socket.io/redis-adapter need the Redis wire protocol (TLS), not HTTP REST.
 * This builds rediss://default:TOKEN@host:6379 from the REST URL hostname + token.
 *
 * @see https://upstash.com/docs/redis/howto/connectwithioredis
 */
export function buildUpstashRedisUrl(restUrl: string, token: string): string {
  const trimmedUrl = restUrl.trim();
  const trimmedToken = token.trim();
  if (!trimmedUrl || !trimmedToken) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be non-empty');
  }

  const u = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
  if (!u.hostname) {
    throw new Error('Invalid UPSTASH_REDIS_REST_URL: missing hostname');
  }

  const password = encodeURIComponent(trimmedToken);
  return `rediss://default:${password}@${u.hostname}:6379`;
}

export type RedisUrlSource = 'upstash' | 'redis_url' | 'default';

export function resolveRedisUrl(options: {
  upstashRestUrl?: string | undefined;
  upstashToken?: string | undefined;
  redisUrl?: string | undefined;
}): { url: string; source: RedisUrlSource } {
  const { upstashRestUrl, upstashToken, redisUrl } = options;

  if (upstashRestUrl && upstashToken) {
    return {
      url: buildUpstashRedisUrl(upstashRestUrl, upstashToken),
      source: 'upstash',
    };
  }

  if (redisUrl && redisUrl.length > 0) {
    return { url: redisUrl, source: 'redis_url' };
  }

  return { url: 'redis://localhost:6379', source: 'default' };
}
