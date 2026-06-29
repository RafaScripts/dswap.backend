import { Injectable, Logger } from '@nestjs/common';
import { Chain } from '../common/types/chain.enum';
import { EvmBalanceProvider } from './providers/evm-balance.provider';
import { SolanaBalanceProvider } from './providers/solana-balance.provider';
import { PortfolioResponseDto, TokenBalanceDto } from './dto/portfolio-response.dto';
import { MarketService } from '../market/market.service';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    private readonly evmProvider: EvmBalanceProvider,
    private readonly solanaProvider: SolanaBalanceProvider,
    private readonly marketService: MarketService,
  ) { }

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

    try {
      const symbolsToFetch = Array.from(new Set(tokens.map(t => t.symbol))).join(',');
      if (symbolsToFetch.length > 0) {
        const quotes: any = await this.marketService.getQuotes(undefined, symbolsToFetch, 'USD');
        const quotesData = quotes?.data || {};

        for (const token of tokens) {
          const coinData = Object.values(quotesData).find((c: any) => c.symbol === token.symbol) as any;
          if (coinData && coinData.quote?.USD?.price) {
            token.valueUsd = parseFloat(token.balance) * coinData.quote.USD.price;
          } else {
            token.valueUsd = 0;
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Falha ao buscar preços para tokens do portfolio: ${err}`);
      tokens.forEach(t => t.valueUsd = 0);
    }

    // Calcular total USD
    const initialTotalUsd = tokens.reduce((sum, token) => sum + (token.valueUsd ?? 0), 0);

    // MOCK para testes locais (se a carteira estiver vazia e for ambiente de dev)
    if (tokens.length <= 1 && initialTotalUsd === 0 && process.env.NODE_ENV === 'development') {
      tokens.push({
        token: 'MOCK_ETH',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: '2.5',
        decimals: 18,
        valueUsd: 2.5 * 3000
      });
      tokens.push({
        token: 'MOCK_USDC',
        symbol: 'USDC',
        name: 'USD Coin',
        balance: '1500',
        decimals: 6,
        valueUsd: 1500
      });
      tokens.push({
        token: 'MOCK_BTC',
        symbol: 'BTC',
        name: 'Bitcoin',
        balance: '0.15',
        decimals: 8,
        valueUsd: 0.15 * 60000
      });
      tokens.push({
        token: 'MOCK_USDT',
        symbol: 'USDT',
        name: 'Tether',
        balance: '5000',
        decimals: 6,
        valueUsd: 5000
      })
    }

    const finalTotalUsd = tokens.reduce((sum, token) => sum + (token.valueUsd ?? 0), 0);
    this.logger.log(`Portfolio para ${address}@${chain}: ${tokens.length} tokens, $${finalTotalUsd.toFixed(2)}`);

    return {
      totalUsd: finalTotalUsd,
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
