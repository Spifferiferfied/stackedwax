import { OAuth } from "oauth"
import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

const oauth = new OAuth(
  "https://api.discogs.com/oauth/request_token",
  "https://api.discogs.com/oauth/access_token",
  process.env.DISCOGS_CONSUMER_KEY!,
  process.env.DISCOGS_CONSUMER_SECRET!,
  "1.0A",
  process.env.DISCOGS_CALLBACK_URL!,
  "HMAC-SHA1"
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const oauthToken = searchParams.get("oauth_token")
  const oauthVerifier = searchParams.get("oauth_verifier")

  if (!oauthToken || !oauthVerifier) {
    return NextResponse.json({ error: "Missing OAuth parameters" }, { status: 400 })
  }

  const oauthTokenSecret = request.cookies.get("discogs_oauth_token_secret")?.value

  if (!oauthTokenSecret) {
    return NextResponse.json({ error: "Missing OAuth token secret" }, { status: 400 })
  }

  return new Promise<NextResponse>((resolve) => {
    oauth.getOAuthAccessToken(
      oauthToken,
      oauthTokenSecret,
      oauthVerifier,
      async (error, accessToken, accessTokenSecret) => {
        if (error) {
          resolve(
            NextResponse.json(
              { error: "Failed to get access token" },
              { status: 500 }
            )
          )
          return
        }

        // Fetch the Discogs identity for this token
        let username: string
        let discogsId: number
        let consumerName: string

        try {
          const identityRes = await fetch("https://api.discogs.com/oauth/identity", {
            headers: {
              Authorization: `OAuth oauth_consumer_key="${process.env.DISCOGS_CONSUMER_KEY}", oauth_token="${accessToken}", oauth_signature_method="PLAINTEXT", oauth_timestamp="${Math.floor(Date.now() / 1000)}", oauth_nonce="${Math.random()}", oauth_version="1.0", oauth_signature="${process.env.DISCOGS_CONSUMER_SECRET}&${accessTokenSecret}"`,
              "User-Agent": "StackedWaxApp/1.0 +https://stackedwax.com",
            },
          })

          if (!identityRes.ok) {
            resolve(
              NextResponse.json({ error: "Failed to fetch Discogs identity" }, { status: 500 })
            )
            return
          }

          const identity = await identityRes.json()
          username = identity.username
          discogsId = identity.id
          consumerName = identity.consumer_name ?? null
        } catch {
          resolve(
            NextResponse.json({ error: "Failed to fetch Discogs identity" }, { status: 500 })
          )
          return
        }

        // Upsert the user into Supabase
        const { error: dbError } = await supabase.from("users").upsert(
          {
            username,
            discogs_id: discogsId,
            access_token: accessToken,
            access_token_secret: accessTokenSecret,
            consumer_name: consumerName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "username" }
        )

        if (dbError) {
          resolve(
            NextResponse.json({ error: "Failed to save user" }, { status: 500 })
          )
          return
        }

        // Set session cookie and redirect to the user's collection page
        const response = NextResponse.redirect(
          new URL(`/${username}`, request.url)
        )

        response.cookies.set("session_username", username, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: "/",
        })

        // Clear the temporary token secret cookie
        response.cookies.delete("discogs_oauth_token_secret")

        resolve(response)
      }
    )
  })
}
