import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SwapOrder } from './entities/swap-order.entity';
import { SwapMatch } from './entities/swap-match.entity';
import { OrderStatus } from './enums/order-status.enum';
import { MatchingEngineService } from './matching-engine.service';
import { FeeCalculatorService } from './fee-calculator.service';
import { EscrowService } from './escrow.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SwapGateway } from './swap.gateway';

@Injectable()
export class SwapService {
  private readonly logger = new Logger(SwapService.name);

  constructor(
    @InjectRepository(SwapOrder)
    private readonly orderRepo: Repository<SwapOrder>,
    @InjectRepository(SwapMatch)
    private readonly matchRepo: Repository<SwapMatch>,
    private readonly matchingEngine: MatchingEngineService,
    private readonly feeCalculator: FeeCalculatorService,
    private readonly escrowService: EscrowService,
    private readonly config: ConfigService,
    private readonly swapGateway: SwapGateway,
  ) {}

  /**
   * Cria uma nova ordem de swap e tenta encontrar um match imediato.
   */
  async createOrder(userId: string, dto: CreateOrderDto): Promise<SwapOrder> {
    const expirationMinutes = dto.expirationMinutes ?? 60;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60_000);

    const order = this.orderRepo.create({
      userId,
      chain: dto.chain,
      offerToken: dto.offerToken,
      offerTokenSymbol: dto.offerTokenSymbol,
      offerAmount: dto.offerAmount,
      wantToken: dto.wantToken,
      wantTokenSymbol: dto.wantTokenSymbol,
      wantAmount: dto.wantAmount,
      status: OrderStatus.OPEN,
      expiresAt,
    });

    const savedOrder = await this.orderRepo.save(order);
    this.logger.log(`\n========================================`);
    this.logger.log(`📥 [SWAP SERVICE] Nova Ordem (#${savedOrder.id})`);
    this.logger.log(`   User: ${userId}`);
    this.logger.log(`   Oferece: ${dto.offerAmount} ${dto.offerTokenSymbol}`);
    this.logger.log(`   Quer:    ${dto.wantAmount} ${dto.wantTokenSymbol}`);
    this.logger.log(`   Chain:   ${dto.chain}`);
    this.logger.log(`========================================\n`);

    // Tentar match imediato
    const matchCandidate = await this.matchingEngine.findMatch(savedOrder);
    if (matchCandidate) {
      this.logger.log(`[SWAP SERVICE] Conectando Ordem ${savedOrder.id} com Ordem ${matchCandidate.id} no banco de dados...`);
      await this.createMatch(savedOrder, matchCandidate);
    } else {
      this.logger.log(`[SWAP SERVICE] Ordem ${savedOrder.id} registrada no OrderBook aguardando um par.`);
    }

    return savedOrder;
  }

  /**
   * Lista ordens do usuário autenticado.
   */
  async getUserOrders(userId: string): Promise<SwapOrder[]> {
    return this.orderRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Lista todas as ordens abertas (para browse).
   */
  async getOpenOrders(): Promise<SwapOrder[]> {
    return this.orderRepo.find({
      where: { status: OrderStatus.OPEN },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cancela uma ordem aberta do usuário.
   */
  async cancelOrder(userId: string, orderId: string): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Ordem não encontrada');
    if (order.userId !== userId) throw new ForbiddenException('Não autorizado a cancelar esta ordem');
    if (order.status !== OrderStatus.OPEN) {
      throw new BadRequestException('Apenas ordens abertas podem ser canceladas');
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepo.save(order);
    this.logger.log(`Ordem ${orderId} cancelada por user ${userId}`);
  }

  /**
   * Obtém detalhes de um match.
   */
  async getMatchDetails(userId: string, matchId: string): Promise<SwapMatch> {
    let match = await this.matchRepo.findOne({
      where: [
        { id: matchId },
      ],
      relations: ['orderA', 'orderA.user', 'orderB', 'orderB.user', 'escrowTransactions'],
    });

    if (!match) {
      match = await this.matchRepo.findOne({
        where: [
          { orderAId: matchId },
        ],
        relations: ['orderA', 'orderA.user', 'orderB', 'orderB.user', 'escrowTransactions'],
      });
    }

    if (!match) {
      match = await this.matchRepo.findOne({
        where: [
          { orderBId: matchId },
        ],
        relations: ['orderA', 'orderA.user', 'orderB', 'orderB.user', 'escrowTransactions'],
      });
    }

    if (!match) throw new NotFoundException('Match não encontrado');

    // Verificar acesso
    if (match.orderA.userId !== userId && match.orderB.userId !== userId) {
      throw new ForbiddenException('Não autorizado a ver este match');
    }

    return match;
  }

  /**
   * Confirma os termos de um match (um lado por vez).
   */
  async confirmMatch(userId: string, matchId: string): Promise<SwapMatch> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['orderA', 'orderA.user', 'orderB', 'orderB.user'],
    });

    if (!match) throw new NotFoundException('Match não encontrado');
    if (match.status !== OrderStatus.MATCHED) {
      throw new BadRequestException('Match não está no status correto para confirmação');
    }

    // Determinar qual lado está confirmando
    if (match.orderA.userId === userId) {
      match.userAConfirmed = true;
    } else if (match.orderB.userId === userId) {
      match.userBConfirmed = true;
    } else {
      throw new ForbiddenException('Não autorizado a confirmar este match');
    }

    // Notificar via WebSocket
    const otherUserId = match.orderA.userId === userId ? match.orderB.userId : match.orderA.userId;
    this.swapGateway.notifyMatchConfirmed(otherUserId, {
      matchId: match.id,
      side: match.orderA.userId === userId ? 'A' : 'B',
    });

    // Se ambos confirmaram, avançar para CONFIRMED e criar escrow
    if (match.userAConfirmed && match.userBConfirmed) {
      match.status = OrderStatus.CONFIRMED;

      // Criar transações de escrow
      await this.escrowService.createEscrowTransactions(match);

      this.logger.log(`Match ${matchId} confirmado por ambos, escrow criado`);
    }

    return this.matchRepo.save(match);
  }

  /**
   * Cancela/rejeita um match.
   */
  async cancelMatch(userId: string, matchId: string): Promise<void> {
    const match = await this.matchRepo.findOne({
      where: { id: matchId },
      relations: ['orderA', 'orderB'],
    });

    if (!match) throw new NotFoundException('Match não encontrado');
    if (match.orderA.userId !== userId && match.orderB.userId !== userId) {
      throw new ForbiddenException('Não autorizado a cancelar este match');
    }

    if (match.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('Match já foi completado');
    }

    // Se já houve depósitos, refund
    if (match.status === OrderStatus.CONFIRMED || match.status === OrderStatus.DEPOSITED) {
      await this.escrowService.refund(match);
    } else {
      match.status = OrderStatus.CANCELLED;
      await this.matchRepo.save(match);
    }

    // Reabrir as ordens
    await this.orderRepo.update(match.orderAId, { status: OrderStatus.OPEN });
    await this.orderRepo.update(match.orderBId, { status: OrderStatus.OPEN });

    // Notificar via WebSocket
    const otherUserId = match.orderA.userId === userId ? match.orderB.userId : match.orderA.userId;
    this.swapGateway.notifySwapCancelled(otherUserId, {
      matchId: match.id,
      reason: 'Cancelado pelo counterparty',
    });

    this.logger.log(`Match ${matchId} cancelado por user ${userId}`);
  }

  /**
   * Cria um match entre duas ordens complementares.
   */
  private async createMatch(orderA: SwapOrder, orderB: SwapOrder): Promise<SwapMatch> {
    const matchTimeoutMinutes = this.config.get<number>('SWAP_MATCH_TIMEOUT_MINUTES', 10);
    const expiresAt = new Date(Date.now() + matchTimeoutMinutes * 60_000);

    // Calcular fees
    const feeBreakdown = await this.feeCalculator.calculateFees(orderA, orderB);

    // Atualizar status das ordens
    orderA.status = OrderStatus.MATCHED;
    orderB.status = OrderStatus.MATCHED;
    await this.orderRepo.save([orderA, orderB]);

    // Criar match
    const match = this.matchRepo.create({
      orderAId: orderA.id,
      orderBId: orderB.id,
      chain: orderA.chain,
      status: OrderStatus.MATCHED,
      feeBreakdown,
      expiresAt,
    });

    const savedMatch = await this.matchRepo.save(match);

    // Notificar ambos via WebSocket
    this.swapGateway.notifyMatchFound(orderA.userId, {
      matchId: savedMatch.id,
      counterpartyAddress: '', // Seria preenchido com o address do counterparty
      feeBreakdown,
    });
    this.swapGateway.notifyMatchFound(orderB.userId, {
      matchId: savedMatch.id,
      counterpartyAddress: '',
      feeBreakdown,
    });

    this.logger.log(`\n========================================`);
    this.logger.log(`🔗 [SWAP SERVICE] MATCH CONSOLIDADO COM SUCESSO!`);
    this.logger.log(`   ID do Match: ${savedMatch.id}`);
    this.logger.log(`   Order Alice: ${orderA.id} (User: ${orderA.userId})`);
    this.logger.log(`   Order Bob:   ${orderB.id} (User: ${orderB.userId})`);
    this.logger.log(`   Fees Ocultas (JSONB): ${JSON.stringify(feeBreakdown)}`);
    this.logger.log(`   Notificações Socket.IO foram emitidas para as duas partes!`);
    this.logger.log(`========================================\n`);

    return savedMatch;
  }
}
