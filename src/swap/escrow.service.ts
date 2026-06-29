import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, createWalletClient, http, formatGwei, parseGwei, parseUnits, erc20Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, polygon, arbitrum, bsc } from 'viem/chains';
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
   * MOCK: Simula depósitos e distribuições para testar localmente sem counterparty real e sem blockchain.
   */
  async simulateMockDeposits(matchId: string): Promise<void> {
    const inboundTxs = await this.escrowRepo.find({
      where: {
        matchId,
        direction: TransactionDirection.INBOUND,
        status: EscrowStatus.AWAITING_DEPOSIT,
      },
    });

    for (const tx of inboundTxs) {
      await this.confirmDeposit(tx.id, '0xmock_deposit_' + Date.now(), 123456, 10);
    }

    const bothConfirmed = await this.areBothDepositsConfirmed(matchId);
    if (bothConfirmed) {
      const match = await this.matchRepo.findOne({
        where: { id: matchId },
        relations: ['orderA', 'orderA.user', 'orderB', 'orderB.user'],
      });
      if (match) {
        await this.distribute(match);
      }
    }
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

    // Execução Otimizada na Blockchain (Hot Wallet)
    if (match.chain !== Chain.SOLANA) {
      try {
        const resultA = await this.executeOptimizedEvmTransfer(
          match.chain,
          match.orderA.wantToken,
          match.orderA.user?.address ?? '',
          netAmountForA,
        );
        if (resultA) outboundA.txHash = resultA.txHash;

        const resultB = await this.executeOptimizedEvmTransfer(
          match.chain,
          match.orderB.wantToken,
          match.orderB.user?.address ?? '',
          netAmountForB,
        );
        if (resultB) outboundB.txHash = resultB.txHash;
      } catch (err) {
        this.logger.error(`Falha no envio da distribuição do Match ${match.id}:`, err);
        throw err;
      }
    }

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

  /**
   * Executa a transferência EVM aplicando lógica otimizada de Gas (Base Fee + Priority Levels Progressivos),
   * utilizando tolerância de falhas, Gas Limit customizado (70k), e conversão de `decimals`.
   */
  private async executeOptimizedEvmTransfer(
    chain: Chain,
    tokenAddress: string,
    toAddress: string,
    amountStr: string,
  ): Promise<{ txHash: string; gasUsed: string } | null> {
    const rpcEnvMap: Record<string, string> = {
      [Chain.ETHEREUM]: 'ETHEREUM_RPC_URL',
      [Chain.POLYGON]: 'POLYGON_RPC_URL',
      [Chain.ARBITRUM]: 'ARBITRUM_RPC_URL',
      [Chain.BSC]: 'BSC_RPC_URL',
    };

    const privateKeyEnvMap: Record<string, string> = {
      [Chain.ETHEREUM]: 'ESCROW_ETHEREUM_PRIVATE_KEY',
      [Chain.POLYGON]: 'ESCROW_POLYGON_PRIVATE_KEY',
      [Chain.ARBITRUM]: 'ESCROW_ARBITRUM_PRIVATE_KEY',
      [Chain.BSC]: 'ESCROW_BSC_PRIVATE_KEY',
    };

    const rpcUrl = this.config.get<string>(rpcEnvMap[chain] ?? '');
    const privateKey = this.config.get<string>(privateKeyEnvMap[chain] ?? '');

    if (process.env.NODE_ENV === 'development' || !rpcUrl || !privateKey) {
      this.logger.warn(`[ESCROW] DEV Mode ou RPC/PK ausentes para ${chain}. Simulando sucesso de Tx (Mock).`);
      return { txHash: '0xmockhash_' + Date.now(), gasUsed: '21000' };
    }

    const publicClient = createPublicClient({ transport: http(rpcUrl) });
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({ account, transport: http(rpcUrl) });

    const isNative = tokenAddress === 'NATIVE';
    const decimals = isNative ? 18 : await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'decimals',
    });

    const amountVal = parseUnits(amountStr, decimals);
    const maxTentativas = 5;

    this.logger.log(`\n============================================================`);
    this.logger.log(`🚀 [ESCROW] INICIANDO TRANSFERÊNCIA OTIMIZADA DE TOKEN`);
    this.logger.log(`   Destino: ${toAddress}`);
    this.logger.log(`   Quantidade: ${amountStr} (Wei/MinVal: ${amountVal})`);
    this.logger.log(`   Chain: ${chain} | Contrato: ${tokenAddress}`);
    this.logger.log(`============================================================\n`);

    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      this.logger.log(`\n------------------------------------------------------------`);
      this.logger.log(`🔄 TENTATIVA ${tentativa}/${maxTentativas}`);
      this.logger.log(`------------------------------------------------------------`);

      try {
        const block = await publicClient.getBlock({ blockTag: 'latest' });
        const baseFeeWei = block.baseFeePerGas ?? 0n;
        const baseFeeGwei = Number(formatGwei(baseFeeWei));

        const niveis = [0.3, 1.0, 2.5, 5.0, 10.0];
        const priorityFeeGwei = niveis[Math.min(tentativa - 1, niveis.length - 1)];
        const maxFeeGwei = baseFeeGwei + priorityFeeGwei;

        const maxPriorityFeePerGas = parseGwei(priorityFeeGwei.toString());
        const maxFeePerGas = parseGwei(maxFeeGwei.toString());
        // GasLimit travado conforme script otimizado original
        const gasLimit = 70000n; 

        this.logger.log(`   💰 RESUMO DAS TAXAS:`);
        this.logger.log(`   Base fee: ${baseFeeGwei.toFixed(2)} Gwei`);
        this.logger.log(`   Priority fee: ${priorityFeeGwei.toFixed(2)} Gwei`);
        this.logger.log(`   Max fee: ${maxFeeGwei.toFixed(2)} Gwei`);
        this.logger.log(`   Gas Limit: ${gasLimit.toString()}\n`);

        let txHash: `0x${string}` | undefined;

        if (isNative) {
          txHash = await walletClient.sendTransaction({
            to: toAddress as `0x${string}`,
            value: amountVal,
            gas: gasLimit,
            maxPriorityFeePerGas,
            maxFeePerGas,
            chain: null as any,
          });
        } else {
          // Send ERC-20
          const { request } = await publicClient.simulateContract({
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [toAddress as `0x${string}`, amountVal],
            account,
            gas: gasLimit,
            maxPriorityFeePerGas,
            maxFeePerGas,
          });
          txHash = await walletClient.writeContract(request);
        }

        this.logger.log(`   ⏳ Aguardando confirmação da transação...`);
        this.logger.log(`      TX Hash: ${txHash}`);

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash! });

        this.logger.log(`\n✅ ✅ ✅ TRANSAÇÃO CONFIRMADA! ✅ ✅ ✅`);
        this.logger.log(`   Hash: ${receipt.transactionHash}`);
        this.logger.log(`   Gas usado: ${receipt.gasUsed.toString()}`);
        this.logger.log(`============================================================\n`);

        return { txHash: receipt.transactionHash, gasUsed: receipt.gasUsed.toString() };
      } catch (error: any) {
        this.logger.error(`\n❌ ERRO na tentativa ${tentativa}:`);
        this.logger.error(`   Mensagem: ${error.message}`);

        if (error.message.includes('nonce too low') || error.message.includes('already known')) {
          this.logger.warn(`   ⚠️ NONCE JÁ USADO - Nova tentativa será feita...`);
          continue;
        }

        if (error.message.includes('replacement fee too low') || error.message.includes('underpriced')) {
          this.logger.warn(`   ⚠️ TAXA DE SUBSTITUIÇÃO MUITO BAIXA`);
          this.logger.warn(`   Aguardando 25s antes de tentar aumento de Priority...`);
          await new Promise(r => setTimeout(r, 25000));
          continue;
        }

        if (error.message.includes('insufficient funds')) {
          this.logger.error('❌ Saldo de GAS da Hot Wallet insuficiente para envio.');
          throw error;
        }
      }
    }

    this.logger.error(`\n❗❗❗ FALHA TOTAL APÓS ${maxTentativas} TENTATIVAS ❗❗❗\n`);
    throw new Error('Falha total no envio da transferência de Escrow');
  }
}
