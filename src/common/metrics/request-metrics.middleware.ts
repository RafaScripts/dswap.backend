import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestMetricsService } from './request-metrics.service';

@Injectable()
export class RequestMetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: RequestMetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    res.on('finish', () => {
      const baseUrl = req.baseUrl ?? '';
      const routePath = req.route?.path ?? '';
      const rawRoute = routePath ? `${baseUrl}${routePath}` : (req.originalUrl ?? req.url ?? '');
      const route = rawRoute.split('?')[0] || 'unknown';
      this.metrics.record(req.method, route, res.statusCode);
    });

    next();
  }
}
