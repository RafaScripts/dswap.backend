import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { User } from './entities/user.entity';
import { SiweStrategy } from './strategies/siwe.strategy';
import { SiwsStrategy } from './strategies/siws.strategy';
import { Chain } from '../common/types/chain.enum';
import { NonceResponseDto } from './dto/request-nonce.dto';
import { VerifyResponseDto } from './dto/verify-signature.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly siweStrategy: SiweStrategy,
    private readonly siwsStrategy: SiwsStrategy,
  ) {}

  /**
   * Gera um nonce aleatório e a mensagem formatada para o usuário assinar.
   * Se o usuário não existir, cria um novo registro.
   */
  async requestNonce(address: string, chain: Chain): Promise<NonceResponseDto> {
    const nonce = randomBytes(16).toString('hex');

    // Upsert: cria ou atualiza o usuário
    let user = await this.userRepo.findOne({ where: { address: address.toLowerCase() } });

    if (!user) {
      user = this.userRepo.create({
        address: address.toLowerCase(),
        primaryChain: chain,
        nonce,
      });
    } else {
      user.nonce = nonce;
    }

    await this.userRepo.save(user);

    // Gerar mensagem formatada de acordo com a chain
    const isSolana = chain === Chain.SOLANA;
    const message = isSolana
      ? this.siwsStrategy.createMessage(address, nonce)
      : this.siweStrategy.createMessage(address, nonce);

    this.logger.log(`Nonce gerado para ${address} na chain ${chain}`);

    return { nonce, message };
  }

  /**
   * Verifica a assinatura do usuário e emite um JWT.
   * O nonce é invalidado após uso (rotativo).
   */
  async verifySignature(
    message: string,
    signature: string,
    chain: Chain,
    address?: string,
  ): Promise<VerifyResponseDto> {
    let verifiedAddress: string;

    if (chain === Chain.SOLANA) {
      if (!address) {
        throw new UnauthorizedException('Endereço é obrigatório para verificação Solana');
      }
      const result = await this.siwsStrategy.verify(message, signature, address);
      verifiedAddress = result.address;
    } else {
      const result = await this.siweStrategy.verify(message, signature);
      verifiedAddress = result.address;
    }

    // Buscar usuário e validar nonce
    const user = await this.userRepo.findOne({
      where: { address: verifiedAddress.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado. Solicite um nonce primeiro.');
    }

    if (!user.nonce) {
      throw new UnauthorizedException('Nonce expirado. Solicite um novo nonce.');
    }

    // Invalidar nonce (uso único)
    user.nonce = null;
    await this.userRepo.save(user);

    // Emitir JWT
    const payload = {
      sub: user.id,
      address: user.address,
      chain: user.primaryChain,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    this.logger.log(`Autenticação bem-sucedida para ${verifiedAddress}`);

    return { accessToken, user };
  }

  /**
   * Retorna os dados do usuário logado.
   */
  async getMe(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return user;
  }
}
