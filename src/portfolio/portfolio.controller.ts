import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';
import { PortfolioResponseDto } from './dto/portfolio-response.dto';
import { Chain } from '../common/types/chain.enum';

@ApiTags('Portfolio')
@ApiBearerAuth()
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  /**
   * Retorna o portfolio completo de um endereço em uma chain específica.
   * Inclui balances nativos e de tokens com valores em USD.
   */
  @Get(':address')
  @ApiOperation({
    summary: 'Portfolio de um endereço',
    description:
      'Retorna todos os tokens (nativos + ERC-20/SPL) de um endereço em uma chain específica, ' +
      'com balances formatados e valores em USD quando disponíveis. ' +
      'Se `chain` não for especificado, retorna portfolios de todas as chains com balance > 0.',
  })
  @ApiParam({
    name: 'address',
    description: 'Endereço da wallet (EVM hex ou Solana base58)',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @ApiQuery({
    name: 'chain',
    required: false,
    description: 'Chain específica para consultar. Se omitido, retorna todas.',
    enum: Chain,
    example: Chain.ETHEREUM,
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio retornado com sucesso',
    type: PortfolioResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação ausente ou inválido',
  })
  async getPortfolio(
    @Param('address') address: string,
    @Query('chain') chain?: Chain,
  ): Promise<PortfolioResponseDto | PortfolioResponseDto[]> {
    if (chain) {
      return this.portfolioService.getPortfolio(address, chain);
    }
    return this.portfolioService.getFullPortfolio(address);
  }
}
