# ALIXVI — public AI video studio

ALIXVI is a Next.js creator platform for short video and script-to-scene movie workflows. This beta includes account signup, a two-video trial, server-side video generation, a creator account page, and a verified Flutterwave checkout integration.

## Product and pricing
- Public signup for creators.
- Every new account receives **2 free video-generation credits**.
- Creator Monthly membership: **3,000 RWF per month**.
- A successful 3,000 RWF payment activates the monthly membership for one month.
- While the paid period is active, members can generate videos without consuming the two beginner trial uses.
- Renewals are manual for both card and mobile-money payments in this build.

## Stack
- Next.js 14 / React 18 / TypeScript.
- Supabase Auth and Postgres.
- fal.ai queue API for MiniMax H3 Max video generation.
- Flutterwave Standard hosted checkout for Rwanda Mobile Money and card payments.

## Setup

### Existing ALIXVI Supabase project

The connected ALIXVI Supabase project already has its own schema:
- `alixvi_profiles`
- `alixvi_video_generations`
- `alixvi_subscriptions`
- `alixvi_payments`

The auth trigger creates an `alixvi_profiles` row for each new Supabase Auth user. The current code update reads the account dashboard from these tables and uses the project's **publishable key** for browser/server SSR clients.

**Important:** migrations `001`–`003` are retained legacy examples for an older schema (`profiles`, `generation_jobs`, and `payments`). Do not apply those three legacy migrations to the already-connected project. The live ALIXVI project uses the `alixvi_*` tables. The current payment migration `008` adapts verified Flutterwave activation to that schema.

The Movie Library migration (`202611150004_movie_library.sql`) creates saved movie timelines. The generation-jobs migration (`202611150005_generation_jobs_and_trial_credits.sql`) connects video generation to the current `alixvi_*` billing schema. Migration `006` hardens server-only refund functions, `007` adds the payment-subscription foreign-key index, and `008` adds Flutterwave payment verification, subscription activation and cancellation-state RPCs. Migrations `004` through `009` have been applied to the connected Supabase project.

### Environment

1. Copy `.env.example` to `.env.local`.
2. Set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - server-only `SUPABASE_SERVICE_ROLE_KEY` (never expose it in a `NEXT_PUBLIC_` variable)
   - `FAL_KEY` for fal.ai rendering
   - `NEXT_PUBLIC_SITE_URL`
   - `FLW_SECRET_KEY` and `FLW_SECRET_HASH` from your Flutterwave merchant dashboard (keep both server-side).
3. In Supabase Auth settings, enable email/password and add the local and production callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_DOMAIN/auth/callback`
4. Run `npm install`, then `npm run dev`.

Email confirmation is handled by `/auth/callback`, which exchanges the confirmation code for a cookie-backed session and redirects the user to `/account`.


## Flutterwave test-mode checklist

1. Create/sign in to a Flutterwave merchant account and switch the dashboard to **Test mode**.
2. Copy the test secret key into `FLW_SECRET_KEY` and set a random webhook secret in the dashboard and `FLW_SECRET_HASH`.
3. Deploy the app to a reachable HTTPS URL (or use a secure tunnel for local development), then set `NEXT_PUBLIC_SITE_URL` to that exact origin.
4. In Flutterwave Settings → Webhooks, register `https://YOUR_DOMAIN/api/payments/webhook`, enable charge-completed events, and use the same webhook secret hash.
5. Sign in to ALIXVI, open `/account`, and run separate test checkouts for **card** and **Rwanda Mobile Money**. In Rwanda, Flutterwave's Mobile Money flow offers MTN and Airtel; the user selects the network and enters their number in hosted checkout.
6. Confirm each test appears as `successful` in Flutterwave, in ALIXVI payment history, and creates/extends one active subscription for exactly one month. Also test cancelled, failed, and pending transactions; none may unlock membership.
7. Repeat only after switching to live keys and completing Flutterwave merchant verification. Never put the secret key or webhook hash in a `NEXT_PUBLIC_` variable or browser code.

Flutterwave's current Rwanda docs list card and Rwanda Mobile Money as the supported RWF payment options. Test-mode Rwandan mobile-money transactions are automatically authorized after a few seconds. The app uses the hosted checkout option `card` or `mobilemoneyrwanda`, so MTN/Airtel network selection happens inside Flutterwave checkout.

## Payment security
- Checkout amount, currency, and user ID are chosen server-side; the browser cannot choose the price.
- The server creates a unique pending payment row before requesting Flutterwave hosted checkout.
- The browser redirect does **not** activate an account by itself. The callback and webhook both verify the transaction server-side against Flutterwave's transaction verification endpoint; the verified transaction ID must match the callback/webhook ID and the unique ALIXVI reference.
- Webhooks validate the current Flutterwave `flutterwave-signature` HMAC-SHA256 header over the raw request body using constant-time comparison.
- A Postgres security-definer RPC restricted to `service_role` applies verified payments atomically and idempotently by provider transaction ID, then creates or extends the monthly subscription period.
- A cancelled membership remains usable until its already-paid-through date; a past-due membership cannot generate paid videos.
- Supabase RLS lets users read only their own payment history. Service-role and Flutterwave secrets remain server-only.
- Configure webhook retries in Flutterwave. Monitor webhook failures and reconcile unsettled payments before production launch.

## Payment methods and renewal behavior
- **Visa / Mastercard:** card checkout in RWF.
- **MTN MoMo / Airtel Money:** both are presented through Flutterwave's Rwanda Mobile Money option.
- All four methods use Flutterwave hosted checkout; membership renewal is manual each month. The account dashboard cannot distinguish the specific card brand or MoMo network from the current generic Flutterwave ledger.
- Flutterwave must approve and enable the merchant account and methods before real payments can be collected. This repository contains integration code, not merchant credentials or approval.

## Generation behavior and current limits
- Short mode creates one 8-second clip.
- Movie mode currently breaks a script into up to 12 scenes and renders them sequentially. Each rendered scene uses one video credit.
- Completed scene MP4 links are saved on each generation job. The movie editor can import completed scenes belonging to the signed-in user.
- The editor can combine 2–20 clips into one downloadable MP4. Character-reference conditioning, persistent media storage, a render worker, retry/cancel controls, captions, soundtrack and transitions remain future work.

## Before public launch
- Configure test and live Flutterwave credentials, complete merchant verification, and run successful/failed/pending payment tests for cards and both Rwanda mobile-money networks.
- If automatic card renewal is added later, configure and test the Flutterwave recurring plan and its renewal webhook path before enabling it.
- Publish clear fair-use, cancellation, refund, and manual-renewal terms.
- Add email verification, password reset, privacy policy, terms, content moderation, abuse protection, rate limits and operational monitoring.
- Add a durable media bucket and FFmpeg-based final movie stitching.
- Run `npm run build` and end-to-end tests with real Supabase and provider test credentials before accepting public users.


## Movie editor and MP4 export

The `/movie-editor` page lets a signed-in user load completed renders saved in `generation_jobs`, select scenes, arrange 2–20 clips, and export them as one MP4. The `/api/scenes` endpoint returns only completed renders owned by the authenticated user. The server downloads the clips, normalizes video/audio streams with FFmpeg, concatenates them in order, and returns the MP4 to the browser.

Setup and deployment notes:
- Run `npm install` to install `ffmpeg-static`.
- Deploy on a Node.js runtime that permits the FFmpeg binary and temporary disk writes.
- The export route allows up to 20 scenes and 100 MB per clip; it has a 300-second execution limit. Serverless providers may impose stricter limits. For long movies, move rendering to a background worker and object storage.
- Accepted media hosts are `fal.media`, `v3.fal.media`, and `storage.googleapis.com`. Add another exact hostname only after verifying it is an official provider media domain.
- The editor imports only jobs whose status has been updated to `COMPLETED` by checking the render status endpoint; if a render has just finished, refresh its status in the generation flow and then reload the completed-scene list. Export currently joins clips and normalizes them to H.264/AAC at 30 fps. Transitions, voiceover, music, subtitles, title cards, and persistent MP4 binary storage are not included yet.
- Export requires a signed-in Supabase user. URLs must be HTTPS and use an allowlisted host; arbitrary local paths are rejected.


## Saved Movie Library

The `/movie-editor` page includes a per-user Movie Library. It saves a movie title and its ordered scene timeline (including source URLs) to the `movie_projects` table. Users can reopen or delete their own saved timelines. Run migration `202611150004_movie_library.sql` before using this feature. The exported MP4 itself is still downloaded to the browser and is not stored permanently; durable MP4 storage requires a configured Supabase Storage bucket or object-storage provider.


## Integration status (this build)

- **Connected to the existing Supabase schema:** browser/server auth clients accept the project's publishable key; email confirmation callback is implemented; account overview reads the live `alixvi_*` profile, subscription, and payment tables.
- **Connected to the live schema:** account overview, trial-credit generation flow, movie library and Flutterwave checkout/webhook routes use the current `alixvi_*` tables and server-only RPCs.
- **Not live-tested:** dependency-installed production build, email delivery, production redirect URLs, fal.ai generation, real/test payment collection, and deployment. No provider credentials are included in this ZIP. Merchant approval and enabling all four payment methods are still required.
