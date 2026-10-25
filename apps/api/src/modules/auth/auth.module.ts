import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

/**
 * Global so the application-wide guards can inject `AuthService` and
 * `TokenService` without every feature module re-importing this one.
 *
 * `JwtModule` is registered without a secret: each signing call passes the
 * correct secret explicitly, which keeps the access and refresh keys separate
 * and makes it impossible to sign a refresh token with the access key.
 */
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService],
  exports: [AuthService, PasswordService, TokenService],
})
export class AuthModule {}
