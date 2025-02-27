import express from "express";
import fetch from "node-fetch";
import { storage } from "../storage";

const router = express.Router();

// This would be populated from environment variables in production
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || "";
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
const REDIRECT_URI = process.env.REDIRECT_URI || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/facebook/callback`;

// Step 1: Redirect user to Facebook for authorization
router.get("/api/facebook/auth", (req, res) => {
  if (!FACEBOOK_APP_ID) {
    return res.status(400).json({ error: "Facebook App ID not configured" });
  }

  // Store a state parameter in session to prevent CSRF
  const state = Math.random().toString(36).substring(2, 15);
  if (req.session) {
    // Explicitly define the custom property on the session
    req.session.fbState = state;
  }

  // Facebook permissions needed for page management and posting
  const scope = "pages_show_list,pages_read_engagement,pages_manage_posts";

  // Redirect to Facebook authorization endpoint
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${encodeURIComponent(scope)}`;

  console.log(`Redirecting to Facebook OAuth URL: ${authUrl}`);
  console.log(`REDIRECT_URI set to: ${REDIRECT_URI}`);

  res.redirect(authUrl);
});

// Step 2: Handle the callback from Facebook after authorization
router.get("/api/facebook/callback", async (req, res) => {
  // Verify the state parameter to prevent CSRF attacks
  const { code, state } = req.query;
  const stateFromSession = req.session?.fbState;

  if (!stateFromSession || state !== stateFromSession) {
    return res.status(403).json({ error: "Invalid state parameter" });
  }

  if (!code) {
    return res.status(400).json({ error: "Authorization code not received" });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`,
      { method: "GET" }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json() as any;
      throw new Error(errorData.error?.message || "Failed to exchange code for access token");
    }

    const tokenData = await tokenResponse.json() as { access_token: string };
    const userAccessToken = tokenData.access_token;

    // Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${userAccessToken}`,
      { method: "GET" }
    );

    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json() as any;
      throw new Error(errorData.error?.message || "Failed to get pages");
    }

    const pagesData = await pagesResponse.json() as { data: any[] };

    // Format page data for storage
    const pages = pagesData.data.map((page: any) => ({
      name: page.name,
      pageId: page.id,
      accessToken: page.access_token // Page access token, not user access token
    }));

    // Save Facebook page tokens to settings
    const settings = await storage.getSettings();
    const updatedSettings = {
      ...settings,
      "Facebook": {
        enabled: true,
        additionalConfig: {
          pages: JSON.stringify(pages)
        }
      }
    };
    await storage.updateSettings(updatedSettings);

    // Redirect to settings page with success status
    res.redirect(`/settings?facebook=success`);
  } catch (error) {
    console.error("Facebook OAuth error:", error);
    res.redirect(`/settings?facebook=error&message=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`);
  }
});

export default router;