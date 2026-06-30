import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey } from '@solana/web3.js';
import { TokenBalanceDto } from '../dto/portfolio-response.dto';

// SPL Token Program ID
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

@Injectable()
export class SolanaBalanceProvider {
  private readonly logger = new Logger(SolanaBalanceProvider.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Obtém balance nativo (SOL) e SPL tokens de um endereço Solana.
   */
  async getBalances(address: string): Promise<TokenBalanceDto[]> {
    const rpcUrl = this.config.get<string>('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com');
    const connection = new Connection(rpcUrl);
    const publicKey = new PublicKey(address);

    const balances: TokenBalanceDto[] = [];

    try {
      balances.push(...await this.fetchBalancesFromConnection(connection, publicKey));
    } catch (error) {
      this.logger.warn(`Erro na RPC principal Solana para ${address}. Tentando fallback...`);
      
      const tatumApiKey = this.config.get<string>('TATUM_API_KEY');
      if (tatumApiKey) {
        try {
          const fallbackConnection = new Connection('https://solana-mainnet.gateway.tatum.io', {
            httpHeaders: {
              'x-api-key': tatumApiKey,
            }
          });
          balances.push(...await this.fetchBalancesFromConnection(fallbackConnection, publicKey));
        } catch (fallbackError) {
          this.logger.error(`Erro no fallback Solana para ${address}`, fallbackError);
        }
      } else {
        this.logger.error(`Sem TATUM_API_KEY para fallback Solana. Erro original:`, error);
      }
    }

    return balances;
  }

  private async fetchBalancesFromConnection(connection: Connection, publicKey: PublicKey): Promise<TokenBalanceDto[]> {
    const balances: TokenBalanceDto[] = [];

    // 1. SOL nativo
    const solBalance = await connection.getBalance(publicKey);
    if (solBalance > 0) {
      balances.push({
        token: 'NATIVE',
        symbol: 'SOL',
        name: 'Solana',
        balance: (solBalance / 1e9).toString(),
        decimals: 9,
      });
    }

    // 2. SPL tokens
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });

    for (const account of tokenAccounts.value) {
      const parsed = account.account.data.parsed;
      const info = parsed.info;
      const amount = info.tokenAmount;

      if (Number(amount.uiAmount) > 0) {
        balances.push({
          token: info.mint,
          symbol: '', // Será preenchido pelo portfolio service com dados de mercado
          name: '',
          balance: amount.uiAmountString,
          decimals: amount.decimals,
        });
      }
    }

    return balances;
  }

}
