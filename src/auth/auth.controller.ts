import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestNonceDto, NonceResponseDto } from './dto/request-nonce.dto';
import { VerifySignatureDto, VerifyResponseDto } from './dto/verify-signature.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Solicita um nonce aleatório para a wallet assinar.
   * O nonce é vinculado ao endereço e tem uso único.
   * Se o usuário não existir, será criado automaticamente.
   */
  @Public()
  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar nonce para assinatura',
    description:
      'Gera um nonce aleatório e retorna a mensagem formatada (SIWE para EVM ou SIWS para Solana) ' +
      'que o usuário deve assinar com sua wallet. Se o endereço não estiver registrado, um novo ' +
      'usuário será criado automaticamente.',
  })
  @ApiBody({ type: RequestNonceDto })
  @ApiResponse({
    status: 200,
    description: 'Nonce e mensagem gerados com sucesso',
    type: NonceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Endereço inválido ou chain não suportada',
  })
  async requestNonce(@Body() dto: RequestNonceDto): Promise<NonceResponseDto> {
    return this.authService.requestNonce(dto.address, dto.chain);
  }

  /**
   * Verifica a assinatura da wallet e emite um JWT de acesso.
   * O nonce é invalidado após uso bem-sucedido (proteção contra replay).
   */
  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verificar assinatura e obter JWT',
    description:
      'Verifica a assinatura criptográfica contra o endereço da wallet. Para EVM, usa ' +
      'SIWE (EIP-4361). Para Solana, usa verificação ed25519 com tweetnacl. Após ' +
      'verificação bem-sucedida, retorna um JWT que deve ser incluído no header ' +
      'Authorization como Bearer token em todas as requisições autenticadas.',
  })
  @ApiBody({ type: VerifySignatureDto })
  @ApiResponse({
    status: 200,
    description: 'Assinatura verificada e JWT emitido com sucesso',
    type: VerifyResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Assinatura inválida, nonce expirado, ou usuário não encontrado',
  })
  async verifySignature(@Body() dto: VerifySignatureDto): Promise<VerifyResponseDto> {
    return this.authService.verifySignature(
      dto.message,
      dto.signature,
      dto.chain,
      dto.address,
    );
  }

  /**
   * Retorna os dados do usuário autenticado.
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Dados do usuário logado',
    description:
      'Retorna as informações do usuário autenticado baseado no JWT fornecido ' +
      'no header Authorization. Inclui endereço, chain principal, e datas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário retornados com sucesso',
    type: User,
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado',
  })
  async getMe(@CurrentUser() user: JwtPayload): Promise<User> {
    return this.authService.getMe(user.sub);
  }
}
