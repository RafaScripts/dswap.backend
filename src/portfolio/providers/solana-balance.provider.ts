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
    } catch (error) {
      this.logger.error(`Erro ao obter balances Solana para ${address}`, error);
    }

    return balances;
  }
}
