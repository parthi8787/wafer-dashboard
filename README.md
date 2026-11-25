# WaferTrack

Hosted Next.js dashboard for **wafer movements** and **die test results** (CP1, CP2, Class, Final Test), designed to read **ADF-landed** Synapse/SQL tables.

Also includes a **Probe CSV dashboard** at `/probe` for lot/wafer/die probe extracts loaded from a configurable file path (built for 90+ day CSVs).

## Quick start (local)

```bash
npm install
npm run dev
```

Open http://localhost:5173  
Probe CSV view: http://localhost:5173/probe

Without `ADF_SQL_CONNECTION_STRING`, the movements view serves **sample data**.

### Point `/probe` at your CSV

Default sample: `data/probe/wafer-data.csv`

```bash
# project-relative or absolute (absolute needs PROBE_ALLOW_ABSOLUTE=1)
PROBE_CSV_PATH=/path/to/90day-probe.csv PROBE_ALLOW_ABSOLUTE=1 npm run dev
```

Or paste a path in the UI **CSV path** field and click **Load path**. Paths must stay under `data/` unless `PROBE_ALLOW_ABSOLUTE=1`.

Expected columns:

```
lotid,enddate,prgnm,curibin,wafyloc,wafxloc,wafscribe,ttime,total,tempr,begindt,curfbin,latest_by_lot_operation,lcode,prdct
```

## Live ADF

Set server secret `ADF_SQL_CONNECTION_STRING` to a read-only SQL connection string for your ADF sink. See `docs/HOSTED_AND_LIVE_ADF.md`.

## Hosted (no local npm)

Publish from a Cloud Agent run attached to this GitHub repo. See `docs/HOSTED_AND_LIVE_ADF.md`.

## Docs

- `docs/ADF_TO_DASHBOARD_FLOW.md` — architecture flow
- `docs/ADF_SETUP_GUIDE.md` — create ADF pipeline
- `docs/HOSTED_AND_LIVE_ADF.md` — hosting + live data
- `DEPLOY.md` — Azure deploy options
