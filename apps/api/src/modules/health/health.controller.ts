import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';

import type { HealthResponse, ReadinessCheck, ReadinessResponse } from '@inkvision/shared-types';

import { Public } from '../../common/decorators/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../../mail/mail.service.js';

const startedAt = Date.now();

/**
 * Liveness and readiness.
 *
 * `/health` answers "is this process running" and never touches a dependency,
 * so an orchestrator does not restart a healthy process because the database
 * blinked. `/ready` answers "can this process serve traffic" and does check
 * dependencies — that is the one a load balancer should use.
 */
@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  @Public()
  @SkipThrottle()
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe. Does not touch dependencies.' })
  health(): HealthResponse {
    return {
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }

  @Public()
  @SkipThrottle()
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe. Returns 503 when a required dependency is down.',
  })
  async ready(@Res({ passthrough: true }) response: Response): Promise<ReadinessResponse> {
    const checks: ReadinessCheck[] = [await this.checkDatabase(), await this.checkMail()];

    // Mail is reported but not required: the site must keep serving pages and
    // accepting enquiries when the mail provider is unreachable.
    const required = checks.filter((check) => check.name === 'database');
    const ready = required.every((check) => check.status === 'up');

    if (!ready) response.status(HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: ready ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  @ApiExcludeEndpoint()
  @Public()
  @SkipThrottle()
  @Get()
  root(): { name: string; docs: string } {
    return { name: 'InkVision Creatives API', docs: '/api/docs' };
  }

  private async checkDatabase(): Promise<ReadinessCheck> {
    const started = Date.now();
    try {
      await this.prisma.ping();
      return { name: 'database', status: 'up', durationMs: Date.now() - started };
    } catch (error) {
      return {
        name: 'database',
        status: 'down',
        // The driver message is not forwarded: it can name hosts and users.
        detail: error instanceof Error ? error.name : 'Unknown error',
        durationMs: Date.now() - started,
      };
    }
  }

  private async checkMail(): Promise<ReadinessCheck> {
    const started = Date.now();
    try {
      const result = await this.mail.verify();
      return {
        name: 'email',
        status: result.ok ? 'up' : 'down',
        ...(result.detail ? { detail: result.detail } : {}),
        durationMs: Date.now() - started,
      };
    } catch {
      return { name: 'email', status: 'down', durationMs: Date.now() - started };
    }
  }
}
