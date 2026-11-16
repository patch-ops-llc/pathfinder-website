# Pathfinder/LL&D Insurance Group website

The replacement for pathfinderlld.com. Static pages built with Astro, native forms (Preact islands) and a small Node server that handles form submissions: each one sends an email alert through Resend and is submitted to HubSpot.

This directory is self-contained. It can be the root of its own repository without changes.

## Requirements

- Node 22 or newer
- npm

## Run it locally

```bash
npm install
npm run dev        # dev server with hot reload, http://localhost:4321
```

To run the production build locally:

```bash
npm run build
npm start          # http://localhost:4321
```

No configuration is needed locally. With nothing set:

- every form works end to end;
- each alert email is written to `.data/outbox/<timestamp>-<form>-<id>/` (HTML, text, attachments) instead of being sent;
- HubSpot is off, and the payload that would have been sent is written to `.data/hubspot/`.

Copy `.env.example` to `.env` to change that. `.env` is read only outside production.

## Checks

```bash
npm test           # unit and pipeline tests (mock Resend, HubSpot and webhook servers)
npm run check      # type check
```

## Configuration

Every variable is documented in `.env.example`. The ones production needs:

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Public address, no trailing slash. Needed at build time and at run time. |
| `RESEND_API_KEY` | Resend API key ("Sending access" is enough). |
| `EMAIL_FROM` | From address on a domain verified in Resend. |
| `ALERT_EMAIL_TO` | Alert recipients, comma separated. `ALERT_EMAIL_TO_<FORM>` overrides it for one form. |
| `FORM_TOKEN_SECRET` | Random secret that signs form tokens. |
| `HUBSPOT_ENABLED` | `true` to submit to HubSpot. Off by default so test environments never write to the CRM. |
| `HUBSPOT_PORTAL_ID` | HubSpot account ID (the current site uses `3806082`). |

Optional: `ALLOWED_ORIGINS`, `CANONICAL_HOST`, `ALERT_EMAIL_CC`, `HUBSPOT_FORM_<FORM>`, `HUBSPOT_SUMMARY_PROPERTY`, `SUBMISSION_WEBHOOK_URL`, `SUBMISSION_WEBHOOK_SECRET`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_SECONDS`.

If production starts without a required value, the server logs a `[config]` warning for each one at startup. `GET /api/health` reports which deliveries are active (email provider, HubSpot, webhook, Turnstile) and how many warnings there are, never any values.

## Deploy to Railway

The repository ships a `Dockerfile` and `railway.json`. Railway builds the image, starts `node server.mjs`, and checks `/api/health`.

1. Create a Railway service from the repository. If this directory is not the repository root, set the service's root directory to it.
2. Add the variables from the table above. `SITE_URL` must be set before the first build because canonical links, the sitemap and structured data are generated at build time. Railway passes service variables to the Docker build.
3. Until the custom domain is live, add the Railway domain to `ALLOWED_ORIGINS` (for example `https://<service>.up.railway.app`) so the forms accept posts from it.
4. In Resend, verify the sending domain (SPF and DKIM DNS records) and use an address on it for `EMAIL_FROM`.
5. Deploy, submit each form once, and confirm the alert arrives.
6. Set `HUBSPOT_ENABLED=true` when the forms should write to HubSpot.
7. Point the domain at Railway and set `CANONICAL_HOST` (for example `www.pathfinderlld.com`) so the other host variant redirects.

Railway sets `PORT`; the server listens on it on `0.0.0.0`. The run stage of the image contains only `dist/`, `server.mjs` and `package.json`; the server bundle has no runtime dependencies.

The server holds no state. Rate-limit counters and used form tokens live in memory, so they reset on restart and are per instance. Run a single instance, or add Turnstile if you scale out.

## Forms

All 14 forms are defined as data in `src/forms/defs/`. The same definition drives the browser form, client validation, server validation, the alert email and the HubSpot mapping.

| Form id | Page | HubSpot form by default |
| --- | --- | --- |
| `lead-energy`, `lead-contractors`, `lead-employee-benefits`, `lead-contact` | Line pages, `/contact/` | General "Let's Talk" |
| `lead-professional-services` | `/professional-services-insurance/` | Professional Services |
| `lead-real-estate` | `/real-estate-insurance/` | Real Estate |
| `lead-non-profit` | `/non-profit-insurance/` | Non-Profit |
| `lead-collections` | `/collections-insurance/` | Collections |
| `lead-home-auto` | `/home-and-auto-insurance/` | Home and Auto |
| `home-quote` | `/home-insurance-quote/` | Home and Auto |
| `auto-quote` | `/auto-quote/` | Home and Auto |
| `professional-liability-quote` | `/professional-liability-quote/` | Professional Services |
| `careers` | `/careers/` | none until `HUBSPOT_FORM_CAREERS` is set |
| `check-draft` | `/make-a-payment/check-draft/` | none until `HUBSPOT_FORM_CHECK_DRAFT` is set |

What happens to a submission (`src/server/submit.ts`):

1. Origin check, rate limit, honeypot, signed time token, optional Turnstile.
2. Server-side validation against the form definition. Uploads are checked by size, count and file signature.
3. HubSpot and the optional webhook are called. Contact fields map to HubSpot contact properties; the longer forms also send a readable summary to the property named by `HUBSPOT_SUMMARY_PROPERTY`.
4. The alert email is sent with every answer and all attachments. It states whether HubSpot received the submission.

Sensitive answers (dates of birth, driver's licence numbers, the check image, signatures, the felony question) go in the alert email only. They are never sent to HubSpot or the webhook and never logged. Logs contain form id, submission id and delivery results, no personal data.

The quote, careers and check draft forms are accepted only when the alert email was sent. The "Let's Talk" forms are accepted when either the email or HubSpot succeeded.

### Social Security number on the careers form

The previous application asked for an SSN. The field is off. To restore it, set `collectSsnOnCareersForm` to `true` in `src/config/features.ts` and rebuild. It is then required, masked, and sent in the alert email only.

## Project layout

```
src/pages/          Pages and API routes (api/forms/[form].ts, api/forms/token.ts, api/health.ts)
src/components/     Layout pieces and the form renderer (components/forms/)
src/content/        Site copy: lines of coverage, team, FAQs, the incident notice
src/forms/          Form definitions and the shared validation logic
src/server/         Submission pipeline, email providers, HubSpot, security
src/lib/routes.ts   Page list that drives the sitemap and llms.txt
server.mjs          Production server: static files, redirects, security headers, API
scripts/postbuild.mjs  Precompression and CSP hashes
tests/              node:test suites
```

Adding an email provider: implement the `EmailProvider` interface in `src/server/email/` and select it in `src/server/email/index.ts`.

Old URLs from the WordPress site are redirected in the `REDIRECTS` map in `server.mjs`.
