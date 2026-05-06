import { OAuth } from "oauth"
import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const oauth = new OAuth(
  "https://api.discogs.com/oauth/request_token",
  "https://api.discogs.com/oauth/access_token",
  process.env.DISCOGS_CONSUMER_KEY!,
  process.env.DISCOGS_CONSUMER_SECRET!,
  "1.0A",
  null,
  "HMAC-SHA1"
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const { searchParams } = new URL(request.url)
  const page = searchParams.get("page") ?? "1"
  const perPage = searchParams.get("per_page") ?? "100"
  const sort = searchParams.get("sort") ?? "artist"

  const { data: user, error } = await supabase
    .from("users")
    .select("access_token, access_token_secret")
    .eq("username", username)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const url = `https://api.discogs.com/users/${username}/collection/folders/0/releases?per_page=${perPage}&page=${page}&sort=${sort}`

  return new Promise<NextResponse>((resolve) => {
    oauth.get(
      url,
      user.access_token,
      user.access_token_secret,
      (err, data) => {
        if (err) {
          resolve(
            NextResponse.json({ error: "Failed to fetch collection" }, { status: 500 })
          )
          return
        }
        try {
          const parsed = JSON.parse(data as string)
          resolve(NextResponse.json(parsed))
        } catch {
          resolve(
            NextResponse.json({ error: "Invalid response from Discogs" }, { status: 500 })
          )
        }
      }
    )
  })
}
