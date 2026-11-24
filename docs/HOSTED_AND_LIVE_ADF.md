# Hosted WaferTrack + live ADF data

## 1) Run without local apps (hosted)

This app is a **Next.js** app (UI + API together). Once published on Cursor hosting:

- Open the hosted URL (no `npm run` on your PC)
- API path: `/api/wafer-track/bundle`
- Health: `/api/health`

### Publish steps (required once)

Cursor can only publish from a Cloud Agent run that is **attached to the GitHub repo**.

1. Open Cursor → **Cloud Agents** → **New agent**
2. Select repo: `silveraxe05-dev/wafer-dashboard`
3. Prompt: `Publish the WaferTrack app`
4. Confirm the publish dialog (choose **private** or **team**)

Until then, local run:

```bat
npm install
npm run dev
```

Open http://localhost:5173

---

## 2) Feed real ADF data

ADF must land into SQL tables:

- `fabops.dim_location`
- `fabops.dim_wafer`
- `fabops.fact_wafer_movement`
- `fabops.fact_die_test_result`

Then set this **server secret** on the published app:

| Secret | Purpose |
| --- | --- |
| `ADF_SQL_CONNECTION_STRING` | Read-only Synapse / Azure SQL / SQL Server connection string |
| `ADF_SQL_SCHEMA` (optional) | Schema name, default `fabops` |

You do **not** need your own personal Azure SQL subscription if Altera IT gives you a **read-only connection string** to the company Synapse/SQL where ADF already lands.

### Behavior

| Secret set? | Dashboard shows |
| --- | --- |
| No | Sample data (GDR/RNR/WHR/FP8 demo) |
| Yes + tables filled | Live ADF-landed rows |
| Yes but SQL fails | Sample data + error note in sink |

Never put the connection string in chat or in `VITE_` / `NEXT_PUBLIC_` env vars.
