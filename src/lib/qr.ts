import "server-only";
import QRCode from "qrcode";

export async function generateTicketQrDataUrl(qrToken: string) {
  return QRCode.toDataURL(qrToken, { margin: 1, width: 240 });
}
