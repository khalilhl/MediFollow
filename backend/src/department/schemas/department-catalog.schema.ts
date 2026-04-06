import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DepartmentCatalogDocument = HydratedDocument<DepartmentCatalog>;

/** Départements enregistrés par le super admin (liste partagée avec les formulaires). */
@Schema({ collection: 'department_catalog', timestamps: true })
export class DepartmentCatalog {
  @Prop({ required: true, trim: true })
  name: string;
}

export const DepartmentCatalogSchema = SchemaFactory.createForClass(DepartmentCatalog);
DepartmentCatalogSchema.index({ name: 1 }, { unique: true });
