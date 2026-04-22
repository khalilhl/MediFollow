/** pdfkit est CommonJS : évite `default is not a constructor` avec Nest/ts. */
import PDFDocument = require('pdfkit');

/**
 * PDFKit polices standard = WinAnsi ; normaliser pour éviter les erreurs sur caractères hors plage.
 */
export function textForPrescriptionPdf(input: unknown): string {
  const raw = String(input ?? '')
    .replace(/\u2014|\u2013/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00b5|\u03bc/gi, 'u')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '');
  let out = '';
  for (const ch of raw) {
    const c = ch.charCodeAt(0);
    if (c === 10 || c === 13) out += ch;
    else if (c >= 32 && c <= 126) out += ch;
    else out += ' ';
  }
  return out.replace(/\s+/g, ' ').trim();
}

export type PrescriptionLineInput = {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export type BuildPrescriptionPdfParams = {
  patientFirstName: string;
  patientLastName: string;
  patientDob?: string;
  doctorDisplayName: string;
  doctorSpecialty?: string;
  doctorDepartment?: string;
  issuedDateYmd: string;
  lines: PrescriptionLineInput[];
};

/**
 * Ordonnance A4 (presentation type formulaire papier, police standard PDFKit).
 */
export function buildPrescriptionPdfBuffer(params: BuildPrescriptionPdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      const pName = textForPrescriptionPdf(
        `${params.patientFirstName} ${params.patientLastName}`.trim() || 'Patient',
      );
      const drName = textForPrescriptionPdf(params.doctorDisplayName);
      const spec = textForPrescriptionPdf(params.doctorSpecialty || '');
      const dept = textForPrescriptionPdf(params.doctorDepartment || '');
      const dob = params.patientDob ? textForPrescriptionPdf(params.patientDob) : '';
      const dateStr = textForPrescriptionPdf(params.issuedDateYmd);

      doc.lineWidth(2).strokeColor('#089bab').moveTo(50, 45).lineTo(doc.page.width - 50, 45).stroke();
      doc.fontSize(9).fillColor('#089bab').text('MediFollow — suivi medical', 50, 52);
      doc.fontSize(10).fillColor('#333333').text(`Date : ${dateStr}`, { align: 'right' });
      doc.moveDown(1.2);

      doc.fontSize(22).fillColor('#0f766e').text('ORDONNANCE MEDICALE', { align: 'center' });
      doc.moveDown(0.25);
      doc.fontSize(9).fillColor('#64748b').text('Document electronique emis par le medecin prescripteur', { align: 'center' });
      doc.moveDown(1.2);

      doc.fontSize(10).fillColor('#0f172a');
      doc.text(`Patient : ${pName}`);
      if (dob) doc.text(`Date de naissance : ${dob}`);
      doc.text(`Medecin prescripteur : ${drName}`);
      if (spec) doc.text(`Specialite : ${spec}`);
      if (dept) doc.text(`Service : ${dept}`);
      doc.moveDown(0.8);

      const ruleY = doc.y;
      doc
        .lineWidth(1)
        .strokeColor('#cbd5e1')
        .moveTo(50, ruleY)
        .lineTo(doc.page.width - 50, ruleY)
        .stroke();
      doc.moveDown(0.5);

      doc.fontSize(12).fillColor('#0f766e').text('Prescription medicamenteuse', { underline: false });
      doc.moveDown(0.5);

      const lines = params.lines || [];
      if (!lines.length) {
        doc.fontSize(10).fillColor('#64748b').text('(aucune ligne)');
      } else {
        lines.forEach((L, i) => {
          if (doc.y > doc.page.height - 100) {
            doc.addPage();
          }
          const name = textForPrescriptionPdf(L.name);
          const dosage = textForPrescriptionPdf(L.dosage);
          const freq = textForPrescriptionPdf(L.frequency);
          const start = textForPrescriptionPdf(L.startDate);
          const end = textForPrescriptionPdf(L.endDate);
          const period = start && end ? `du ${start} au ${end}` : start ? `a partir du ${start}` : end ? `jusqu'au ${end}` : '';
          const note = textForPrescriptionPdf(L.notes);

          doc.fontSize(11).fillColor('#0f172a').text(`${i + 1}. ${name}`, { continued: false });
          doc.fontSize(10).fillColor('#334155');
          const details: string[] = [];
          if (dosage) details.push(`Dosage : ${dosage}`);
          if (freq) details.push(`Posologie : ${freq}`);
          if (period) details.push(period);
          if (details.length) doc.text(`   ${details.join('  |  ')}`);
          if (note) doc.fontSize(9).fillColor('#64748b').text(`   Note : ${note}`);
          doc.moveDown(0.6);
        });
      }

      doc.moveDown(1);
      if (doc.y > doc.page.height - 110) doc.addPage();

      doc.fontSize(9).fillColor('#475569').text(
        'Ce document tient lieu d\'ordonnance dans l\'application MediFollow. Conservez-le ou imprimez-le pour votre pharmacie.',
        { align: 'left' },
      );
      doc.moveDown(2);

      doc.fontSize(10).fillColor('#0f172a').text('Signature et cachet (facultatif sur exemplaire numerique)');
      doc.moveDown(0.3);
      doc.lineWidth(0.5).strokeColor('#94a3b8').moveTo(50, doc.y).lineTo(320, doc.y).stroke();
      doc.moveDown(0.2);
      doc.fontSize(10).text(drName);

      doc.fontSize(8).fillColor('#94a3b8').text(`Emis le ${dateStr} — MediFollow`, 50, doc.page.height - 72, {
        lineBreak: false,
      });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
