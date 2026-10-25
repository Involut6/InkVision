import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser, Public, RequirePermissions } from '../../common/decorators/index.js';
import { ValidationFailedException } from '../../common/errors/app.errors.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

import { UploadMediaDto } from './dto/upload-media.dto.js';
import { MediaService } from './media.service.js';
import type { UploadedFileLike } from './uploaded-file.type.js';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Stream a public media asset.',
    description:
      'Private assets (such as product deliverables) are reported as not found here; they are reachable only through authorised, signed routes.',
  })
  async stream(@Param('id') id: string, @Res() response: Response): Promise<void> {
    const asset = await this.media.streamPublic(id);

    response.setHeader('Content-Type', asset.mimeType);
    response.setHeader('Content-Length', asset.sizeBytes);
    // Content is addressed by an immutable id, so it can be cached hard.
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    asset.stream.pipe(response);
  }
}

@ApiTags('Admin · Media')
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  @RequirePermissions('upload:write')
  async list() {
    return this.media.list();
  }

  @Post()
  @RequirePermissions('upload:write')
  @UseInterceptors(
    FileInterceptor('file', {
      // 10 MiB ceiling at the transport layer, so an oversized body is rejected
      // before it is buffered in full. The service re-checks against config.
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadMediaDto })
  @ApiOperation({
    summary: 'Upload an image or document.',
    description:
      'The declared MIME type must match the file’s magic bytes. SVG is accepted only as a private asset.',
  })
  async upload(
    @UploadedFile() file: UploadedFileLike | undefined,
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new ValidationFailedException({ file: ['Choose a file to upload.'] });
    }

    return this.media.upload(
      {
        originalName: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer,
        ...(dto.alt ? { alt: dto.alt } : {}),
        ...(dto.caption ? { caption: dto.caption } : {}),
        isPublic: dto.isPublic !== false,
      },
      user,
    );
  }
}
