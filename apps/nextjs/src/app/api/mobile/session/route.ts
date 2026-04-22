import { NextResponse } from "next/server";

import {
  getMobileSessionTokenFromHeaders,
  resolveSessionByToken,
} from "@acme/auth";

export async function GET(request: Request) {
  const token = getMobileSessionTokenFromHeaders(request.headers);
  if (!token) {
    return NextResponse.json(
      { error: "Missing mobile session token" },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const resolvedSession = await resolveSessionByToken(token);
  if (!resolvedSession) {
    return NextResponse.json(null, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(resolvedSession, {
    headers: { "Cache-Control": "no-store" },
  });
}
