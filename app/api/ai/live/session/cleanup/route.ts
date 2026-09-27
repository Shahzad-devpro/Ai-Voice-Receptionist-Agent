import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const STALE_AFTER_MINUTES = 30;

function isAuthorizedCronRequest(
  request: Request
): boolean {
  const authorization =
    request.headers.get("authorization");

  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  return (
    authorization ===
    `Bearer ${cronSecret}`
  );
}

async function cleanupStaleSessions(): Promise<number> {
  const supabase = createAdminClient();

  const cutoff = new Date(
    Date.now() -
      STALE_AFTER_MINUTES * 60 * 1000
  ).toISOString();

  const {
    data: staleSessions,
    error: selectError,
  } = await supabase
    .from("voice_sessions")
    .select("id")
    .eq("session_status", "ACTIVE")
    .lt("started_at", cutoff);

 if (selectError) {
  console.error(
    "Failed to find stale voice sessions:",
    selectError
  );

  throw new Error(
    "Failed to find stale voice sessions."
  );
}

  if (
    !staleSessions ||
    staleSessions.length === 0
  ) {
    return 0;
  }

  const sessionIds = staleSessions.map(
    (session) => session.id
  );

  const endedAt =
    new Date().toISOString();

  /*
   * Only ACTIVE sessions are updated.
   * A session that completed while the
   * cleanup query was running will therefore
   * not be overwritten.
   */
  const {
    data: updatedSessions,
    error: updateError,
  } = await supabase
    .from("voice_sessions")
    .update({
      session_status: "FAILED",
      ended_at: endedAt,
      updated_at: endedAt,
    })
    .eq("session_status", "ACTIVE")
    .in("id", sessionIds)
    .select("id");

 if (updateError) {
  console.error(
    "Failed to clean stale voice sessions:",
    updateError
  );

  throw new Error(
    "Failed to clean stale voice sessions."
  );
}

  return updatedSessions?.length ?? 0;
}

export async function GET(
  request: Request
) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  try {
    const cleaned =
      await cleanupStaleSessions();

    return NextResponse.json({
      success: true,
      cleaned,
      staleAfterMinutes:
        STALE_AFTER_MINUTES,
    });
  }  
   catch (error) {
    console.error(
      "Voice session cleanup failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Voice session cleanup failed.",
      },
      { status: 500 }
    );
  }
}

