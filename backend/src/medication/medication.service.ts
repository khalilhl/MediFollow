import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Medication } from './schemas/medication.schema';
import { Patient } from '../patient/schemas/patient.schema';

const localDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type JwtUser = {
  id: unknown;
  role: string;
  firstName?: string;
  lastName?: string;
  name?: string;
};

@Injectable()
export class MedicationService {
  constructor(
    @InjectModel(Medication.name) private medicationModel: Model<Medication>,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
  ) {}

  private async assertAccessToPatient(patientId: string, user: JwtUser | undefined) {
    if (!user) throw new UnauthorizedException();
    const pid = String(patientId);
    const uid = String(user.id);
    if (user.role === 'patient') {
      if (uid !== pid) throw new ForbiddenException('Accès refusé');
      return;
    }
    if (user.role === 'doctor') {
      const patient = await this.patientModel.findById(pid).exec();
      if (!patient) throw new NotFoundException('Patient introuvable');
      if (String(patient.doctorId || '') !== uid) {
        throw new ForbiddenException('Ce patient n’est pas suivi par ce médecin');
      }
      return;
    }
    if (user.role === 'nurse') {
      const patient = await this.patientModel.findById(pid).exec();
      if (!patient) throw new NotFoundException('Patient introuvable');
      if (String(patient.nurseId || '') !== uid) {
        throw new ForbiddenException('Accès refusé');
      }
      return;
    }
    if (user.role === 'admin' || user.role === 'superadmin') return;
    throw new ForbiddenException('Accès refusé');
  }

  private async getMedicationAndPatientId(medId: string) {
    const med = await this.medicationModel.findById(medId).exec();
    if (!med) throw new NotFoundException('Médicament introuvable');
    const patientId = String((med as any).patientId);
    return { med, patientId };
  }

  async create(data: Record<string, unknown>, user?: JwtUser) {
    if (!data.patientId) throw new BadRequestException('patientId requis');
    const patientId = String(data.patientId);
    await this.assertAccessToPatient(patientId, user);

    let prescribedBy = (data.prescribedBy as string) || '';
    if (user?.role === 'doctor') {
      const fn = user.firstName || '';
      const ln = user.lastName || '';
      prescribedBy = `${fn} ${ln}`.trim() || (user.name as string) || prescribedBy;
    }

    const { patientId: _omit, _id: __omit, isActive: _ia, ...rest } = data;
    const doc: Record<string, unknown> = {
      ...rest,
      patientId: new Types.ObjectId(patientId),
      prescribedBy: prescribedBy || undefined,
      isActive: true,
    };
    const created = await this.medicationModel.create(doc);
    return created;
  }

  async getByPatient(patientId: string, user?: JwtUser) {
    await this.assertAccessToPatient(patientId, user);
    const pid = Types.ObjectId.isValid(patientId) ? new Types.ObjectId(patientId) : patientId;
    const meds = await this.medicationModel
      .find({
        patientId: pid,
        isActive: { $ne: false },
      })
      .sort({ createdAt: -1 })
      .exec();
    const today = localDateString();
    return meds.map((m) => ({
      ...m.toObject(),
      takenToday: m.takenDates?.includes(today) ?? false,
    }));
  }

  async toggleTakenToday(id: string, user?: JwtUser) {
    const { patientId } = await this.getMedicationAndPatientId(id);
    await this.assertAccessToPatient(patientId, user);
    const med = await this.medicationModel.findById(id).exec();
    if (!med) throw new NotFoundException('Médicament introuvable');
    const today = localDateString();
    const alreadyTaken = med.takenDates?.includes(today);
    if (alreadyTaken) {
      await this.medicationModel.updateOne({ _id: id }, { $pull: { takenDates: today } });
    } else {
      await this.medicationModel.updateOne({ _id: id }, { $addToSet: { takenDates: today } });
    }
    return { takenToday: !alreadyTaken };
  }

  async update(id: string, data: Record<string, unknown>, user?: JwtUser) {
    const { patientId } = await this.getMedicationAndPatientId(id);
    await this.assertAccessToPatient(patientId, user);
    const updateData = { ...data };
    delete updateData._id;
    delete updateData.patientId;
    return this.medicationModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }

  async remove(id: string, user?: JwtUser) {
    const { patientId } = await this.getMedicationAndPatientId(id);
    await this.assertAccessToPatient(patientId, user);
    return this.medicationModel.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).exec();
  }
}
