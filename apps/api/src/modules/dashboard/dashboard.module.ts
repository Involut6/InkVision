import { Module } from '@nestjs/common';

import { EnquiriesModule } from '../enquiries/enquiries.module.js';
import { NewsletterModule } from '../newsletter/newsletter.module.js';

import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [EnquiriesModule, NewsletterModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
