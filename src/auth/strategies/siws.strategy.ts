import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

@Injectable()
export class SiwsStrategy {
  /**
   * Verifica uma assinatura Solana.
   *
   * @param message - Mensagem que foi assinada
   * @param signature - Assinatura em base64
   * @param address - Endereço public key Solana (base58)
   * @returns Endereço verificado
   * @throws UnauthorizedException se a assinatura for inválida
   */
  async verify(message: string, signature: string, address: string): Promise<{ address: string }> {
    try {
      const publicKey = new PublicKey(address);
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = Buffer.from(signature, 'base64');

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes(),
      );

      if (!isValid) {
        throw new UnauthorizedException('Assinatura Solana inválida');
      }

      return { address };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Falha ao verificar assinatura Solana');
    }
  }

  /**
   * Gera uma mensagem para o usuário Solana assinar.
   */
  createMessage(address: string, nonce: string, domain = 'dswap.app'): string {
    return [
      `${domain} wants you to sign in with your Solana account:`,
      address,
      '',
      'Sign in with Solana to DSwap',
      '',
      `URI: https://${domain}`,
      'Version: 1',
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n');
  }
}
