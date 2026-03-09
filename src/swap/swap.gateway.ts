import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { FeeBreakdownJson } from './entities/swap-match.entity';

export interface MatchFoundPayload {
  matchId: string;
  counterpartyAddress: string;
  feeBreakdown: FeeBreakdownJson;
}

export interface MatchConfirmedPayload {
  matchId: string;
  side: string;
}

export interface DepositReceivedPayload {
  matchId: string;
  side: string;
  txHash: string;
  confirmations: number;
}

export interface SwapCancelledPayload {
  matchId: string;
  reason: string;
}

/**
 * WebSocket Gateway para notificações em tempo real do sistema de swap.
 *
 * ## Eventos emitidos pelo servidor:
 * - `match:found` → `{ matchId, counterpartyAddress, feeBreakdown }`
 * - `match:confirmed` → `{ matchId, side }`
 * - `deposit:received` → `{ matchId, side, txHash, confirmations }`
 * - `swap:processing` → `{ matchId }`
 * - `swap:completed` → `{ matchId, txHashA, txHashB }`
 * - `swap:cancelled` → `{ matchId, reason }`
 * - `swap:refunded` → `{ matchId, txHash }`
 *
 * ## Eventos recebidos do client:
 * - `order:subscribe` → `{ orderId }`
 * - `match:subscribe` → `{ matchId }`
 */
@Injectable()
@WebSocketGateway({
  namespace: '/swap',
  cors: { origin: '*' },
})
export class SwapGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SwapGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Autenticação no handshake: valida JWT e coloca o socket no room do user.
   */
  handleConnection(client: Socket): void {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        this.logger.warn('WebSocket connection sem token, desconectando');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.user = payload;
      void client.join(`user:${payload.sub}`);

      this.logger.log(`WebSocket conectado: user ${payload.sub}`);
    } catch {
      this.logger.warn('WebSocket connection com token inválido, desconectando');
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client.data.user as JwtPayload | undefined)?.sub ?? 'unknown';
    this.logger.log(`WebSocket desconectado: user ${userId}`);
  }

  /**
   * Client se inscreve para receber updates de uma ordem.
   */
  @SubscribeMessage('order:subscribe')
  handleOrderSubscribe(client: Socket, data: { orderId: string }): void {
    void client.join(`order:${data.orderId}`);
    this.logger.debug(`User se inscreveu na ordem ${data.orderId}`);
  }

  /**
   * Client se inscreve para receber updates de um match.
   */
  @SubscribeMessage('match:subscribe')
  handleMatchSubscribe(client: Socket, data: { matchId: string }): void {
    void client.join(`match:${data.matchId}`);
    this.logger.debug(`User se inscreveu no match ${data.matchId}`);
  }

  // ─── Server → Client Events ─────────────────────────────────

  notifyMatchFound(userId: string, payload: MatchFoundPayload): void {
    this.logger.log(`[WS] 📡 Emitindo 'match:found' para User: ${userId}`);
    this.logger.debug(`[WS] Payload: ${JSON.stringify(payload, null, 2)}`);
    this.server.to(`user:${userId}`).emit('match:found', payload);
  }

  notifyMatchConfirmed(userId: string, payload: MatchConfirmedPayload): void {
    this.logger.log(`[WS] 📡 Emitindo 'match:confirmed' para User: ${userId}`);
    this.logger.debug(`[WS] Payload: ${JSON.stringify(payload, null, 2)}`);
    this.server.to(`user:${userId}`).emit('match:confirmed', payload);
  }

  notifyDepositReceived(userId: string, payload: DepositReceivedPayload): void {
    this.logger.log(`[WS] 📡 Emitindo 'deposit:received' para User: ${userId}`);
    this.logger.debug(`[WS] Payload: ${JSON.stringify(payload, null, 2)}`);
    this.server.to(`user:${userId}`).emit('deposit:received', payload);
  }

  notifySwapProcessing(matchId: string): void {
    this.logger.log(`[WS] 📡 Emitindo 'swap:processing' para Match Room: ${matchId}`);
    this.server.to(`match:${matchId}`).emit('swap:processing', { matchId });
  }

  notifySwapCompleted(matchId: string, txHashA: string, txHashB: string): void {
    this.logger.log(`[WS] 📡 Emitindo 'swap:completed' para Match Room: ${matchId}`);
    const payload = { matchId, txHashA, txHashB };
    this.logger.debug(`[WS] Payload: ${JSON.stringify(payload, null, 2)}`);
    this.server.to(`match:${matchId}`).emit('swap:completed', payload);
  }

  notifySwapCancelled(userId: string, payload: SwapCancelledPayload): void {
    this.logger.log(`[WS] 📡 Emitindo 'swap:cancelled' para User: ${userId}`);
    this.logger.debug(`[WS] Payload: ${JSON.stringify(payload, null, 2)}`);
    this.server.to(`user:${userId}`).emit('swap:cancelled', payload);
  }

  notifySwapRefunded(userId: string, matchId: string, txHash: string): void {
    this.logger.log(`[WS] 📡 Emitindo 'swap:refunded' para User: ${userId}`);
    const payload = { matchId, txHash };
    this.logger.debug(`[WS] Payload: ${JSON.stringify(payload, null, 2)}`);
    this.server.to(`user:${userId}`).emit('swap:refunded', payload);
  }
}
