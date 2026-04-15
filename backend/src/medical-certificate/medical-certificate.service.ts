import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { MedicalCertificate } from './schemas/medical-certificate.schema';
import { Patient } from '../patient/schemas/patient.schema';
import { Medication } from '../medication/schemas/medication.schema';

type JwtUser = {
  id: unknown;
  role: string;
  firstName?: string;
  lastName?: string;
  name?: string;
};

@Injectable()
export class MedicalCertificateService {
  constructor(
    @InjectModel(MedicalCertificate.name) private certModel: Model<MedicalCertificate>,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(Medication.name) private medicationModel: Model<Medication>,
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

  private doctorDisplayName(user: JwtUser) {
    const fn = user.firstName || '';
    const ln = user.lastName || '';
    const n = `${fn} ${ln}`.trim();
    return n || (user.name as string) || 'Physician';
  }

  async createFromPatientMedications(body: { patientId?: string }, user?: JwtUser) {
    if (!user || user.role !== 'doctor') {
      throw new ForbiddenException('Seul un médecin peut créer un certificat');
    }
    const patientId = String(body?.patientId || '').trim();
    if (!patientId) throw new BadRequestException('patientId requis');
    await this.assertAccessToPatient(patientId, user);

    const pid = Types.ObjectId.isValid(patientId) ? new Types.ObjectId(patientId) : patientId;
    const meds = await this.medicationModel
      .find({ patientId: pid, isActive: { $ne: false } })
      .sort({ createdAt: -1 })
      .exec();
    if (!meds.length) {
      throw new BadRequestException('Aucun médicament actif pour ce patient');
    }
    const items = meds.map((m) => ({
      name: String(m.name || ''),
      dosage: String(m.dosage || ''),
      frequency: String(m.frequency || ''),
    }));
    const doc = await this.certModel.create({
      patientId: pid,
      doctorId: new Types.ObjectId(String(user.id)),
      doctorDisplayName: this.doctorDisplayName(user),
      issuedAt: new Date(),
      items,
    });
    return doc.toObject();
  }

  async listMineAsPatient(user?: JwtUser) {
    if (!user || user.role !== 'patient') {
      throw new ForbiddenException('Réservé au compte patient');
    }
    const pid = new Types.ObjectId(String(user.id));
    const rows = await this.certModel.find({ patientId: pid }).sort({ issuedAt: -1 }).lean().exec();
    return rows;
  }

  async listForPatientAsDoctor(patientId: string, user?: JwtUser) {
    if (!user || user.role !== 'doctor') {
      throw new ForbiddenException('Réservé au compte médecin');
    }
    await this.assertAccessToPatient(patientId, user);
    const pid = Types.ObjectId.isValid(patientId) ? new Types.ObjectId(patientId) : patientId;
    const did = new Types.ObjectId(String(user.id));
    const rows = await this.certModel
      .find({ patientId: pid, doctorId: did })
      .sort({ issuedAt: -1 })
      .lean()
      .exec();
    return rows;
  }

  private async getCertAndAssertPdfAccess(certId: string, user?: JwtUser) {
    if (!user) throw new UnauthorizedException();
    const cert = await this.certModel.findById(certId).exec();
    if (!cert) throw new NotFoundException('Certificat introuvable');
    const pid = String(cert.patientId);
    const did = String(cert.doctorId);
    const uid = String(user.id);
    if (user.role === 'patient' && uid === pid) return cert;
    if (user.role === 'doctor' && uid === did) {
      await this.assertAccessToPatient(pid, user);
      return cert;
    }
    throw new ForbiddenException('Accès refusé');
  }

  async buildPdfBuffer(certId: string, user?: JwtUser): Promise<Buffer> {
    const cert = await this.getCertAndAssertPdfAccess(certId, user);
    const patient = await this.patientModel.findById(cert.patientId).lean().exec();
    const pFirst = (patient as any)?.firstName || '';
    const pLast = (patient as any)?.lastName || '';
    const issued = cert.issuedAt ? new Date(cert.issuedAt).toISOString().slice(0, 10) : '';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Medical certificate / Certificat médical', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Patient: ${pFirst} ${pLast}`.trim() || `Patient ID: ${String(cert.patientId)}`);
      doc.text(`Issued: ${issued}`);
      doc.text(`Physician: ${cert.doctorDisplayName || '—'}`);
      doc.moveDown();
      doc.fontSize(12).text('Prescribed medications / Médicaments prescrits:', { underline: true });
      doc.moveDown(0.5);
      const items = cert.items || [];
      if (!items.length) {
        doc.fontSize(10).text('—');
      } else {
        items.forEach((it, i) => {
          doc
            .fontSize(10)
            .text(`${i + 1}. ${it.name}${it.dosage ? ` — ${it.dosage}` : ''}${it.frequency ? ` — ${it.frequency}` : ''}`);
        });
      }
      doc.moveDown(2);
      doc.fontSize(9).fillColor('#666666').text('MediFollow — document generated electronically.', { align: 'center' });
      doc.end();
    });
  }
}
