import PDFDocument from 'pdfkit';

type CVItem = {
  role: string;
  company: string;
  period: string;
  location: string;
  highlights: string[];
};

type CVCert = { title: string; code: string; year: string; id: string };
type CVProject = { name: string; url: string; description: string };
type CVConference = { title: string; event: string; location: string };

type CVData = {
  header: { name: string; title: string; role: string; vision: string };
  contact: { phone: string; email: string; location: string; website: string };
  about: string;
  experience: CVItem[];
  skills: { technical: string[]; competencies: string[] };
  certifications: CVCert[];
  conferences: CVConference[];
  projects: CVProject[];
};

function sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.7);
  doc.fillColor('#0f2742').font('Helvetica-Bold').fontSize(13).text(title);
  doc.moveDown(0.2);
  doc.strokeColor('#d5e0ea').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
}

function bullet(doc: PDFKit.PDFDocument, text: string, indent = 14): void {
  doc.fillColor('#203243').font('Helvetica').fontSize(10.5).text(`• ${text}`, {
    indent,
    lineGap: 2,
  });
}

export async function generateCvPdfBuffer(data: CVData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `CV ${data.header.name}`,
      Author: data.header.name,
      Subject: 'Curriculum Vitae',
      Keywords: 'CV, Resume, Raul Gonzalez',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

  doc.fillColor('#0f2742').font('Helvetica-Bold').fontSize(24).text(data.header.name, { align: 'left' });
  doc.fillColor('#2f74b5').font('Helvetica-Bold').fontSize(13).text(data.header.role);
  if (data.header.title) {
    doc.fillColor('#4a5f73').font('Helvetica').fontSize(11).text(data.header.title);
  }

  doc.moveDown(0.5);
  doc.fillColor('#203243').font('Helvetica').fontSize(10.5).text(data.header.vision, {
    lineGap: 3,
  });

  sectionTitle(doc, 'Contacto');
  bullet(doc, `Teléfono: ${data.contact.phone}`);
  bullet(doc, `Email: ${data.contact.email}`);
  bullet(doc, `Ubicación: ${data.contact.location}`);
  bullet(doc, `Web: ${data.contact.website}`);

  sectionTitle(doc, 'Sobre mí');
  doc.fillColor('#203243').font('Helvetica').fontSize(10.5).text(data.about, {
    lineGap: 3,
  });

  sectionTitle(doc, 'Experiencia');
  data.experience.forEach((item) => {
    doc.fillColor('#0f2742').font('Helvetica-Bold').fontSize(11.5).text(`${item.role} — ${item.company}`);
    doc.fillColor('#4a5f73').font('Helvetica').fontSize(10).text(`${item.period} | ${item.location}`);
    item.highlights.forEach((h) => bullet(doc, h, 10));
    doc.moveDown(0.4);
    if (doc.y > 720) doc.addPage();
  });

  sectionTitle(doc, 'Habilidades técnicas');
  doc.fillColor('#203243').font('Helvetica').fontSize(10.5).text(data.skills.technical.join(' · '), {
    lineGap: 3,
  });

  sectionTitle(doc, 'Competencias');
  doc.fillColor('#203243').font('Helvetica').fontSize(10.5).text(data.skills.competencies.join(' · '), {
    lineGap: 3,
  });

  sectionTitle(doc, 'Certificaciones');
  data.certifications.forEach((c) => {
    bullet(doc, `${c.title} (${c.code}, ${c.year}) — ID: ${c.id}`, 10);
  });

  sectionTitle(doc, 'Conferencias');
  data.conferences.forEach((c) => {
    bullet(doc, `${c.title} — ${c.event} (${c.location})`, 10);
  });

  sectionTitle(doc, 'Proyectos');
  data.projects.forEach((p) => {
    doc.fillColor('#0f2742').font('Helvetica-Bold').fontSize(10.5).text(p.name);
    doc.fillColor('#203243').font('Helvetica').fontSize(10).text(p.description);
    doc.fillColor('#2f74b5').font('Helvetica').fontSize(9.5).text(p.url);
    doc.moveDown(0.25);
  });

  doc.end();

  return await new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}
