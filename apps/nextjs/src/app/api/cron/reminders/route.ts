import { NextResponse } from "next/server";

import { processReminders } from "@acme/api/reminders";
import { db } from "@acme/db/client";

import { env } from "~/env";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processReminders(db);

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    ...result,
  });
}
