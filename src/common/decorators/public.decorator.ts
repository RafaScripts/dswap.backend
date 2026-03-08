import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator que marca uma rota como pública (skip auth guard).
 *
 * @example
 * ```ts
 * @Public()
 * @Post('nonce')
 * requestNonce(@Body() dto: RequestNonceDto) { ... }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
