import { NextResponse } from "next/server";

import { getAuthenticatedEmail } from "./session-store";
import { isAllowedOperator } from "./auth";

export async function requireOperatorForRoute() {
  const email = await getAuthenticatedEmail();
  if (!isAllowedOperator(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
