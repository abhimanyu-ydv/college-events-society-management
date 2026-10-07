import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

function getClient() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string | Buffer }[];
}) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    console.warn("RESEND_FROM_EMAIL is not set — skipping email send.");
    return;
  }

  const { error } = await getClient().emails.send({ from, to, subject, html, attachments });
  if (error) {
    console.error("Failed to send email", { to, subject, error });
  }
}
