import {
  normalizeWorkspaceSearchQuery,
  searchWorkspaceForClerkUser,
} from "@/lib/workspace-search";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const responseOptions = {
  headers: { "Cache-Control": "private, no-store" },
};

export async function GET(request: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json(
      { error: { code: "not_authenticated", message: "Sign in to search this workspace." } },
      { status: 401, ...responseOptions }
    );
  }

  const queryResult = normalizeWorkspaceSearchQuery(new URL(request.url).searchParams.get("q"));
  if (!queryResult.ok) {
    return NextResponse.json(
      { error: { code: queryResult.code, message: queryResult.message } },
      { status: 400, ...responseOptions }
    );
  }

  const results = await searchWorkspaceForClerkUser(clerkUser.id, queryResult.query);
  if (!results) {
    return NextResponse.json(
      { error: { code: "user_not_found", message: "Your AP3K account could not be found." } },
      { status: 404, ...responseOptions }
    );
  }

  return NextResponse.json(
    { query: queryResult.query, results },
    { status: 200, ...responseOptions }
  );
}
