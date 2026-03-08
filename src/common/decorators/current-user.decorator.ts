import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  address: string;
  chain: string;
}

/**
 * Decorator de parâmetro que extrai o usuário autenticado do request.
 *
 * @example
 * ```ts
 * @Get('me')
 * getMe(@CurrentUser() user: JwtPayload) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user[data] : user;
  },
);
