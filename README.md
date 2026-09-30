# Hope Found Host-Home Recruitment Site

A public recruitment site for Hope Found, Inc.'s host-home program. People interested in
opening a room in their home to a person in DC's DDA program complete a short qualification
quiz. Every submission is saved to Google Drive, logged in a Google Sheet, and — if it
qualifies — routed to the recruitment team by email. This is a lead filter, not an
onboarding system: applicants never see their result, and everyone gets the same thank-you
message.

## ⚠️ Still needs Hope Found's confirmation before launch

**The following are not yet confirmed and must be resolved before the church ad campaign
goes live:**

1. **Actual DC DDA host-home qualifying criteria.** The questions and disqualify/hold rules
   in `quizConfig.json` are a first draft based on the build brief, not verified DC DDA
   standards. Have Hope Found's program team review every rule in
   [`quizConfig.json`](./quizConfig.json) against current DC DDA host-home requirements.
2. **Recruitment team email address(es).** Currently set to `recruitment@hopefoundinc.com`
   as a placeholder in `quizConfig.json` → `recipients.recruitment`.
3. **Confirmed brand hex values.** The primary teal (`#006D77`) was read from computed
   styles on hopefoundinc.com on 2026-09-21 and should be accurate, but ask Hope Found to
   confirm it (and any secondary colors) against their official brand guide if one exists.
4. **Hope Found Google account** for the Drive folder, Sheet, and service account (Phase 4).
   None of these exist yet — see "Who owns each account" below.
5. **DNS access** for `apply.hopefoundinc.com` and the email sending subdomain (Phase 7).
6. **Consent and privacy wording.** `quizConfig.json` → `consentText` reads reasonably but
   hasn't had legal review — confirm it (and whether a separate privacy policy link is
   needed) before launch.
7. **Church ad run date**, which sets the real deadline for everything above.

## Who owns each account

Hope Found, Inc. owns this project. Zuleema Isaac (Isaac & Co. Consulting) administers it
but does not own the underlying accounts. As of this writing, **none of the following exist
yet** and must be created under Hope Found's own accounts before the corresponding phase can
go live:

| Account | Used for | Needed by |
|---|---|---|
| GitHub org/account | Hosting this repo | Any deploy |
| Vercel team | Hosting the live site at `apply.hopefoundinc.com` | Phase 7 |
| Google Cloud project + service account | Writing PDFs to Drive and rows to Sheets | Phase 4 |
| Google Drive folder (`Qualified/`, `Hold/`, `Did-Not-Qualify/`) | Submission records | Phase 4 |
| Google Sheet | Submission index | Phase 4 |
| Resend account + verified subdomain of hopefoundinc.com | Applicant + team email | Phase 5 |
| DNS access to hopefoundinc.com | `apply.hopefoundinc.com` + email subdomain records | Phase 7 |

## Tech stack

- **Frontend:** Vite + React, no UI framework, dependency-light.
- **Backend:** Vercel serverless functions in `/api`.
- **Fonts:** Public Sans is self-hosted from `src/assets/fonts` (no Google Fonts, no CDN).
  Headings use Georgia (system font, no hosting needed).
- **Config-driven:** every question, outcome rule, piece of copy, and recipient list lives in
  [`quizConfig.json`](./quizConfig.json), validated against
  [`quizConfig.schema.json`](./quizConfig.schema.json). Editing criteria should never require
  touching app code — see "Editing quizConfig.json" below.
- No login, no database. Stateless intake.

## Getting started

```bash
npm install
npm run validate:config   # checks quizConfig.json against quizConfig.schema.json
npm run dev                # starts the dev server at http://localhost:5173
```

Copy `.env.example` to `.env` and fill in values as later phases require them (Google
service account, Resend API key — see the file for what each one is for). Nothing in Phase 0
requires any of these.

## Deploy

The live site is a Vercel project connected to this repo's GitHub, at
`apply.hopefoundinc.com`. Once Hope Found's GitHub and Vercel accounts exist (see "Who owns
each account" above — as of this writing, neither does):

1. Push this repo to Hope Found's GitHub org.
2. In Vercel, **Add New Project** → import that GitHub repo. Vercel auto-detects the Vite
   framework (also pinned explicitly in [`vercel.json`](./vercel.json)) — there's nothing to
   configure in the build settings.
3. Under **Project Settings → Environment Variables**, add every variable from
   [`.env.example`](./.env.example) for Production (and Preview too, if preview deployments
   submitting real test data is useful).
4. Deploy. Vercel gives you a `*.vercel.app` URL first — confirm the quiz loads and a full
   test submission (`?src=test`) works end to end before moving to the custom domain.
5. Under **Project Settings → Domains**, add `apply.hopefoundinc.com`.
6. Add this DNS record at Hope Found's DNS provider for `hopefoundinc.com`:

   | Type | Name | Value |
   |---|---|---|
   | CNAME | `apply` | `cname.vercel-dns.com` |

   This is Vercel's standard subdomain CNAME target per their current docs — but the Domains
   screen for this specific project will show you the exact value to use once you add the
   domain there, and that's the one to trust if it ever differs. DNS changes can take
   anywhere from a few minutes to a few hours to propagate.
7. Do the same for the Resend sending subdomain (e.g. `mail.hopefoundinc.com`): Resend's
   dashboard gives you its own required SPF and DKIM TXT records when you add the domain
   there — add those the same way, at the same DNS provider.
8. Once both are verified, submit one test per outcome (QUALIFIED / HOLD / DISQUALIFY)
   against the real `apply.hopefoundinc.com` URL and confirm the PDF lands in the right Drive
   folder, the row lands in the Sheet, and the right emails arrive. This is GATE 3 from the
   build plan — do this before the church ads go live.

`vercel.json` also sets `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` on
every response, since this is a public form collecting names, addresses, and phone numbers.
Vercel applies HTTPS and HSTS automatically on custom domains, so that's not configured here.

## Editing `quizConfig.json`

All questions, disqualify/hold rules, recipient emails, and copy live in one file:
[`quizConfig.json`](./quizConfig.json). To change a question or rule, edit that file only —
the frontend, outcome engine, PDF generator, and emails all read from it. After editing, run:

```bash
npm run validate:config
```

Rules:
- `type` is one of `yesno`, `select`, or `textarea`.
- A `select` question must include `options`; a `textarea` question must include `minLength`.
- Each rule's `outcome` is `DISQUALIFY` or `HOLD` (a question with no disqualifying answer
  just omits rules, or uses an empty `rules: []` array — that's how `QUALIFIED` is reached).
- **Outcome precedence:** if any triggered rule says `DISQUALIFY`, the submission is
  disqualified, even if other rules say `HOLD`. If nothing disqualifies but at least one rule
  triggers `HOLD`, the submission is held. Otherwise it's qualified. Every triggered rule's
  reason is recorded, not just the first one matched.
- **`marylandDistanceCheck`:** a separate rule, outside the per-question `rules` above,
  because it needs a network geocode call rather than a simple answer match. When the
  question named by `triggerQuestionId` is answered `triggerValue` (Maryland home), the
  applicant's contact address is geocoded via the free U.S. Census geocoder (no API key) and
  compared against `officeLat`/`officeLng`. Beyond `maxMiles`, the submission is disqualified
  on top of (not instead of) the existing Maryland "provider application pending" hold. If the
  address can't be geocoded, the submission is held for manual review rather than guessed at
  either way. To change the mile radius or office location, edit this block only — no code
  changes needed.

## Adding a church source tag

Every share link carries a `?src=` query param that's captured on page load and stored with
the submission. Naming convention:

```
?src=dc-[church-slug]
?src=md-[church-slug]
?src=va-[church-slug]
```

Start with `?src=test` for testing. To add a new church, generate its link and QR code with:

```bash
npm run qr -- dc-gracechurch
```

This validates the tag against the naming convention above, then writes the full URL and a
PNG QR code to `qr-codes/<tag>.png` (gitignored — these are regenerated on demand, not
committed). Print the PNG onto the church flyer. `SITE_DOMAIN` defaults to
`apply.hopefoundinc.com`; override it (e.g. for testing against a preview deployment) with
`SITE_DOMAIN=my-preview.vercel.app npm run qr -- test`.

## Where records land

- **Google Drive:** one PDF per submission, in `Qualified/`, `Hold/`, or `Did-Not-Qualify/`
  under the folder `GOOGLE_DRIVE_FOLDER_ID` points to. The app creates these three subfolders
  automatically the first time it needs them if they don't already exist, matched by exact
  name — don't rename them after the fact, or the app will just create new ones alongside.
- **Google Sheet:** one row appended to the sheet's first tab per submission, in this exact
  column order — set up a header row in the sheet matching it:

  | A | B | C | D | E | F | G | H | I | J | K | L | M |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|
  | ID | Timestamp | Name | Phone | Email | City | State | Outcome | Reasons | Source | Drive link | Follow-up status | Duplicate flag |

  The follow-up status column is always written blank — the recruitment team fills it in. The
  duplicate flag column is written by the app: if the same email address appears elsewhere in
  the sheet within the last 24 hours, this submission is flagged "Possible duplicate — same
  email submitted within the last 24 hours" rather than rejected. It's still saved and still
  gets its normal emails; the flag is just a heads-up for whoever reviews it.
- **Email (via Resend):**
  - Every outcome: the applicant gets the same short confirmation email, sent from
    `RESEND_FROM_EMAIL`.
  - `QUALIFIED` only: `recipients.recruitment` is emailed (CC `recipients.cc`), subject
    "Qualified host-home applicant: [Name]", with contact info, the applicant's "why" answer
    in full, the Drive link, and a reminder to follow up within 48 hours.
  - Any outcome where the Drive upload or the Sheet append failed: `recipients.adminBackup`
    gets an email with the full PDF record attached, so the submission still reaches a human
    even when neither Google write succeeded.
  - Each of these email sends is independent — one failing (or Resend being unreachable)
    doesn't stop the others from being tried, and every failure is logged.

## Hardening

`/api/submit` rejects a request before it does any real work if:

- **Honeypot:** the hidden `organization` field on the contact screen is non-empty. It's
  positioned off-screen and `aria-hidden`/`tabIndex={-1}`, so a real applicant — sighted,
  keyboard, or screen-reader — never encounters it, let alone fills it in. Only a bot that
  blindly fills every field in the DOM trips this.
- **Too fast:** the request arrives less than 20 seconds after `startedAt` (captured the
  moment the page loads). A missing or unparseable `startedAt` is treated the same way, since
  the frontend always sends it — its absence means something is posting to the endpoint
  directly rather than through the quiz.
- **Rate limit:** more than 5 requests from the same IP within an hour. This is in-memory
  (see [lib/rateLimit.js](lib/rateLimit.js) for why that's the right call, not a shortcut, at
  this project's expected volume — and how to upgrade it later if that ever changes).

Both the honeypot and the too-fast check return the same generic `400 Invalid submission` as
a normal validation failure, so a bot gets no signal about which check it tripped. The rate
limit returns `429`. Every rejection is structured-logged (`honeypot_triggered`,
`submission_too_fast`, `rate_limit_exceeded`) alongside the IP.

Every field is still validated server-side regardless — including the "why" textarea's
minimum length — independent of these checks; a request can fail hardening, or fail
validation, or both.

## Project structure

```
quizConfig.json            All questions, rules, copy, recipients — edit this, not code
quizConfig.schema.json     JSON Schema quizConfig.json is validated against
vercel.json                 Framework pin + security headers (see "Deploy")
scripts/validate-config.mjs
scripts/generate-sample-pdfs.mjs  Generates one sample PDF per outcome into samples/ (gitignored)
scripts/generate-qr.mjs           Generates a src-tag URL + QR code into qr-codes/ (gitignored)
src/
  App.jsx, components/     The multi-step quiz frontend
  outcomeEngine.js         Pure (answers, config) => { outcome, reasons[] } function, unit tested
  validation.js            Shared client + server field validation
  styles/tokens.css        Brand colors, fonts, spacing (documented sources in the file)
  styles/global.css        Base reset, typography, focus states
  assets/fonts/            Self-hosted Public Sans (woff2)
lib/                        Server-only code (not bundled into the frontend)
  geocode.js                Free U.S. Census geocoder client
  distance.js                Pure haversine distance function, unit tested
  marylandDistanceCheck.js  Applies the 25-mile Maryland rule after the pure outcome engine
  pdf.js                   Builds the per-submission PDF record
  filename.js               YYYY-MM-DD_LastName-FirstName_OUTCOME_ID.pdf naming
  googleAuth.js             Service-account auth for Drive + Sheets
  drive.js, sheets.js       Drive upload / Sheet append, called independently
  delivery.js               Orchestrates both writes; a failure in one never blocks the other
  email.js                  Thin Resend API client
  emailTemplates.js         Recruitment / applicant confirmation / admin backup email content
  notify.js                 Sends every email a submission can trigger, each independently
  rateLimit.js               In-memory per-IP rate limit, unit tested
  duplicateCheck.js          Flags a same-email-within-24h Sheet match, unit tested
api/submit.js, api/submit.test.js   The quiz submission endpoint, and its hardening tests
.env.example                Every secret env var, with a description
```
