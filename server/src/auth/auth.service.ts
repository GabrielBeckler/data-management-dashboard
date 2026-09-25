import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'otica_session';
const SESSION_SECONDS = 60 * 60 * 12;

@Injectable()
export class AuthService {
  private readonly secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || '';

  private ensureSecret(): string {
    if (this.secret.length < 32) throw new Error('AUTH_SECRET precisa ter ao menos 32 caracteres.');
    return this.secret;
  }

  private passwordMatches(password: string): boolean {
    const salt = process.env.ADMIN_PASSWORD_SALT || 'otica-admin-v1';
    const expected = scryptSync(process.env.ADMIN_PASSWORD || '123456', salt, 64);
    const actual = scryptSync(password, salt, 64);
    return timingSafeEqual(actual, expected);
  }

  login(username: string, password: string): string {
    const expectedUser = process.env.ADMIN_USERNAME || 'admin';
    if (username !== expectedUser || !this.passwordMatches(password)) {
      throw new UnauthorizedException('Usuário ou senha inválidos.');
    }
    const payload = Buffer.from(JSON.stringify({ sub: username, exp: Date.now() + SESSION_SECONDS * 1000, nonce: randomBytes(12).toString('hex') })).toString('base64url');
    const signature = createHmac('sha256', this.ensureSecret()).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  isSessionValid(token?: string): boolean {
    if (!token) return false;
    try {
      const [payload, signature] = token.split('.');
      if (!payload || !signature) return false;
      const expected = createHmac('sha256', this.ensureSecret()).update(payload).digest();
      const provided = Buffer.from(signature, 'base64url');
      if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return false;
      const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
      return session.sub === (process.env.ADMIN_USERNAME || 'admin') && session.exp > Date.now();
    } catch {
      return false;
    }
  }

  cookie(token: string): string {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}${secure}`;
  }

  clearCookie(): string {
    return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
  }

  getCookieName(): string { return COOKIE_NAME; }
}
