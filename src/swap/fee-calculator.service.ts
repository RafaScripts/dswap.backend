import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwapOrder } from './entities/swap-order.entity';
import { FeeBreakdownJson } from './entities/swap-match.entity';

@Injectable()
export class FeeCalculatorService {
  private readonly logger = new Logger(FeeCalculatorService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Calcula as taxas de swap para ambos os lados.
   *
   * Taxa base: configurável via env SWAP_FEE_PERCENTAGE (padrão 0.5%)
   *
   * Exemplo:
   * - User A envia 1000 USDC, fee = 5 USDC → User B recebe 995 USDC
   * - User B envia 0.5 ETH, fee = 0.0025 ETH → User A recebe 0.4975 ETH
   */
  async calculateFees(orderA: SwapOrder, orderB: SwapOrder): Promise<FeeBreakdownJson> {
    const feePercentage = this.config.get<number>('SWAP_FEE_PERCENTAGE', 0.5);

    const userAFee = (Number(orderA.offerAmount) * feePercentage) / 100;
    const userBFee = (Number(orderB.offerAmount) * feePercentage) / 100;

    // Calcular USD (usando offerAmountUsd se disponível, senão aproxima)
    const userAFeeUsd = orderA.offerAmountUsd
      ? ((Number(orderA.offerAmountUsd) * feePercentage) / 100).toFixed(2)
      : '0';
    const userBFeeUsd = orderB.offerAmountUsd
      ? ((Number(orderB.offerAmountUsd) * feePercentage) / 100).toFixed(2)
      : '0';

    // Gas estimado (placeholder — em produção seria via estimateGas RPC)
    const estimatedGasA = '0.005';
    const estimatedGasB = '0.005';

    this.logger.log(
      `Fees calculadas: ${feePercentage}% — User A fee: ${userAFee}, User B fee: ${userBFee}`,
    );

    return {
      feePercentage,
      userAFeeAmount: userAFee.toString(),
      userAFeeUsd,
      userBFeeAmount: userBFee.toString(),
      userBFeeUsd,
      estimatedGasA,
      estimatedGasB,
    };
  }

  /**
   * Subtrai fee de um amount.
   */
  subtractFee(amount: string, feePercentage: number): string {
    const num = Number(amount);
    const fee = (num * feePercentage) / 100;
    return (num - fee).toString();
  }
}
