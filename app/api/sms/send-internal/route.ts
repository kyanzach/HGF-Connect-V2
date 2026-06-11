import { NextRequest, NextResponse } from "next/server";
import { sendSms } from "@/lib/sms";

// POST /api/sms/send-internal — Internal SMS gateway for legacy app proxying
export async function POST(request: NextRequest) {
  const apiKeyHeader = request.headers.get("X-Internal-API-Key");
  const expectedApiKey = process.env.INTERNAL_API_KEY;

  if (!expectedApiKey || apiKeyHeader !== expectedApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { number, message, memberId, senderId } = body;

    if (!number || !message) {
      return NextResponse.json(
        { error: "Parameters 'number' and 'message' are required" },
        { status: 400 }
      );
    }

    const result = await sendSms(
      number,
      message,
      memberId ? parseInt(memberId, 10) : undefined,
      undefined, // reminderId
      senderId
    );

    return NextResponse.json({
      success: result.success,
      status: result.status,
      error: result.error || null,
      response: result.response || null,
    });
  } catch (error: any) {
    console.error("Error in POST /api/sms/send-internal:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
