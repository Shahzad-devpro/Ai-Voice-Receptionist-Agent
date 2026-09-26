import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const STALE_AFTER_MINUTES = 30;

function isAuthorizedCronRequest(
  request: Request
): boolean {
  const authorization =
    request.headers.get(
      "authorization"
    );

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

async function cleanupStaleSessions() {
  const supabase =
    createAdminClient();

  const cutoff =
    new Date(
      Date.now() -
        STALE_AFTER_MINUTES *
          60 *
          1000
    ).toISOString();

  /*
   * Find every ACTIVE voice session
   * that has been running for more than
   * the allowed stale-session window.
   */
  const {
    data: staleSessions,
    error: selectError,
  } = await supabase
    .from("voice_sessions")
    .select(
      "id, business_id"
    )
    .eq(
      "session_status",
      "ACTIVE"
    )
    .lt(
      "started_at",
      cutoff
    );

  if (selectError) {
    throw new Error(
      selectError.message
    );
  }

  if (
    !staleSessions ||
    staleSessions.length === 0
  ) {
    return 0;
  }

  const sessionIds =
    staleSessions.map(
      (session) => session.id
    );

  const endedAt =
    new Date().toISOString();

  /*
   * Only update sessions that are
   * still ACTIVE.
   *
   * This prevents the cleanup job from
   * overwriting a session that completed
   * normally while this query was running.
   */
  const {
    data: updatedSessions,
    error: updateError,
  } = await supabase
    .from("voice_sessions")
    .update({
      session_status:
        "FAILED",
      ended_at: endedAt,
      updated_at: endedAt,
    })
    .eq(
      "session_status",
      "ACTIVE"
    )
    .in(
      "id",
      sessionIds
    )
    .select("id");

  if (updateError) {
    throw new Error(
      updateError.message
    );
  }

  return updatedSessions?.length ?? 0;
}

export async function GET(
  request: Request
) {
  try {
    if (
      !isAuthorizedCronRequest(
        request
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const cleaned =
      await cleanupStaleSessions();

    return NextResponse.json({
      success: true,
      cleaned,
      staleAfterMinutes:
        STALE_AFTER_MINUTES,
    });
  } catch (error) {
    console.error(
      "Voice session cleanup failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Voice session cleanup failed.",
      },
      { status: 500 }
    );
  }
}

