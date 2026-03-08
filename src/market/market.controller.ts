import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MarketService } from './market.service';
import { QuotesQueryDto } from './dto/quotes-query.dto';
import { TrendingQueryDto } from './dto/trending-query.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Market')
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  /**
   * Retorna cotações atuais de criptomoedas.
   * Pode filtrar por IDs CMC ou symbols. Dados cacheados por 60 segundos.
   */
  @Public()
  @Get('quotes')
  @ApiOperation({
    summary: 'Cotações atuais de criptomoedas',
    description:
      'Proxy para CoinMarketCap `/v1/cryptocurrency/quotes/latest`. ' +
      'Retorna preço, market cap, volume e variações. ' +
      'Resultados cacheados por 60 segundos no Redis. ' +
      'Filtre por `ids` (IDs do CMC) ou `symbols` (ex: BTC,ETH).',
  })
  @ApiResponse({ status: 200, description: 'Cotações retornadas com sucesso' })
  async getQuotes(@Query() query: QuotesQueryDto) {
    return this.marketService.getQuotes(query.ids, query.symbols, query.convert);
  }

  /**
   * Retorna cotações históricas de uma criptomoeda.
   * Aceita ranges como 7d, 30d, 90d. Cache por 5 minutos.
   */
  @Public()
  @Get('quotes/historical')
  @ApiOperation({
    summary: 'Cotações históricas',
    description:
      'Proxy para CoinMarketCap. Retorna histórico de preços para um token específico. ' +
      'Útil para gráficos de variação. Cache TTL: 300 segundos.',
  })
  @ApiQuery({ name: 'id', required: true, description: 'ID do CoinMarketCap', example: '1' })
  @ApiQuery({ name: 'range', required: false, description: 'Período (7d, 30d, 90d)', example: '7d' })
  @ApiQuery({ name: 'convert', required: false, description: 'Moeda de conversão', example: 'USD' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  async getHistoricalQuotes(
    @Query('id') id: string,
    @Query('range') range?: string,
    @Query('convert') convert?: string,
  ) {
    return this.marketService.getHistoricalQuotes(id, range, convert);
  }

  /**
   * Retorna dados OHLCV (candlestick) de uma criptomoeda.
   * Ideal para mostrar gráficos de velas. Cache por 5 minutos.
   */
  @Public()
  @Get('ohlcv/:id')
  @ApiOperation({
    summary: 'Dados OHLCV (candlestick)',
    description:
      'Retorna dados de abertura, máxima, mínima, fechamento e volume (OHLCV) ' +
      'para uma criptomoeda específica. Ideal para rendering de gráficos de velas. ' +
      'Cache TTL: 300 segundos.',
  })
  @ApiParam({ name: 'id', description: 'ID do CoinMarketCap', example: '1' })
  @ApiResponse({ status: 200, description: 'Dados OHLCV retornados' })
  async getOhlcv(@Param('id') id: string, @Query('convert') convert?: string) {
    return this.marketService.getOhlcv(id, convert);
  }

  /**
   * Retorna métricas globais do mercado de criptomoedas.
   * Inclui market cap total, dominância BTC, volume 24h. Cache por 2 minutos.
   */
  @Public()
  @Get('global')
  @ApiOperation({
    summary: 'Métricas globais do mercado',
    description:
      'Retorna métricas globais como market cap total, dominância do Bitcoin, ' +
      'volume total 24h, e quantidade de criptomoedas ativas. ' +
      'Cache TTL: 120 segundos.',
  })
  @ApiResponse({ status: 200, description: 'Métricas globais retornadas' })
  async getGlobalMetrics(@Query('convert') convert?: string) {
    return this.marketService.getGlobalMetrics(convert);
  }

  /**
   * Retorna tokens em alta (maiores valorização em 24h).
   * Pode limitar resultados e ajustar janela de tempo. Cache por 2 minutos.
   */
  @Public()
  @Get('trending')
  @ApiOperation({
    summary: 'Tokens em alta (trending)',
    description:
      'Retorna as criptomoedas com maiores ganhos percentuais no período selecionado. ' +
      'Ordenado por variação percentual em 24h (descendente). ' +
      'Cache TTL: 120 segundos.',
  })
  @ApiResponse({ status: 200, description: 'Lista de trending tokens' })
  async getTrending(@Query() query: TrendingQueryDto) {
    return this.marketService.getTrending(query.limit, query.timeWindow);
  }

  /**
   * Busca criptomoedas por nome ou symbol.
   * Útil para autocomplete no app. Cache por 60 segundos.
   */
  @Public()
  @Get('search')
  @ApiOperation({
    summary: 'Buscar criptomoedas',
    description:
      'Busca tokens por nome ou símbolo. Ideal para funcionalidade de autocomplete/search ' +
      'no app. Retorna ID, nome, símbolo e rank. Cache TTL: 60 segundos.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Termo de busca', example: 'bitcoin' })
  @ApiResponse({ status: 200, description: 'Resultados da busca' })
  async search(@Query('q') q: string) {
    return this.marketService.search(q);
  }

  /**
   * Retorna metadados de uma criptomoeda (logo, descrição, links, etc.).
   * Dados raramente mudam, cache longo de 1 hora.
   */
  @Public()
  @Get('metadata/:id')
  @ApiOperation({
    summary: 'Metadados de uma criptomoeda',
    description:
      'Retorna informações detalhadas como logo, descrição, website, whitepaper, ' +
      'links de redes sociais, tags e plataformas suportadas. ' +
      'Cache TTL: 3600 segundos (1 hora).',
  })
  @ApiParam({ name: 'id', description: 'ID do CoinMarketCap', example: '1' })
  @ApiResponse({ status: 200, description: 'Metadados retornados' })
  async getMetadata(@Param('id') id: string) {
    return this.marketService.getMetadata(id);
  }
}
