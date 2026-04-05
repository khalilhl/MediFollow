import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BrainTumorController } from './brain-tumor.controller';
import { BrainTumorService } from './brain-tumor.service';

@Module({
  imports: [AuthModule],
  controllers: [BrainTumorController],
  providers: [BrainTumorService],
})
export class BrainTumorModule {}
