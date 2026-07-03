import { db } from "./db";

// Dynamic Sender ID Mapping based on message contents
export function getSenderId(message: string, requestedSenderId?: string): string {
  if (process.env.ITEXMO_SENDER_ID) {
    return process.env.ITEXMO_SENDER_ID;
  }
  if (requestedSenderId) return requestedSenderId;

  const msgLower = message.toLowerCase();
  
  if (msgLower.includes("otp") || msgLower.includes("code") || msgLower.includes("temporary password") || msgLower.includes("recovery code")) {
    return "HGF Connect";
  }
  if (msgLower.includes("love gift") || msgLower.includes("stewardshop") || msgLower.includes("lovegift")) {
    return "HGF Care";
  }
  if (msgLower.includes("ministry") || msgLower.includes("roster") || msgLower.includes("schedule")) {
    return "HGFMinistry";
  }
  if (msgLower.includes("youth") || msgLower.includes("camp")) {
    return "HGF Youth";
  }
  
  // Default Sender ID mask
  return "HGF Church";
}

// Clean and format Philippine mobile number (converts 09XXXXXXXXX/9XXXXXXXXX to 639XXXXXXXXX)
export function formatPhoneNumber(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, "");
  
  if (clean.length === 11 && clean.startsWith("0")) {
    return "63" + clean.substring(1);
  }
  if (clean.length === 10 && clean.startsWith("9")) {
    return "63" + clean;
  }
  return clean;
}

// GSM-7 Basic character set sanitization to avoid Itexmo Error 50 (encoding format invalid)
export function sanitizeMessage(message: string): string {
  if (!message) return "";

  // Replace common smart characters / accents
  let sanitized = message
    .replace(/[ññ]/g, "n")
    .replace(/[ÑÑ]/g, "N")
    .replace(/[“”„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/[—–]/g, "-");

  // Filter out emojis and non-GSM-7 basic characters (only allow printable ASCII range + line break)
  // Printable ASCII is hex 20 to 7E (decimal 32 to 126). We also preserve line breaks (\n, \r).
  let filtered = "";
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    const code = sanitized.charCodeAt(i);
    
    // Printable ASCII (32-126) + newline (10) + carriage return (13)
    if ((code >= 32 && code <= 126) || code === 10 || code === 13) {
      filtered += char;
    }
  }

  return filtered;
}

interface SmsResult {
  success: boolean;
  status: "Sent" | "Failed";
  error?: string;
  response?: any;
}

export async function sendSms(
  to: string,
  message: string,
  memberId?: number,
  reminderId?: number,
  requestedSenderId?: string
): Promise<SmsResult> {
  const formattedPhone = formatPhoneNumber(to);
  const sanitizedMessage = sanitizeMessage(message);
  const senderId = getSenderId(sanitizedMessage, requestedSenderId);

  // Resolve memberId if not provided (needed for checks and non-null relation constraint)
  let resolvedMemberId = memberId;
  let isFlagged = false;

  if (resolvedMemberId) {
    try {
      const match = await db.member.findUnique({
        where: { id: resolvedMemberId },
        select: { phoneInvalid: true },
      });
      if (match?.phoneInvalid) {
        isFlagged = true;
      }
    } catch (err) {
      console.error("sendSms - failed checking member invalid status:", err);
    }
  } else {
    try {
      const match = await db.member.findFirst({
        where: { phone: { contains: formattedPhone.slice(-9) } },
        select: { id: true, phoneInvalid: true },
      });
      if (match) {
        resolvedMemberId = match.id;
        if (match.phoneInvalid) {
          isFlagged = true;
        }
      } else {
        // Fallback to first admin or first member in DB
        const admin = await db.member.findFirst({
          where: { role: "admin" },
          select: { id: true },
        });
        resolvedMemberId = admin?.id ?? 1;
      }
    } catch (dbErr: any) {
      console.error("sendSms - Failed to resolve memberId:", dbErr.message);
      resolvedMemberId = 1; // Hard fallback
    }
  }

  // Skip sending if flagged as invalid
  if (isFlagged) {
    const skipMsg = `Skipping SMS send: phone number is flagged as invalid for member ID ${resolvedMemberId}`;
    console.warn(skipMsg);
    return { success: false, status: "Failed", error: "Phone number flagged as invalid" };
  }

  // Validate number format (639XXXXXXXXX - 12 digits)
  if (!/^639[0-9]{9}$/.test(formattedPhone)) {
    const errorMsg = `Invalid Philippine mobile number format: ${to} (formatted: ${formattedPhone})`;
    console.error(`sendSms - Validation failed: ${errorMsg}`);
    
    // Automatically flag this phone number as invalid on the member record
    if (resolvedMemberId && resolvedMemberId !== 1) {
      await db.member.update({
        where: { id: resolvedMemberId },
        data: { phoneInvalid: true },
      }).catch((dbErr) => console.error(`Failed to flag invalid phone for member ID ${resolvedMemberId}:`, dbErr));
    }

    // Log failure in database
    await logToDb({
      phone: formattedPhone || to,
      message: sanitizedMessage || message,
      status: "Failed",
      error: errorMsg,
      memberId: resolvedMemberId,
      reminderId,
    });

    return { success: false, status: "Failed", error: errorMsg };
  }

  const email = process.env.ITEXMO_EMAIL;
  const password = process.env.ITEXMO_PASSWORD;
  const apiCode = process.env.ITEXMO_API_CODE;
  const apiUrl = "https://api.itexmo.com/api/broadcast";

  if (!email || !password || !apiCode) {
    const errorMsg = "Missing Itexmo SMS Gateway API credentials in environment variables.";
    console.error(errorMsg);
    
    await logToDb({
      phone: formattedPhone,
      message: sanitizedMessage,
      status: "Failed",
      error: errorMsg,
      memberId: resolvedMemberId,
      reminderId,
    });

    return { success: false, status: "Failed", error: errorMsg };
  }

  const payload = {
    Email: email,
    Password: password,
    Recipients: [formattedPhone],
    Message: sanitizedMessage,
    ApiCode: apiCode,
    SenderId: senderId,
  };

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.status === 200 && data.Error === false) {
      await logToDb({
        phone: formattedPhone,
        message: sanitizedMessage,
        status: "Sent",
        memberId: resolvedMemberId,
        reminderId,
        responseData: JSON.stringify(data),
      });

      return { success: true, status: "Sent", response: data };
    } else {
      const errorMsg = `Itexmo Error: ${data.Message || JSON.stringify(data)} (HTTP ${res.status})`;
      console.error(`sendSms - API rejection: ${errorMsg}`);

      await logToDb({
        phone: formattedPhone,
        message: sanitizedMessage,
        status: "Failed",
        error: errorMsg,
        memberId: resolvedMemberId,
        reminderId,
        responseData: JSON.stringify(data),
      });

      return { success: false, status: "Failed", error: errorMsg, response: data };
    }
  } catch (err: any) {
    const errorMsg = `Network/Connection Error: ${err.message}`;
    console.error(`sendSms - Connection failed: ${errorMsg}`);

    await logToDb({
      phone: formattedPhone,
      message: sanitizedMessage,
      status: "Failed",
      error: errorMsg,
      memberId: resolvedMemberId,
      reminderId,
    });

    return { success: false, status: "Failed", error: errorMsg };
  }
}

interface LogParams {
  phone: string;
  message: string;
  status: "Sent" | "Failed";
  error?: string;
  memberId?: number;
  reminderId?: number;
  responseData?: string;
}

async function logToDb(params: LogParams) {
  try {
    await db.smsLog.create({
      data: {
        memberId: params.memberId ?? 1,
        reminderId: params.reminderId ?? null,
        phoneNumber: params.phone,
        message: params.message,
        status: params.status === "Sent" ? "Sent" : "Failed",
        errorMessage: params.error ?? null,
        responseData: params.responseData ?? null,
      },
    });
  } catch (logErr: any) {
    console.error("logToDb - Database logging failed:", logErr.message);
  }
}
