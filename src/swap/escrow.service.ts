import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SwapMatch } from './entities/swap-match.entity';
import { EscrowTransaction } from './entities/escrow-transaction.entity';
import { EscrowStatus } from './enums/escrow-status.enum';
import { TransactionDirection } from './enums/transaction-direction.enum';
import { OrderStatus } from './enums/order-status.enum';
import { Chain } from '../common/types/chain.enum';
import { FeeCalculatorService } from './fee-calculator.service';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    @InjectRepository(EscrowTransaction)
    private readonly escrowRepo: Repository<EscrowTransaction>,
    @InjectRepository(SwapMatch)
    private readonly matchRepo: Repository<SwapMatch>,
    private readonly config: ConfigService,
    private readonly feeCalculator: FeeCalculatorService,
  ) {}

  /**
   * Cria registros de escrow para ambos os lados de um match.
   * Retorna as transações de escrow INBOUND (aguardando depósito).
   */
  async createEscrowTransactions(match: SwapMatch): Promise<EscrowTransaction[]> {
    const escrowAddress = this.getEscrowAddress(match.chain);

    // Escrow para User A (deposita offerToken de orderA)
    const escrowA = this.escrowRepo.create({
      matchId: match.id,
      fromAddress: match.orderA.user?.address ?? '',
      toAddress: escrowAddress,
      token: match.orderA.offerToken,
      tokenSymbol: match.orderA.offerTokenSymbol,
      amount: match.orderA.offerAmount,
      chain: match.chain,
      status: EscrowStatus.AWAITING_DEPOSIT,
      direction: TransactionDirection.INBOUND,
    });

    // Escrow para User B (deposita offerToken de orderB)
    const escrowB = this.escrowRepo.create({
      matchId: match.id,
      fromAddress: match.orderB.user?.address ?? '',
      toAddress: escrowAddress,
      token: match.orderB.offerToken,
      tokenSymbol: match.orderB.offerTokenSymbol,
      amount: match.orderB.offerAmount,
      chain: match.chain,
      status: EscrowStatus.AWAITING_DEPOSIT,
      direction: TransactionDirection.INBOUND,
    });

    const saved = await this.escrowRepo.save([escrowA, escrowB]);
    this.logger.log(`Escrow transactions criadas para match ${match.id}`);

    return saved;
  }

  /**
   * Registra um depósito confirmado.
   */
  async confirmDeposit(
    escrowId: string,
    txHash: string,
    blockNumber: number,
    confirmations: number,
  ): Promise<EscrowTransaction> {
    const escrow = await this.escrowRepo.findOneOrFail({ where: { id: escrowId } });
    escrow.status = EscrowStatus.DEPOSIT_CONFIRMED;
    escrow.txHash = txHash;
    escrow.blockNumber = blockNumber;
    escrow.confirmations = confirmations;

    const saved = await this.escrowRepo.save(escrow);
    this.logger.log(`Depósito confirmado: escrow ${escrowId}, tx ${txHash}`);

    return saved;
  }

  /**
   * Verifica se ambos os depósitos foram confirmados para um match.
   */
  async areBothDepositsConfirmed(matchId: string): Promise<boolean> {
    const inboundTxs = await this.escrowRepo.find({
      where: {
        matchId,
        direction: TransactionDirection.INBOUND,
      },
    });

    return (
      inboundTxs.length >= 2 &&
      inboundTxs.every((tx) => tx.status === EscrowStatus.DEPOSIT_CONFIRMED)
    );
  }

  /**
   * Distribui tokens após ambos terem depositado.
   * Cria transações OUTBOUND e atualiza status do match para COMPLETED.
   */
  async distribute(match: SwapMatch): Promise<void> {
    const feePercentage = match.feeBreakdown?.feePercentage ?? 0.5;
    const escrowAddress = this.getEscrowAddress(match.chain);

    // Calcular amounts líquidos
    const netAmountForA = this.feeCalculator.subtractFee(match.orderB.offerAmount, feePercentage);
    const netAmountForB = this.feeCalculator.subtractFee(match.orderA.offerAmount, feePercentage);

    // Token2 → User A
    const outboundA = this.escrowRepo.create({
      matchId: match.id,
      fromAddress: escrowAddress,
      toAddress: match.orderA.user?.address ?? '',
      token: match.orderA.wantToken,
      tokenSymbol: match.orderA.wantTokenSymbol,
      amount: netAmountForA,
      chain: match.chain,
      status: EscrowStatus.PROCESSING,
      direction: TransactionDirection.OUTBOUND,
    });

    // Token1 → User B
    const outboundB = this.escrowRepo.create({
      matchId: match.id,
      fromAddress: escrowAddress,
      toAddress: match.orderB.user?.address ?? '',
      token: match.orderB.wantToken,
      tokenSymbol: match.orderB.wantTokenSymbol,
      amount: netAmountForB,
      chain: match.chain,
      status: EscrowStatus.PROCESSING,
      direction: TransactionDirection.OUTBOUND,
    });

    await this.escrowRepo.save([outboundA, outboundB]);

    // TODO: Em produção, aqui seriam enviadas as transações on-chain
    // via hot wallet (signing com KMS), e o status seria atualizado
    // para DISTRIBUTED após confirmação.

    // Por ora, simula distribuição bem-sucedida
    outboundA.status = EscrowStatus.DISTRIBUTED;
    outboundB.status = EscrowStatus.DISTRIBUTED;
    await this.escrowRepo.save([outboundA, outboundB]);

    // Atualizar status do match
    match.status = OrderStatus.COMPLETED;
    await this.matchRepo.save(match);

    this.logger.log(`Distribuição concluída para match ${match.id}`);
  }

  /**
   * Refund: devolve tokens depositados em caso de timeout ou cancelamento.
   */
  async refund(match: SwapMatch): Promise<void> {
    const escrowAddress = this.getEscrowAddress(match.chain);

    const confirmedDeposits = await this.escrowRepo.find({
      where: {
        matchId: match.id,
        direction: TransactionDirection.INBOUND,
        status: EscrowStatus.DEPOSIT_CONFIRMED,
      },
    });

    for (const deposit of confirmedDeposits) {
      const refundTx = this.escrowRepo.create({
        matchId: match.id,
        fromAddress: escrowAddress,
        toAddress: deposit.fromAddress,
        token: deposit.token,
        tokenSymbol: deposit.tokenSymbol,
        amount: deposit.amount,
        chain: match.chain,
        status: EscrowStatus.REFUNDED,
        direction: TransactionDirection.OUTBOUND,
      });

      await this.escrowRepo.save(refundTx);
    }

    match.status = OrderStatus.CANCELLED;
    await this.matchRepo.save(match);

    this.logger.log(`Refund concluído para match ${match.id}`);
  }

  /**
   * Retorna o endereço da hot wallet de escrow para a chain.
   */
  private getEscrowAddress(chain: Chain): string {
    const envMap: Record<string, string> = {
      [Chain.ETHEREUM]: 'ESCROW_ETHEREUM_ADDRESS',
      [Chain.POLYGON]: 'ESCROW_POLYGON_ADDRESS',
      [Chain.ARBITRUM]: 'ESCROW_ARBITRUM_ADDRESS',
      [Chain.BSC]: 'ESCROW_BSC_ADDRESS',
      [Chain.SOLANA]: 'ESCROW_SOLANA_ADDRESS',
    };
    return this.config.get<string>(envMap[chain] ?? '', '0x0000000000000000000000000000000000000000');
  }
}
