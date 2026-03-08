import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class WalletAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar se a rota é pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    console.log(`\n[AuthGuard] Interceptando requisição: ${request.method} ${request.url}`);
    
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      console.warn('[AuthGuard] 🚫 Token inválido ou não encontrado no header Authorization');
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }

    try {
      console.log('[AuthGuard] 🔍 Verificando o token JWT:', token.substring(0, 20) + '...');
      const payload: JwtPayload = await this.jwtService.verifyAsync(token);
      request.user = payload;
      console.log(`[AuthGuard] ✅ Token verificado com sucesso para User: ${payload.address} na App ${request.url}`);
    } catch (error: any) {
      console.error('[AuthGuard] ❌ Falha na verificação do JWT:', error.message);
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    return true;
  }

  private extractTokenFromHeader(request: { headers: { authorization?: string } }): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
