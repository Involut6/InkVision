import { Module } from '@nestjs/common';

import { AdminCaseStudiesController, CaseStudiesController } from './case-studies.controller.js';
import { CaseStudiesService } from './case-studies.service.js';

@Module({
  controllers: [CaseStudiesController, AdminCaseStudiesController],
  providers: [CaseStudiesService],
  exports: [CaseStudiesService],
})
export class CaseStudiesModule {}
