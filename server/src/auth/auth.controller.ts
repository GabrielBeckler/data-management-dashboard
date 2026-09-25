import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString() @MinLength(1) username!: string;
  @IsString() @MinLength(1) password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const token = this.auth.login(body.username, body.password);
    response.setHeader('Set-Cookie', this.auth.cookie(token));
    return { username: body.username };
  }

  @Get('session')
  session(@Req() request: Request) {
    const token = this.readCookie(request);
    if (!this.auth.isSessionValid(token)) throw new UnauthorizedException();
    return { authenticated: true, username: process.env.ADMIN_USERNAME || 'admin' };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Set-Cookie', this.auth.clearCookie());
    return { success: true };
  }

  private readCookie(request: Request): string | undefined {
    const header = request.headers.cookie || '';
    return header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${this.auth.getCookieName()}=`))?.split('=').slice(1).join('=');
  }
}
