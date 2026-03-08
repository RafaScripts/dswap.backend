import { Injectable, Logger } from '@nestjs/common';
import { Chain } from '../common/types/chain.enum';
import { EvmBalanceProvider } from './providers/evm-balance.provider';
import { SolanaBalanceProvider } from './providers/solana-balance.provider';
import { PortfolioResponseDto, TokenBalanceDto } from './dto/portfolio-response.dto';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    private readonly evmProvider: EvmBalanceProvider,
    private readonly solanaProvider: SolanaBalanceProvider,
  ) {}

  /**
   * Agrega balances de um endereço em uma chain específica.
   * Combina balances on-chain com dados de preço (futuramente via MarketService).
   */
  async getPortfolio(address: string, chain: Chain): Promise<PortfolioResponseDto> {
    let tokens: TokenBalanceDto[];

    if (chain === Chain.SOLANA) {
      tokens = await this.solanaProvider.getBalances(address);
    } else {
      tokens = await this.evmProvider.getBalances(address, chain);
    }

    // Calcular total USD (quando preços estiverem disponíveis)
    const totalUsd = tokens.reduce((sum, token) => sum + (token.valueUsd ?? 0), 0);

    this.logger.log(`Portfolio para ${address}@${chain}: ${tokens.length} tokens, $${totalUsd.toFixed(2)}`);

    return {
      totalUsd,
      chain,
      tokens,
    };
  }

  /**
   * Agrega balances de todas as chains de um endereço.
   * Usado para portfolio consolidado.
   */
  async getFullPortfolio(address: string): Promise<PortfolioResponseDto[]> {
    const evmChains = [Chain.ETHEREUM, Chain.POLYGON, Chain.ARBITRUM, Chain.BSC];

    const results = await Promise.allSettled([
      ...evmChains.map((chain) => this.getPortfolio(address, chain)),
      this.getPortfolio(address, Chain.SOLANA),
    ]);

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<PortfolioResponseDto>).value)
      .filter((p) => p.tokens.length > 0);
  }
}
