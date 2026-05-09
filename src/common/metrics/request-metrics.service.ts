import { Injectable } from '@nestjs/common';

export interface RouteMetric {
  method: string;
  route: string;
  requests: number;
  responses: Record<string, number>;
  lastStatus?: number;
  lastSeenAt: string;
}

export interface RouteMetricsSummary {
  totalRequests: number;
  totalResponses: number;
  routes: RouteMetric[];
}

@Injectable()
export class RequestMetricsService {
  private readonly metrics = new Map<string, RouteMetric>();

  record(method: string, route: string, statusCode: number): void {
    const key = `${method} ${route}`;
    const nowIso = new Date().toISOString();
    const existing = this.metrics.get(key);

    if (!existing) {
      this.metrics.set(key, {
        method,
        route,
        requests: 1,
        responses: { [statusCode]: 1 },
        lastStatus: statusCode,
        lastSeenAt: nowIso,
      });
      return;
    }

    existing.requests += 1;
    existing.responses[statusCode] = (existing.responses[statusCode] ?? 0) + 1;
    existing.lastStatus = statusCode;
    existing.lastSeenAt = nowIso;
  }

  getSummary(): RouteMetricsSummary {
    const routes = Array.from(this.metrics.values()).sort((a, b) => {
      if (a.route === b.route) return a.method.localeCompare(b.method);
      return a.route.localeCompare(b.route);
    });

    const totalRequests = routes.reduce((sum, item) => sum + item.requests, 0);
    const totalResponses = totalRequests;

    return {
      totalRequests,
      totalResponses,
      routes,
    };
  }
}
