# Slowgram

Private Instagram digest service for a single operator. It collects image posts from managed Instagram sources, stores media on local disk or a Railway volume, exposes a private web UI, and sends a daily digest email.

## Stack

- Next.js App Router for the web UI and internal admin actions
- Postgres via `pg`
- Playwright for Instagram collection and session reuse
- Resend for magic-link and digest email delivery
- Railway for web, worker, Postgres, and persistent volume hosting

## Local setup

1. Install Node.js 22+.
2. Copy `.env.example` to `.env`.
3. Install dependencies with `npm install`.
4. Run migrations with `npm run db:migrate`.
5. Start the app with `npm run dev`.
6. Run worker jobs with `npm run worker -- collect` or `npm run worker -- digest`.

## Railway

Create one Railway web service from the repo and use Railway cron jobs for the collectors:

- `web`: build with `npm install && npm run build`, start with `npm run start`
- cron job 1: `npm run cron:discover`
- cron job 2: `npm run cron:collect`
- cron job 3: `npm run cron:digest`

Attach a volume to the web service and set:

- `MEDIA_ROOT=/data/media`
- `PLAYWRIGHT_STATE_ROOT=/data/playwright`

Recommended cron schedules:

- discovery: every 6-12 hours
- collector: every 30 minutes
- digest: once daily after your last collection window

## Login bootstrap

Railway does not provide an interactive browser UI. The app supports two bootstrap paths:

- headless login using `INSTAGRAM_USERNAME` and `INSTAGRAM_PASSWORD`
- manual local login using `npm run worker -- login --headed`, then copying the generated state file onto the shared volume

The admin UI exposes current session status, refresh actions, and a state upload/import flow.
