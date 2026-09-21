import PDFDocument from 'pdfkit';
import { contactFieldLabel } from '../src/validation.js';

const COLOR_TEXT = '#0F2936';
const COLOR_MUTED = '#3F5A63';
const COLOR_DISQUALIFY = '#B3261E';
const COLOR_HOLD = '#8A5A00';
const COLOR_PRIMARY = '#006D77';

function formatTimestamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  }) + ' ET';
}

function drawOutcomeBanner(doc, outcome, reasons) {
  doc.moveDown(0.5);
  if (outcome === 'DISQUALIFY') {
    doc.fillColor(COLOR_DISQUALIFY).font('Helvetica-Bold').fontSize(14);
    doc.text('* DOES NOT QUALIFY *');
  } else if (outcome === 'HOLD') {
    doc.fillColor(COLOR_HOLD).font('Helvetica-Bold').fontSize(14);
    doc.text('ON HOLD');
  } else {
    doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(14);
    doc.text('QUALIFIED');
  }
  doc.fillColor(COLOR_TEXT).font('Helvetica').fontSize(10);

  if (reasons.length > 0) {
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(10).text('Every rule triggered by this submission:');
    doc.font('Helvetica').fontSize(10);
    for (const r of reasons) {
      const color = r.outcome === 'DISQUALIFY' ? COLOR_DISQUALIFY : COLOR_HOLD;
      const marker = r.outcome === 'DISQUALIFY' ? '*' : '-';
      doc.fillColor(color).text(`${marker} [${r.outcome}] ${r.questionText} — ${r.reason}`, { indent: 10 });
    }
    doc.fillColor(COLOR_TEXT);
  }

  doc.moveDown(1);
}

function drawSectionHeading(doc, text) {
  doc.moveDown(0.6);
  doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(12).text(text);
  doc.fillColor(COLOR_TEXT).font('Helvetica').fontSize(10);
  doc.moveDown(0.3);
}

/**
 * Builds the PDF record for one submission. Pure with respect to its inputs —
 * returns a Buffer, does not touch Drive/Sheets/email.
 */
export function buildRecordPdf({ config, answers, contact, source, outcome, reasons, submissionId, submittedAt }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor(COLOR_PRIMARY).font('Helvetica-Bold').fontSize(18).text(config.brand.orgName);
    doc.fillColor(COLOR_TEXT).font('Helvetica').fontSize(12).text('Host-Home Application Record');
    doc.moveDown(0.5);

    doc.fillColor(COLOR_MUTED).fontSize(9);
    doc.text(`Submission ID: ${submissionId}`);
    doc.text(`Submitted: ${formatTimestamp(submittedAt)}`);
    doc.text(`Source: ${source || '(none)'}`);
    doc.fillColor(COLOR_TEXT).fontSize(10);

    drawOutcomeBanner(doc, outcome, reasons);

    drawSectionHeading(doc, 'Contact information');
    for (const field of config.contactFields) {
      doc.font('Helvetica-Bold').text(`${contactFieldLabel(field)}: `, { continued: true });
      doc.font('Helvetica').text(contact[field] || '(not provided)');
    }

    drawSectionHeading(doc, 'Responses');
    for (const question of config.questions) {
      doc.font('Helvetica-Bold').fontSize(10).text(question.text);
      doc.font('Helvetica').fillColor(COLOR_MUTED).text(answers[question.id] || '(no answer)', { indent: 10 });
      doc.fillColor(COLOR_TEXT);
      doc.moveDown(0.4);
    }

    doc.end();
  });
}
