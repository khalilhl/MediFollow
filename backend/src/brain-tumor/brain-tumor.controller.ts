import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrainTumorService } from './brain-tumor.service';

const imageMime = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/gif']);
const upload = memoryStorage();

@Controller('brain-tumor')
export class BrainTumorController {
  constructor(private readonly brainTumorService: BrainTumorService) {}

  /** Analyse IRM — réservé aux médecins connectés. */
  @UseGuards(JwtAuthGuard)
  @Post('predict')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: upload,
      limits: { fileSize: 16 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (imageMime.has(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Image requise (JPEG, PNG, WebP, etc.).') as never, false);
      },
    }),
  )
  async predict(
    @Req() req: { user?: { role?: string } },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (req.user?.role !== 'doctor') {
      throw new ForbiddenException('Réservé aux médecins.');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Fichier image manquant.');
    }
    return this.brainTumorService.predictFromBuffer(file.buffer, {
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
  }
}
