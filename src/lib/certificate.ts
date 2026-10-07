import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateCertificatePdf({
  studentName,
  eventTitle,
  societyName,
  eventDate,
}: {
  studentName: string;
  eventTitle: string;
  societyName: string;
  eventDate: Date;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const center = (text: string, size: number, f = font) =>
    (width - f.widthOfTextAtSize(text, size)) / 2;

  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 2,
  });

  const title = "Certificate of Participation";
  page.drawText(title, { x: center(title, 32), y: height - 150, size: 32, font });

  const line1 = "This is to certify that";
  page.drawText(line1, { x: center(line1, 16, regularFont), y: height - 220, size: 16, font: regularFont });

  page.drawText(studentName, { x: center(studentName, 26), y: height - 265, size: 26, font });

  const line2 = `participated in "${eventTitle}"`;
  page.drawText(line2, { x: center(line2, 16, regularFont), y: height - 310, size: 16, font: regularFont });

  const line3 = `organised by ${societyName} on ${eventDate.toLocaleDateString()}.`;
  page.drawText(line3, { x: center(line3, 16, regularFont), y: height - 335, size: 16, font: regularFont });

  return pdf.save();
}
