import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SwapOrder } from '../swap/entities/swap-order.entity';
import { SwapMatch } from '../swap/entities/swap-match.entity';
import { OrderStatus } from '../swap/enums/order-status.enum';
import { RequestMetricsService, RouteMetricsSummary } from '../common/metrics/request-metrics.service';

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectRepository(SwapOrder)
    private readonly orderRepo: Repository<SwapOrder>,
    @InjectRepository(SwapMatch)
    private readonly matchRepo: Repository<SwapMatch>,
    private readonly requestMetrics: RequestMetricsService,
  ) {}

  getRouteMetrics(): RouteMetricsSummary {
    return this.requestMetrics.getSummary();
  }

  async getTotalMovedUsd(): Promise<{ totalUsd: string; currency: string }> {
    const status = OrderStatus.COMPLETED;
    const row = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o."offerAmountUsd"), 0)', 'totalUsd')
      .innerJoin('swap_matches', 'm', '(m."orderAId" = o.id OR m."orderBId" = o.id)')
      .where('m.status = :status', { status })
      .getRawOne();

    return {
      totalUsd: row?.totalUsd?.toString() ?? '0',
      currency: 'USD',
    };
  }

  async getTotalMovedByToken(): Promise<{ items: Array<{ symbol: string; totalAmount: string }> }> {
    const status = OrderStatus.COMPLETED;
    const items = await this.orderRepo
      .createQueryBuilder('o')
      .select('o."offerTokenSymbol"', 'symbol')
      .addSelect('SUM(o."offerAmount")', 'totalAmount')
      .innerJoin('swap_matches', 'm', '(m."orderAId" = o.id OR m."orderBId" = o.id)')
      .where('m.status = :status', { status })
      .groupBy('o."offerTokenSymbol"')
      .orderBy('SUM(o."offerAmount")', 'DESC')
      .getRawMany();

    return { items };
  }

  async getTotalFeesUsd(): Promise<{ totalFeeUsd: string; currency: string }> {
    const status = OrderStatus.COMPLETED;
    const row = await this.matchRepo
      .createQueryBuilder('m')
      .select(
        `COALESCE(SUM(
          COALESCE((m."feeBreakdown"->>'userAFeeUsd')::numeric, 0) +
          COALESCE((m."feeBreakdown"->>'userBFeeUsd')::numeric, 0)
        ), 0)`,
        'totalFeeUsd',
      )
      .where('m.status = :status', { status })
      .getRawOne();

    return {
      totalFeeUsd: row?.totalFeeUsd?.toString() ?? '0',
      currency: 'USD',
    };
  }

  async getFeesBySwap(): Promise<{ items: Array<{ matchId: string; totalFeeUsd: string; createdAt: string }> }> {
    const status = OrderStatus.COMPLETED;
    const items = await this.matchRepo
      .createQueryBuilder('m')
      .select('m.id', 'matchId')
      .addSelect(
        `(
          COALESCE((m."feeBreakdown"->>'userAFeeUsd')::numeric, 0) +
          COALESCE((m."feeBreakdown"->>'userBFeeUsd')::numeric, 0)
        )`,
        'totalFeeUsd',
      )
      .addSelect('m."createdAt"', 'createdAt')
      .where('m.status = :status', { status })
      .orderBy('m."createdAt"', 'DESC')
      .getRawMany();

    return { items };
  }
}
