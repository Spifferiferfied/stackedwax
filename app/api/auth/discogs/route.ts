import { OAuth } from "oauth"
import { NextResponse } from "next/server"

const oauth = new OAuth(
  "https://api.discogs.com/oauth/request_token",
  "https://api.discogs.com/oauth/access_token",
  process.env.DISCOGS_CONSUMER_KEY!,
  process.env.DISCOGS_CONSUMER_SECRET!,
  "1.0A",
  process.env.DISCOGS_CALLBACK_URL!,
  "HMAC-SHA1"
)

export async function GET() {
  return new Promise<NextResponse>((resolve) => {
    oauth.getOAuthRequestToken((error, oauthToken, oauthTokenSecret) => {
      if (error) {
        resolve(
          NextResponse.json(
            { error: "Failed to get request token" },
            { status: 500 }
          )
        )
        return
      }

      const response = NextResponse.redirect(
        `https://www.discogs.com/oauth/authorize?oauth_token=${oauthToken}`
      )

      // Store the token secret in a short-lived httpOnly cookie so we can
      // retrieve it in the callback route
      response.cookies.set("discogs_oauth_token_secret", oauthTokenSecret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10, // 10 minutes
        path: "/",
      })

      resolve(response)
    })
  })
}
