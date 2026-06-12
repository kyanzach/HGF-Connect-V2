import nodemailer from "nodemailer";

interface EmailResult {
  success: boolean;
  error?: string;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"HGF Connect" <noreply@houseofgrace.ph>`;

  // Check if SMTP is configured
  if (!host || !user || !pass) {
    const warnMsg = `[SMTP NOT CONFIGURABLE] Email to ${to} not sent. Credentials missing in env. Text: "${text}"`;
    console.warn(warnMsg);
    // Return success: true so the flow doesn't crash in dev mode when SMTP is missing,
    // but log it to allow manual verification/testing.
    return { success: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.log(`[SMTP] Email sent successfully to ${to}`);
    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.message || "Unknown SMTP error";
    console.error(`[SMTP] Failed to send email to ${to}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}
