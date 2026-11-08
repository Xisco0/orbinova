import { NextRequest, NextResponse } from "next/server";
import { emailQueue } from "@/lib/email/emailQueue";
import { emailOutbox } from "@/lib/email/emailOutbox";
import { emailDeliveryLedger } from "@/lib/email/emailDeliveryLedger";

/**
 * ORBINOVA EMAIL QUEUE STATUS & MONITORING ENDPOINT
 */
export async function GET(req: NextRequest) {
  try {
    const deadLetters = emailQueue.getDeadLetterJobs();
    const pendingOutbox = emailOutbox.getPendingEvents();
    const recentDeliveries = emailDeliveryLedger.query({ limit: 20 });

    return NextResponse.json({
      success: true,
      queue: {
        deadLetterCount: deadLetters.length,
        deadLetters: deadLetters.map((d) => ({
          id: d.id,
          recipient: typeof d.payload.to === "string" ? d.payload.to : (d.payload.to as any).email,
          category: d.category,
          failureReason: d.failureReason,
          attempts: d.attempts,
          lastAttemptAt: d.lastAttemptAt,
        })),
      },
      outbox: {
        pendingCount: pendingOutbox.length,
      },
      recentDeliveries: recentDeliveries.map((d) => ({
        id: d.id,
        recipient: d.recipient,
        category: d.category,
        subject: d.subject,
        status: d.status,
        provider: d.provider,
        attempts: d.attempts,
        createdAt: d.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Trigger explicit batch processing (e.g. via Vercel Cron or Cloud Tasks)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Publish any pending outbox events
    const publishedFromOutbox = await emailOutbox.publishPending();

    // 2. Process ready jobs in the queue
    const processedJobs = await emailQueue.processNextBatch();

    return NextResponse.json({
      success: true,
      publishedFromOutbox,
      processedJobs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
