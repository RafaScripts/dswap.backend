import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Chain } from '../../common/types/chain.enum';
import { TokenBalanceDto } from '../dto/portfolio-response.dto';
import { createPublicClient, http, fallback, erc20Abi, formatUnits, type PublicClient } from 'viem';
import { mainnet, polygon, arbitrum, bsc, gnosis, polygonAmoy, sepolia, gnosisChiado } from 'viem/chains';

/**
 * Lista mínima de tokens ERC-20 populares para consulta.
 * Em produção, isso seria alimentado por uma API de token list (1inch, CoinGecko, etc.).
 */
const KNOWN_TOKENS: Record<string, Array<{ address: `0x${string}`; symbol: string; name: string; decimals: number }>> = {
  [Chain.ETHEREUM]: [
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
  ],
  [Chain.POLYGON]: [
    { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  ],
  [Chain.ARBITRUM]: [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  ],
  [Chain.BSC]: [
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18 },
    { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18 },
  ],
  [Chain.GNOSIS]: [],
  [Chain.POLYGON_AMOY]: [],
  [Chain.SEPOLIA]: [],
  [Chain.GNOSIS_CHIADO]: [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CHAIN_MAP: Record<string, any> = {
  [Chain.ETHEREUM]: mainnet,
  [Chain.POLYGON]: polygon,
  [Chain.ARBITRUM]: arbitrum,
  [Chain.BSC]: bsc,
  [Chain.GNOSIS]: gnosis,
  [Chain.POLYGON_AMOY]: polygonAmoy,
  [Chain.SEPOLIA]: sepolia,
  [Chain.GNOSIS_CHIADO]: gnosisChiado,
};

const NATIVE_SYMBOLS: Record<string, { symbol: string; name: string; decimals: number }> = {
  [Chain.ETHEREUM]: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  [Chain.POLYGON]: { symbol: 'POL', name: 'Polygon', decimals: 18 },
  [Chain.ARBITRUM]: { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  [Chain.BSC]: { symbol: 'BNB', name: 'BNB', decimals: 18 },
  [Chain.GNOSIS]: { symbol: 'xDAI', name: 'xDAI', decimals: 18 },
  [Chain.POLYGON_AMOY]: { symbol: 'POL', name: 'Polygon', decimals: 18 },
  [Chain.SEPOLIA]: { symbol: 'ETH', name: 'Ethereum Sepolia', decimals: 18 },
  [Chain.GNOSIS_CHIADO]: { symbol: 'xDAI', name: 'xDAI Chiado', decimals: 18 },
};

@Injectable()
export class EvmBalanceProvider {
  private readonly logger = new Logger(EvmBalanceProvider.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Obtém balances nativos e ERC-20 de um endereço em uma chain EVM.
   * Usa viem multicall para eficiência.
   */
  async getBalances(address: string, chain: Chain): Promise<TokenBalanceDto[]> {
    const rpcUrl = this.getRpcUrl(chain);
    const tatumFallbackUrl = this.getTatumFallbackUrl(chain);
    const tatumApiKey = this.config.get<string>('TATUM_API_KEY');
    const viemChain = CHAIN_MAP[chain];
    if (!viemChain) return [];

    const transports = [http(rpcUrl)];
    if (tatumFallbackUrl && tatumApiKey) {
      transports.push(
        http(tatumFallbackUrl, {
          fetchOptions: {
            headers: {
              'x-api-key': tatumApiKey,
            },
          },
        })
      );
    }

    const client = createPublicClient({
      chain: viemChain,
      transport: fallback(transports),
    });

    const balances: TokenBalanceDto[] = [];

    try {
      // 1. Balance nativo
      const nativeBal = await client.getBalance({ address: address as `0x${string}` });
      const nativeInfo = NATIVE_SYMBOLS[chain];
      if (nativeInfo && nativeBal > 0n) {
        balances.push({
          token: 'NATIVE',
          symbol: nativeInfo.symbol,
          name: nativeInfo.name,
          balance: formatUnits(nativeBal, nativeInfo.decimals),
          decimals: nativeInfo.decimals,
        });
      }

      // 2. ERC-20 balances via multicall
      const tokens = KNOWN_TOKENS[chain] ?? [];
      if (tokens.length > 0) {
        const results = await (client as unknown as PublicClient).multicall({
          contracts: tokens.map((token) => ({
            address: token.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          })),
        });

        results.forEach((result, index) => {
          if (result.status === 'success' && (result.result as bigint) > 0n) {
            const token = tokens[index];
            balances.push({
              token: token.address,
              symbol: token.symbol,
              name: token.name,
              balance: formatUnits(result.result as bigint, token.decimals),
              decimals: token.decimals,
            });
          }
        });
      }
    } catch (error) {
      this.logger.error(`Erro ao obter balances EVM para ${address} na chain ${chain}`, error);
    }

    return balances;
  }

  private getRpcUrl(chain: Chain): string {
    const envMap: Record<string, string> = {
      [Chain.ETHEREUM]: 'ETHEREUM_RPC_URL',
      [Chain.POLYGON]: 'POLYGON_RPC_URL',
      [Chain.ARBITRUM]: 'ARBITRUM_RPC_URL',
      [Chain.BSC]: 'BSC_RPC_URL',
      [Chain.GNOSIS]: 'GNOSIS_RPC_URL',
      [Chain.POLYGON_AMOY]: 'POLYGON_AMOY_RPC_URL',
      [Chain.SEPOLIA]: 'SEPOLIA_RPC_URL',
      [Chain.GNOSIS_CHIADO]: 'GNOSIS_CHIADO_RPC_URL',
    };
    
    const fallbackUrls: Record<string, string> = {
      [Chain.ETHEREUM]: 'https://eth.llamarpc.com',
      [Chain.POLYGON]: 'https://polygon.llamarpc.com',
      [Chain.ARBITRUM]: 'https://arbitrum.llamarpc.com',
      [Chain.BSC]: 'https://binance.llamarpc.com',
      [Chain.GNOSIS]: 'https://rpc.gnosischain.com',
      [Chain.POLYGON_AMOY]: 'https://rpc-amoy.polygon.technology',
      [Chain.SEPOLIA]: 'https://rpc.sepolia.org',
      [Chain.GNOSIS_CHIADO]: 'https://rpc.chiadochain.net',
    };

    return this.config.get<string>(envMap[chain] ?? '', fallbackUrls[chain] ?? fallbackUrls[Chain.POLYGON]);
  }

  private getTatumFallbackUrl(chain: Chain): string | null {
    const tatumUrls: Record<string, string> = {
      [Chain.ETHEREUM]: 'https://ethereum-mainnet.gateway.tatum.io',
      [Chain.POLYGON]: 'https://polygon-mainnet.gateway.tatum.io',
      [Chain.ARBITRUM]: 'https://arbitrum-one-mainnet.gateway.tatum.io',
      [Chain.BSC]: 'https://bsc-mainnet.gateway.tatum.io',
      [Chain.GNOSIS]: 'https://gnosis-mainnet.gateway.tatum.io',
    };
    return tatumUrls[chain] ?? null;
  }
}
