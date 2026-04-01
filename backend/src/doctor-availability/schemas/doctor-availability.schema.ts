import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class DoctorAvailability extends Document {
  @Prop({ required: true })
  doctorId: string;

  /** Format YYYY-MM (ex. 2026-04) */
  @Prop({ required: true })
  yearMonth: string;

  @Prop({
    type: [
      {
        date: String,
        times: [String],
      },
    ],
    default: [],
  })
  slots: { date: string; times: string[] }[];
}

export const DoctorAvailabilitySchema = SchemaFactory.createForClass(DoctorAvailability);
DoctorAvailabilitySchema.index({ doctorId: 1, yearMonth: 1 }, { unique: true });
