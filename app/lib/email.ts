import { Resend } from "resend";
import { appendEmailLog } from "@/app/lib/emailLogStore";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM = process.env.HIRELY_EMAIL_FROM ?? "Hirely Coach <no-reply@hirelycoach.com>";

let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing. Configure environment variables and DNS SPF/DKIM.");
  }
  if (!resendClient) resendClient = new Resend(RESEND_API_KEY);
  return resendClient;
}

export async function sendFoundationEmail(input: {
  to: string;
  template: string;
  subject: string;
  bodyText: string;
}): Promise<{ ok: boolean; providerMessageId: string | null; error?: string }> {
  try {
    const resend = getResendClient();
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.bodyText,
    });

    const providerMessageId = (result.data?.id ?? null) as string | null;

    appendEmailLog({
      email: input.to,
      template: input.template,
      subject: input.subject,
      status: "sent",
      provider: "resend",
      providerMessageId,
      error: null,
    });

    return { ok: true, providerMessageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email failure";
    appendEmailLog({
      email: input.to,
      template: input.template,
      subject: input.subject,
      status: "failed",
      provider: "resend",
      providerMessageId: null,
      error: message,
    });
    return { ok: false, providerMessageId: null, error: message };
  }
}
