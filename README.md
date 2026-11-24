# WaferTrack

Hosted Next.js dashboard for **wafer movements** and **die test results** (CP1, CP2, Class, Final Test), designed to read **ADF-landed** Synapse/SQL tables.

## Quick start (local)

```bash
npm install
npm run dev
```

Open http://localhost:5173

Without `ADF_SQL_CONNECTION_STRING`, the app serves **sample data**.

## Live ADF

Set server secret `ADF_SQL_CONNECTION_STRING` to a read-only SQL connection string for your ADF sink. See `docs/HOSTED_AND_LIVE_ADF.md`.

## Hosted (no local npm)

Publish from a Cloud Agent run attached to this GitHub repo. See `docs/HOSTED_AND_LIVE_ADF.md`.

## Docs

- `docs/ADF_TO_DASHBOARD_FLOW.md` — architecture flow
- `docs/ADF_SETUP_GUIDE.md` — create ADF pipeline
- `docs/HOSTED_AND_LIVE_ADF.md` — hosting + live data
- `DEPLOY.md` — Azure deploy options
