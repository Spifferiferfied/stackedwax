import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const username = request.cookies.get("session_username")?.value

  if (!username) {
    return NextResponse.json({ user: null }, { status: 200 })
  }

  return NextResponse.json({ user: { username } }, { status: 200 })
}
