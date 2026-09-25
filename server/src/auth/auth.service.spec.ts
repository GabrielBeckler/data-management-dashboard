import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const previous = { secret: process.env.AUTH_SECRET, username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD };

  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret-for-auth-service-at-least-32-chars';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = '123456';
  });

  afterAll(() => {
    if (previous.secret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = previous.secret;
    if (previous.username === undefined) delete process.env.ADMIN_USERNAME; else process.env.ADMIN_USERNAME = previous.username;
    if (previous.password === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = previous.password;
  });

  it('accepts initial credentials and validates the signed session', () => {
    const auth = new AuthService();
    const token = auth.login('admin', '123456');
    expect(auth.isSessionValid(token)).toBe(true);
    expect(auth.isSessionValid(`${token}invalid`)).toBe(false);
    expect(auth.cookie(token)).toContain('HttpOnly');
    expect(auth.clearCookie()).toContain('Max-Age=0');
  });

  it('rejects invalid credentials', () => {
    const auth = new AuthService();
    expect(() => auth.login('admin', 'incorrect')).toThrow(UnauthorizedException);
  });
});
