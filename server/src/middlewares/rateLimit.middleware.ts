import { Request, Response, NextFunction } from 'express';
import { redisClient, redisAvailable } from '../config/redis.js';
import { ApiError } from '../utils/ApiError.js';

interface RateLimitOptions {
  /** Short name, becomes part of the Redis key so limiters don't share counters */
  name: string;
  windowSeconds: number;
  max: number;
}

/**
 * Fixed-window rate limiter backed by Redis. INCR is atomic, so the count stays correct
 * across multiple API instances. If Redis is down the request is let through (fail open)
 * rather than taking the whole API down with it.
 */
export function rateLimit({ name, windowSeconds, max }: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!redisAvailable || !redisClient.isReady) return next();

    try {
      const key = `ratelimit:${name}:${req.ip}`;
      const count = await redisClient.incr(key);
      // First hit in the window starts the clock; the key then expires on its own
      if (count === 1) await redisClient.expire(key, windowSeconds);

      const ttl = await redisClient.ttl(key);
      // Guard against a key left without a TTL (e.g. crash between INCR and EXPIRE)
      if (ttl < 0) await redisClient.expire(key, windowSeconds);
      const resetIn = ttl > 0 ? ttl : windowSeconds;

      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('RateLimit-Reset', resetIn);

      if (count > max) {
        res.setHeader('Retry-After', resetIn);
        return next(new ApiError(429, 'Too many requests, please try again later'));
      }
    } catch {
      // limiter errors must never block real traffic
    }
    next();
  };
}

/** Generous limit applied to the whole API */
export const apiLimiter = rateLimit({ name: 'api', windowSeconds: 60, max: 1000 });
/** Tight limit for login-style endpoints (guest account creation, OAuth) */
export const authLimiter = rateLimit({ name: 'auth', windowSeconds: 60, max: 60 });
/** AI endpoints cost real money per call */
export const aiLimiter = rateLimit({ name: 'ai', windowSeconds: 60, max: 30 });
