import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production',
  expiresIn: process.env.JWT_EXPIRATION ?? '7d',
}));
