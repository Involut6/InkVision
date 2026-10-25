import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type { AdminUserDto, LoginResponse } from '@inkvision/shared-types';

import { AppConfigService } from '../../config/configuration.js';
import { Client, CurrentUser, Public } from '../../common/decorators/index.js';
import type { ClientContext } from '../../common/decorators/index.js';

import { AuthService } from './auth.service.js';
import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  type AuthenticatedUser,
} from './auth.types.js';
import { ChangePasswordDto, LoginDto } from './dto/login.dto.js';
import type { IssuedTokens } from './token.service.js';
import { readCookie } from '../../common/http/cookies.js';

@ApiTags('Admin · Authentication')
@Controller('admin/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  // Tighter than the global limit: this is the endpoint worth brute-forcing.
  // Per-account lockout in AuthService covers the case of one account attacked
  // from many addresses, which a per-IP limit cannot see.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in to the administration portal.' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Signed in. Sets session cookies.' })
  @ApiResponse({ status: 401, description: 'Email or password is incorrect.' })
  @ApiResponse({ status: 429, description: 'Too many sign-in attempts.' })
  async login(
    @Body() dto: LoginDto,
    @Client() client: ClientContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const result = await this.auth.login(dto.email, dto.password, {
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    this.setSessionCookies(response, result.tokens, result.csrfToken);

    return {
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.accessExpiresIn,
      user: result.user,
      csrfToken: result.csrfToken,
    };
  }

  @Public()
  // Looser than the login limit on purpose. Refresh requires a valid signed
  // token, so it is not worth brute-forcing, and every admin tab refreshes on
  // load — a tight limit punishes ordinary multi-tab use rather than an
  // attacker.
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Rotate the session.',
    description:
      'Exchanges the refresh cookie for a new token pair. Presenting an already-rotated token revokes the entire session family.',
  })
  async refresh(
    @Req() request: Request,
    @Client() client: ClientContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const result = await this.auth.refresh(readCookie(request, REFRESH_COOKIE_NAME), {
      ipAddress: client.ipAddress,
      userAgent: client.userAgent,
    });

    this.setSessionCookies(response, result.tokens, result.csrfToken);

    return {
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.accessExpiresIn,
      user: result.user,
      csrfToken: result.csrfToken,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Sign out and revoke the refresh token.' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const user = (request as Request & { user?: AuthenticatedUser }).user;

    await this.auth.logout(readCookie(request, REFRESH_COOKIE_NAME), user);
    this.clearSessionCookies(response);
  }

  @Get('me')
  @ApiOperation({ summary: 'The signed-in administrator and their permissions.' })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AdminUserDto> {
    const resolved = await this.auth.resolveAuthenticatedUser(user.id);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      permissions: resolved?.permissions ?? user.permissions,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(0).toISOString(),
    };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Change your own password.',
    description: 'Succeeding revokes every other session for the account.',
  })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.changeOwnPassword(user, dto.currentPassword, dto.newPassword);
    this.clearSessionCookies(response);
  }

  // ---------------------------------------------------------------------------
  // Cookie handling
  //
  // Access and refresh cookies are HttpOnly so no script can read them. The
  // CSRF cookie is deliberately readable: the admin client echoes it in a
  // header, which is what makes the double-submit check work.
  // ---------------------------------------------------------------------------

  private setSessionCookies(response: Response, tokens: IssuedTokens, csrfToken: string): void {
    const { cookieSecure, cookieSameSite, cookieDomain, accessTtlSeconds } = this.config.auth;
    const base = {
      secure: cookieSecure,
      sameSite: cookieSameSite,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      path: '/',
    } as const;

    response.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
      ...base,
      httpOnly: true,
      maxAge: accessTtlSeconds * 1000,
    });

    response.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      ...base,
      httpOnly: true,
      expires: tokens.refreshExpiresAt,
    });

    response.cookie(CSRF_COOKIE_NAME, csrfToken, {
      ...base,
      httpOnly: false,
      expires: tokens.refreshExpiresAt,
    });
  }

  private clearSessionCookies(response: Response): void {
    const { cookieSecure, cookieSameSite, cookieDomain } = this.config.auth;
    const base = {
      secure: cookieSecure,
      sameSite: cookieSameSite,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      path: '/',
    } as const;

    response.clearCookie(ACCESS_COOKIE_NAME, { ...base, httpOnly: true });
    response.clearCookie(REFRESH_COOKIE_NAME, { ...base, httpOnly: true });
    response.clearCookie(CSRF_COOKIE_NAME, { ...base, httpOnly: false });
  }
}
