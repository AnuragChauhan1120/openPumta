import { Request, Response, NextFunction } from 'express';
import { bumpVersion, statsVersionKey } from '../utils/cache.js';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Mount in front of every router whose writes can change dashboard stats (subjects, habits,
 * todos, demo data). After a successful mutation it bumps the user's stats version, which
 * makes every cached dashboard entry for that user unreachable.
 *
 * The bump is awaited *before* the response goes out, so a client that refetches stats right
 * after a write can never be served the old cached copy.
 */
export function invalidateStatsOnWrite(req: Request, res: Response, next: NextFunction) {
  if (READ_METHODS.has(req.method)) return next();

  const originalJson = res.json.bind(res);
  res.json = (body?: any) => {
    const userId = (req.user as { id?: number } | undefined)?.id;
    if (res.statusCode < 400 && userId) {
      bumpVersion(statsVersionKey(userId)).finally(() => originalJson(body));
    } else {
      originalJson(body);
    }
    return res;
  };
  next();
}
