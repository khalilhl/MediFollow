import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: true, timestamps: true })
export class MoodComplianceInsight extends Document {
  @Prop({ required: true, default: Date.now })
  date: Date;

  @Prop({ required: true, min: 0, max: 1 })
  emotionScore: number;

  @Prop({ required: true })
  emotionLabel: string; // from FER (e.g. happy, sad, angry, neutral)

  @Prop({ required: true, min: 0, max: 1 })
  vitalTrendScore: number;

  @Prop({ required: true, min: 0, max: 1 })
  symptomSeverityScore: number;

  @Prop({ required: true, min: 0, max: 100 })
  questionnaireCompliance: number; // percentage

  @Prop({ required: true, min: 0, max: 100 })
  overallMoodScore: number; // Aggregate score 0-100

  @Prop({ required: true })
  insightSummary: string; // Natural language summary

  @Prop({ required: true })
  recommendation: string; // Actionable recommendation

  @Prop({ required: true, default: false })
  alertTriggered: boolean; // Whether this insight caused a smart alert
}

export const MoodComplianceInsightSchema = SchemaFactory.createForClass(MoodComplianceInsight);
