import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SiweMessage } from 'siwe';
import { getAddress } from 'viem';

@Injectable()
export class SiweStrategy {
  /**
   * Verifica uma assinatura EVM usando o padrão SIWE (EIP-4361).
   *
   * @param message - Mensagem SIWE formatada
   * @param signature - Assinatura hexadecimal da wallet
   * @returns Endereço da wallet verificado
   * @throws UnauthorizedException se a assinatura for inválida
   */
  async verify(message: string, signature: string): Promise<{ address: string }> {
    try {
      const siweMessage = new SiweMessage(message);
      const result = await siweMessage.verify({ signature });

      if (!result.success) {
        throw new UnauthorizedException('Assinatura EVM inválida');
      }

      return { address: result.data.address };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Falha ao verificar assinatura EVM');
    }
  }

  /**
   * Gera uma mensagem SIWE formatada para o usuário assinar.
   */
  createMessage(address: string, nonce: string, domain = 'dswap.app'): string {
    const checksumAddress = getAddress(address);
    const message = new SiweMessage({
      domain,
      address: checksumAddress,
      statement: 'Sign in with Ethereum to DSwap',
      uri: `https://${domain}`,
      version: '1',
      chainId: 1,
      nonce,
      issuedAt: new Date().toISOString(),
    });
    return message.prepareMessage();
  }
}
