# Gmail connection for TalentIQ

The saved-candidate status buttons open an email panel inside the dashboard. The local `npm start` command is configured with the public TalentIQ OAuth client ID, `http://localhost:4173` is an authorized JavaScript origin, the Gmail API is enabled, and `aarushfireblaze@gmail.com` is an approved test user. To read a candidate's latest Gmail conversation and send from the recruiter’s account, start the dashboard with `npm start` and click **Connect Gmail** in the panel. Google account consent must be completed by the recruiter; the dashboard never sends automatically.

For a different Google Cloud project or a deployed origin:

1. In Google Cloud, enable the Gmail API and configure an OAuth consent screen. Add the recruiter account as a test user while the app is in testing.
2. Create an OAuth client of type **Web application**. Add `http://localhost:4173` to **Authorized JavaScript origins**. Add the deployed dashboard origin when deploying.
3. Allow the Gmail scopes `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/gmail.send` on the consent screen.
4. Override the local public OAuth client ID when starting the dashboard: `GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com" npm start`.
5. Open a saved candidate, choose Continue, Waitlist, or Decline, then click **Connect Gmail** in the in-site email panel. Google consent opens once as a sign-in popup; the conversation and composer remain in TalentIQ.

The dashboard keeps the access token in memory for the current page session. It does not store a Gmail client secret or automatically send a message. Google may require OAuth app verification before broader production use.

Google references: [token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Gmail API](https://developers.google.com/workspace/gmail/api/reference/rest), [sending messages](https://developers.google.com/workspace/gmail/api/guides/sending).
