import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminReportsService } from './admin-reports.service';
import { AdminAuthGuard } from '../common/guards';

@ApiTags('Admin Reports')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get('routes')
  @ApiOperation({ summary: 'Quantidade de consultas e respostas por rota' })
  @ApiResponse({ status: 200, description: 'Metricas por rota' })
  getRouteMetrics() {
    return this.reportsService.getRouteMetrics();
  }

  @Get('volume/total')
  @ApiOperation({ summary: 'Valor movimentado total (USD)' })
  @ApiResponse({ status: 200, description: 'Total movimentado' })
  getTotalMovedUsd() {
    return this.reportsService.getTotalMovedUsd();
  }

  @Get('volume/by-token')
  @ApiOperation({ summary: 'Valor movimentado total por moeda' })
  @ApiResponse({ status: 200, description: 'Total por moeda' })
  getTotalMovedByToken() {
    return this.reportsService.getTotalMovedByToken();
  }

  @Get('fees/total')
  @ApiOperation({ summary: 'Valor total de ganhos em taxa (USD)' })
  @ApiResponse({ status: 200, description: 'Total de taxas' })
  getTotalFeesUsd() {
    return this.reportsService.getTotalFeesUsd();
  }

  @Get('fees/by-swap')
  @ApiOperation({ summary: 'Valor total de ganhos em taxa por trocas' })
  @ApiResponse({ status: 200, description: 'Taxas por troca' })
  getFeesBySwap() {
    return this.reportsService.getFeesBySwap();
  }
}
