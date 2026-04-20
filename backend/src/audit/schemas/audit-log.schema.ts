import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: String, index: true })
  actorId?: string;

  @Prop({ type: String })
  actorEmail?: string;

  @Prop({ type: String, index: true })
  actorRole?: string;

  /** e.g. POST /api/patients */
  @Prop({ required: true })
  action: string;

  @Prop({ type: String, index: true, default: 'system' })
  category: string;

  @Prop({ type: String, default: 'info' })
  severity: 'info' | 'warning' | 'critical';

  @Prop({ type: Boolean, default: false, index: true })
  suspicious: boolean;

  @Prop({ type: Number })
  statusCode?: number;

  @Prop({ type: String })
  method?: string;

  @Prop({ type: String })
  path?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
