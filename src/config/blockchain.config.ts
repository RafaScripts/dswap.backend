import { registerAs } from '@nestjs/config';
import { Chain } from '../common/types/chain.enum';

export default registerAs('blockchain', () => ({
  rpcUrls: {
    [Chain.ETHEREUM]: process.env.ETHEREUM_RPC_URL ?? 'https://eth-mainnet.g.alchemy.com/v2/demo',
    [Chain.POLYGON]: process.env.POLYGON_RPC_URL ?? 'https://polygon-mainnet.g.alchemy.com/v2/demo',
    [Chain.ARBITRUM]: process.env.ARBITRUM_RPC_URL ?? 'https://arb-mainnet.g.alchemy.com/v2/demo',
    [Chain.BSC]: process.env.BSC_RPC_URL ?? 'https://bsc-dataseed.binance.org',
    [Chain.SOLANA]: process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com',
  },
  escrowAddresses: {
    [Chain.ETHEREUM]: process.env.ESCROW_ETHEREUM_ADDRESS ?? '',
    [Chain.POLYGON]: process.env.ESCROW_POLYGON_ADDRESS ?? '',
    [Chain.ARBITRUM]: process.env.ESCROW_ARBITRUM_ADDRESS ?? '',
    [Chain.BSC]: process.env.ESCROW_BSC_ADDRESS ?? '',
    [Chain.SOLANA]: process.env.ESCROW_SOLANA_ADDRESS ?? '',
  },
  minConfirmations: {
    evm: parseInt(process.env.SWAP_MIN_CONFIRMATIONS_EVM ?? '3', 10),
    solana: parseInt(process.env.SWAP_MIN_CONFIRMATIONS_SOLANA ?? '1', 10),
  },
}));
