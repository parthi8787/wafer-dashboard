# Wafer Dashboard

Next.js app with two views:

| Route | Purpose |
|-------|---------|
| `/` | **Bin analysis** — wafer-map commonality, Class → GDR correlation, Class hardware |
| `/probe` | **Probe Actuals** — weekly/monthly yield, Avg TT (good bin), top-10 bin pareto |

## Probe flow rules (SDS → SDT → SDE)

- **SDS** (first): Yield = pass ÷ all dies. Pareto **hides bin 93** (not a SDS fail mode).
- **SDT**: SDS fails appear as soft-bin **93**. Yield & pareto **exclude bin 93**.
- **SDE**: SDS+SDT fails appear as soft-bin **93**. Yield & pareto **exclude bin 93**.
- **Pareto**: bin **93** is never shown (SDS / SDT / SDE).
- **Avg TT**: mean `ttime` on good bin (`curibin == 1`) only.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Data files (under `data/`)

| Path | Used by |
|------|---------|
| `data/probe/wafer-data.csv` | `/probe` |
| `data/bin-analysis/class-gdr-dies.csv` | `/` Bin analysis |

In the UI, paste a path under `data/` and click **Load**. Absolute paths outside `data/` need `PROBE_ALLOW_ABSOLUTE=1` (or `BIN_ANALYSIS_ALLOW_ABSOLUTE=1`) and are disabled in production by default.

#### Probe CSV columns

```
lotid,enddate,prgnm,curibin,wafyloc,wafxloc,wafscribe,ttime,total,tempr,begindt,curfbin,latest_by_lot_operation,lcode,prdct
```

#### Class / GDR CSV columns

See `data/bin-analysis/README.md`.

## Env (optional)

| Variable | Meaning |
|----------|---------|
| `PROBE_CSV_PATH` | Default probe CSV |
| `BIN_ANALYSIS_CSV_PATH` | Default class/GDR CSV |
| `PROBE_DATA_ROOT` | Data root (default `data`) |
| `PROBE_ALLOW_ABSOLUTE` | Allow CSV paths outside data root |
| `ADF_SQL_CONNECTION_STRING` | Legacy ADF bundle (unused by home/bin analysis) |

## Docs

- `data/bin-analysis/README.md` — Class/GDR schema
- `docs/` — ADF / hosting notes (legacy movements pipeline)
