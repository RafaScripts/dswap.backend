import { registerAs } from '@nestjs/config';

export default registerAs('coinmarketcap', () => ({
  apiKey: process.env.CMC_API_KEY ?? '',
  baseUrl: process.env.CMC_BASE_URL ?? 'https://pro-api.coinmarketcap.com',
}));
