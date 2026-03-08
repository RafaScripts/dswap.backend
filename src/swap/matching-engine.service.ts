import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { SwapOrder } from './entities/swap-order.entity';
import { OrderStatus } from './enums/order-status.enum';

@Injectable()
export class MatchingEngineService {
  private readonly logger = new Logger(MatchingEngineService.name);

  constructor(
    @InjectRepository(SwapOrder)
    private readonly orderRepo: Repository<SwapOrder>,
  ) {}

  /**
   * Encontra ordens complementares para uma nova ordem.
   *
   * Lógica:
   * - Mesma chain
   * - orderA.offerToken === orderB.wantToken
   * - orderA.wantToken === orderB.offerToken
   * - Ambas com status OPEN
   * - Ordens de usuários diferentes
   * - Quantidades compatíveis (com tolerância de ±2%)
   * - FIFO: primeiro a chegar, primeiro a ser matcheado
   */
  async findMatch(order: SwapOrder): Promise<SwapOrder | null> {
    const candidates = await this.orderRepo.find({
      where: {
        chain: order.chain,
        offerToken: order.wantToken,
        wantToken: order.offerToken,
        status: OrderStatus.OPEN,
        userId: Not(order.userId),
      },
      order: { createdAt: 'ASC' },
    });

    // Filtrar por compatibilidade de quantidades
    for (const candidate of candidates) {
      if (this.isAmountCompatible(order, candidate)) {
        this.logger.log(
          `Match encontrado: Order ${order.id} ↔ Order ${candidate.id}`,
        );
        return candidate;
      }
    }

    this.logger.debug(`Nenhum match encontrado para Order ${order.id}`);
    return null;
  }

  /**
   * Verifica compatibilidade de quantidades com tolerância.
   * Compara a razão de troca (quanto um quer por quanto oferece).
   *
   * @param tolerancePercent - Tolerância em % (padrão: 2%)
   */
  isAmountCompatible(
    orderA: SwapOrder,
    orderB: SwapOrder,
    tolerancePercent = 2,
  ): boolean {
    const ratioA = Number(orderA.offerAmount) / Number(orderA.wantAmount);
    const ratioB = Number(orderB.wantAmount) / Number(orderB.offerAmount);

    if (ratioA === 0 || ratioB === 0) return false;

    const diff = Math.abs(ratioA - ratioB) / Math.max(ratioA, ratioB);
    return diff <= tolerancePercent / 100;
  }
}
