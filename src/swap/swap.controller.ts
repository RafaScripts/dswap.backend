import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SwapService } from './swap.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ConfirmSwapDto } from './dto/confirm-swap.dto';
import { SwapOrder } from './entities/swap-order.entity';
import { SwapMatch } from './entities/swap-match.entity';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Swap')
@ApiBearerAuth()
@Controller('swap')
export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  /**
   * Cria uma nova ordem de swap.
   * Se houver uma ordem complementar disponível, o match é feito automaticamente.
   * Caso contrário, a ordem fica aberta aguardando um match futuro.
   */
  @Post('orders')
  @ApiOperation({
    summary: 'Criar nova ordem de swap',
    description:
      'Cria uma nova ordem especificando o token oferecido e o token desejado. ' +
      'O sistema tenta encontrar um match automaticamente (mesma chain, tokens complementares, ' +
      'quantidades compatíveis com tolerância de ±2%). Se encontrado, ambos são notificados via WebSocket. ' +
      'Por padrão, a ordem expira em 60 minutos.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Ordem criada com sucesso', type: SwapOrder })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async createOrder(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
  ): Promise<SwapOrder> {
    return this.swapService.createOrder(user.sub, dto);
  }

  /**
   * Lista todas as ordens do usuário autenticado (qualquer status).
   */
  @Get('orders')
  @ApiOperation({
    summary: 'Listar ordens do usuário',
    description:
      'Retorna todas as ordens criadas pelo usuário autenticado, ' +
      'ordenadas por data de criação (mais recente primeiro). ' +
      'Inclui ordens em qualquer status (OPEN, MATCHED, COMPLETED, CANCELLED, etc).',
  })
  @ApiResponse({ status: 200, description: 'Lista de ordens', type: [SwapOrder] })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getUserOrders(@CurrentUser() user: JwtPayload): Promise<SwapOrder[]> {
    return this.swapService.getUserOrders(user.sub);
  }

  /**
   * Lista todas as ordens abertas de todos os usuários.
   * Útil para o usuário navegar pelas ordens disponíveis e potencialmente enviar uma ordem complementar.
   */
  @Get('orders/open')
  @ApiOperation({
    summary: 'Listar todas as ordens abertas',
    description:
      'Retorna todas as ordens com status OPEN de todos os usuários. ' +
      'Permite que o usuário navegue pelas oportunidades de swap disponíveis ' +
      'e crie uma ordem complementar para fazer match.',
  })
  @ApiResponse({ status: 200, description: 'Lista de ordens abertas', type: [SwapOrder] })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getOpenOrders(): Promise<SwapOrder[]> {
    return this.swapService.getOpenOrders();
  }

  /**
   * Cancela uma ordem aberta do usuário.
   * Apenas ordens com status OPEN podem ser canceladas.
   */
  @Delete('orders/:id')
  @ApiOperation({
    summary: 'Cancelar ordem aberta',
    description:
      'Cancela uma ordem que ainda está com status OPEN. ' +
      'Ordens que já estão matched ou em processo de escrow não podem ser canceladas por aqui ' +
      '(use /swap/matches/:id/cancel para cancelar matches).',
  })
  @ApiParam({ name: 'id', description: 'ID da ordem (UUID)', example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @ApiResponse({ status: 200, description: 'Ordem cancelada com sucesso' })
  @ApiResponse({ status: 400, description: 'Ordem não está no status OPEN' })
  @ApiResponse({ status: 403, description: 'Não autorizado a cancelar esta ordem' })
  @ApiResponse({ status: 404, description: 'Ordem não encontrada' })
  async cancelOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.swapService.cancelOrder(user.sub, id);
  }

  /**
   * Retorna os detalhes de um match, incluindo ordens, contraparte, taxas, e status do escrow.
   */
  @Get('matches/:id')
  @ApiOperation({
    summary: 'Detalhes de um match',
    description:
      'Retorna todos os detalhes de um match: ordens de ambos os lados, ' +
      'detalhamento de taxas (feeBreakdown), status de confirmação de cada lado, ' +
      'e transações de escrow associadas. Apenas os dois participantes do match podem acessar.',
  })
  @ApiParam({ name: 'id', description: 'ID do match (UUID)' })
  @ApiResponse({ status: 200, description: 'Detalhes do match', type: SwapMatch })
  @ApiResponse({ status: 403, description: 'Não autorizado a ver este match' })
  @ApiResponse({ status: 404, description: 'Match não encontrado' })
  async getMatchDetails(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<SwapMatch> {
    return this.swapService.getMatchDetails(user.sub, id);
  }

  /**
   * Confirma os termos de um match (aceitar taxas e quantidades).
   * Quando ambos os participantes confirmam, o escrow é criado automaticamente.
   */
  @Post('matches/:id/confirm')
  @ApiOperation({
    summary: 'Confirmar termos do match',
    description:
      'Confirma que o usuário aceita os termos do match (quantidades, taxas, gas estimado). ' +
      'Cada participante confirma individualmente. Quando ambos confirmam, o status avança para ' +
      'CONFIRMED e o escrow é criado automaticamente, com instruções de depósito enviadas via WebSocket.',
  })
  @ApiParam({ name: 'id', description: 'ID do match (UUID)' })
  @ApiBody({ type: ConfirmSwapDto, required: false })
  @ApiResponse({ status: 200, description: 'Confirmação registrada', type: SwapMatch })
  @ApiResponse({ status: 400, description: 'Match não está no status correto' })
  @ApiResponse({ status: 403, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Match não encontrado' })
  async confirmMatch(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<SwapMatch> {
    return this.swapService.confirmMatch(user.sub, id);
  }

  /**
   * Cancela/rejeita um match. Se já houve depósitos, o refund é processado automaticamente.
   */
  @Post('matches/:id/cancel')
  @ApiOperation({
    summary: 'Cancelar/rejeitar match',
    description:
      'Cancela um match ativo. Se o match está em status MATCHED, simplesmente cancela. ' +
      'Se já está em CONFIRMED ou DEPOSITED (houve depósitos no escrow), o sistema processa ' +
      'refund automático dos tokens depositados. As ordens originais são reabertas. ' +
      'O counterparty é notificado via WebSocket.',
  })
  @ApiParam({ name: 'id', description: 'ID do match (UUID)' })
  @ApiResponse({ status: 200, description: 'Match cancelado com sucesso' })
  @ApiResponse({ status: 400, description: 'Match já foi completado' })
  @ApiResponse({ status: 403, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Match não encontrado' })
  async cancelMatch(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.swapService.cancelMatch(user.sub, id);
  }

  /**
   * Status atual do escrow de um match (transações de depósito e distribuição).
   */
  @Get('matches/:id/status')
  @ApiOperation({
    summary: 'Status do escrow',
    description:
      'Retorna o status atual do escrow de um match, incluindo todas as transações ' +
      'de depósito (INBOUND) e distribuição (OUTBOUND). Mostra confirmações on-chain, ' +
      'hashes de transação, e status individual de cada escrow transaction.',
  })
  @ApiParam({ name: 'id', description: 'ID do match (UUID)' })
  @ApiResponse({ status: 200, description: 'Status do match com escrow transactions', type: SwapMatch })
  @ApiResponse({ status: 403, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Match não encontrado' })
  async getMatchStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<SwapMatch> {
    return this.swapService.getMatchDetails(user.sub, id);
  }
}
