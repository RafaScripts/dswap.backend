import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('CMC_API_KEY', '');
    this.baseUrl = this.config.get<string>('CMC_BASE_URL', 'https://pro-api.coinmarketcap.com');
  }

  /**
   * Obtém cotações atuais de criptomoedas por IDs ou symbols.
   * Cache TTL: 60 segundos
   */
  async getQuotes(ids?: string, symbols?: string, convert = 'USD'): Promise<unknown> {
    // A API do CoinMarketCap exige pelo menos `id` ou `symbol`.
    // Se nenhum for passado, retornamos alguns tokens populares por padrão para evitar erro 400.
    if (!ids && !symbols) {
      symbols = 'BTC,ETH,SOL,BNB,USDC,USDT,POL,ARB';
    }

    const params: Record<string, string> = { convert };
    if (ids) params.id = ids;
    if (symbols) params.symbol = symbols;

    const cacheKey = `quotes:${ids ?? ''}:${symbols ?? ''}:${convert}`;
    return this.cachedRequest(cacheKey, '/v1/cryptocurrency/quotes/latest', params, 60_000);
  }

  /**
   * Obtém cotações históricas de uma criptomoeda.
   * Cache TTL: 300 segundos
   */
  async getHistoricalQuotes(id: string, range = '7d', convert = 'USD'): Promise<unknown> {
    const params: Record<string, string> = { id, time_period: range, convert };
    const cacheKey = `quotes-historical:${id}:${range}:${convert}`;
    return this.cachedRequest(cacheKey, '/v1/cryptocurrency/quotes/historical', params, 300_000);
  }

  /**
   * Obtém dados OHLCV (candlestick) de uma criptomoeda.
   * Cache TTL: 300 segundos
   */
  async getOhlcv(id: string, convert = 'USD'): Promise<unknown> {
    const params: Record<string, string> = { id, convert };
    const cacheKey = `ohlcv:${id}:${convert}`;
    return this.cachedRequest(cacheKey, '/v1/cryptocurrency/ohlcv/latest', params, 300_000);
  }

  /**
   * Obtém métricas globais do mercado (market cap total, dominância BTC, etc.).
   * Cache TTL: 120 segundos
   */
  async getGlobalMetrics(convert = 'USD'): Promise<unknown> {
    const params: Record<string, string> = { convert };
    const cacheKey = `global:${convert}`;
    return this.cachedRequest(cacheKey, '/v1/global-metrics/quotes/latest', params, 120_000);
  }

  /**
   * Obtém tokens em alta (trending/gainers).
   * Cache TTL: 120 segundos
   */
  async getTrending(limit = 10, timeWindow = '24h', convert = 'USD'): Promise<unknown> {
    const params: Record<string, string> = {
      limit: String(limit),
      time_period: timeWindow,
      convert,
      sort: 'percent_change_24h',
      sort_dir: 'desc',
    };
    const cacheKey = `trending:${limit}:${timeWindow}:${convert}`;
    return this.cachedRequest(cacheKey, '/v1/cryptocurrency/listings/latest', params, 120_000);
  }

  /**
   * Busca criptomoedas por nome ou symbol.
   * Cache TTL: 60 segundos
   */
  async search(query: string): Promise<unknown> {
    const cacheKey = `search:${query.toLowerCase()}`;
    const params: Record<string, string> = { query };
    // Usa o endpoint de map com busca
    return this.cachedRequest(cacheKey, '/v1/cryptocurrency/map', params, 60_000);
  }

  /**
   * Obtém metadados de uma criptomoeda (logo, descrição, links, etc.).
   * Cache TTL: 3600 segundos (1 hora)
   */
  async getMetadata(id: string): Promise<unknown> {
    const cacheKey = `metadata:${id}`;
    const params: Record<string, string> = { id };
    return this.cachedRequest(cacheKey, '/v2/cryptocurrency/info', params, 3_600_000);
  }

  /**
   * Helper genérico: verifica cache, se não tiver faz request ao CMC e armazena.
   */
  private async cachedRequest(
    cacheKey: string,
    path: string,
    params: Record<string, string>,
    ttl: number,
  ): Promise<unknown> {
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss: ${cacheKey}, fetching from CMC`);

    const response = await firstValueFrom(
      this.http.get(`${this.baseUrl}${path}`, {
        params,
        headers: { 'X-CMC_PRO_API_KEY': this.apiKey },
      }),
    );

    const data = response.data;
    await this.cache.set(cacheKey, data, ttl);

    return data;
  }
}
