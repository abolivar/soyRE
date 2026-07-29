import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient } from '@redis/client';

const RATE_LIMIT_KEY_PREFIX = 'soypms:demo-request-rate-limit';

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local window_start = tonumber(ARGV[1])
local attempted_at = tonumber(ARGV[2])
local member = ARGV[3]
local max_requests = tonumber(ARGV[4])
local ttl_ms = tonumber(ARGV[5])

redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

if redis.call('ZCARD', key) >= max_requests then
  redis.call('PEXPIRE', key, ttl_ms)
  return 0
end

redis.call('ZADD', key, attempted_at, member)
redis.call('PEXPIRE', key, ttl_ms)
return 1
`;

type DemoRequestRedisClient = ReturnType<typeof createClient>;

@Injectable()
export class DemoRequestRateLimitStore implements OnModuleDestroy {
  private readonly logger = new Logger(DemoRequestRateLimitStore.name);
  private client?: DemoRequestRedisClient;
  private connection?: Promise<DemoRequestRedisClient>;

  async consume(input: {
    attemptedAt: number;
    fingerprint: string;
    maxRequests: number;
    member: string;
    windowMs: number;
  }) {
    const redisUrl = process.env.DEMO_REQUEST_RATE_LIMIT_REDIS_URL?.trim();

    if (!redisUrl) {
      throw unavailableRateLimitStore();
    }

    try {
      const client = await this.getClient(redisUrl);
      const result = await client.eval(SLIDING_WINDOW_SCRIPT, {
        arguments: [
          String(input.attemptedAt - input.windowMs),
          String(input.attemptedAt),
          input.member,
          String(input.maxRequests),
          String(input.windowMs),
        ],
        keys: [`${RATE_LIMIT_KEY_PREFIX}:${input.fingerprint}`],
      });

      return Number(result) === 1;
    } catch {
      this.logger.warn(
        'Distributed demo request rate limiting is unavailable; rejecting the request.',
      );
      throw unavailableRateLimitStore();
    }
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      this.client.destroy();
    }
  }

  private async getClient(redisUrl: string) {
    if (!this.client) {
      this.client = createClient({
        socket: {
          connectTimeout: 1_500,
          reconnectStrategy: false,
        },
        url: redisUrl,
      });
      this.client.on('error', () => {
        this.logger.warn(
          'The distributed rate limit connection reported an error.',
        );
      });
    }

    if (this.client.isReady) {
      return this.client;
    }

    if (!this.connection) {
      const client = this.client;
      this.connection = client
        .connect()
        .then(() => client)
        .catch((error: unknown) => {
          client.destroy();
          if (this.client === client) {
            this.client = undefined;
          }
          throw error;
        })
        .finally(() => {
          this.connection = undefined;
        });
    }

    return this.connection;
  }
}

function unavailableRateLimitStore() {
  return new ServiceUnavailableException(
    'Demo request protection is temporarily unavailable.',
  );
}
