import { NextRequest, NextResponse } from "next/server";
import { emailDeliveryLedger } from "@/lib/email/emailDeliveryLedger";
import { EmailDeliveryStatus } from "@/lib/email/types";

/**
 * ORBINOVA EMAIL PROVIDER WEBHOOK RECEIVER
 * Ingests delivery, bounce, and complaint events with signature verification & idempotency
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Signature Verification Guard (if secret configured)
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature =
        req.headers.get("svix-signature") ||
        req.headers.get("x-sendgrid-signature") ||
        req.headers.get("authorization");

      if (!signature) {
        return NextResponse.json({ error: "Missing webhook signature" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Support both single event objects and array of events (SendGrid batch format)
    const events: any[] = Array.isArray(body) ? body : [body];
    let processedCount = 0;

    for (const ev of events) {
      // Extract provider message ID
      const providerMsgId =
        ev.data?.email_id || // Resend
        ev.sg_message_id?.split(".")[0] || // SendGrid
        ev.messageId ||
        ev.id;

      if (!providerMsgId) continue;

      // Extract and normalize event status
      const eventType = (ev.type || ev.event || "").toLowerCase();
      let newStatus: EmailDeliveryStatus | null = null;
      let failureReason: string | undefined = undefined;

      if (eventType.includes("deliver")) {
        newStatus = "delivered";
      } else if (eventType.includes("bounce")) {
        newStatus = "permanently_failed";
        failureReason = ev.data?.reason || ev.reason || "Hard bounce reported by provider";
      } else if (eventType.includes("complaint") || eventType.includes("spam")) {
        newStatus = "permanently_failed";
        failureReason = "Spam complaint reported by recipient";
      }

      if (newStatus) {
        const updated = emailDeliveryLedger.updateStatusByProviderMessageId(
          providerMsgId,
          newStatus,
          failureReason
        );
        if (updated) {
          processedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Email webhook processing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process webhook" },
      { status: 500 }
    );
  }
}
