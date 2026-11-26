# Class / GDR bin analysis CSV

Drop your class + GDR die extract here (or point the UI path to your file).

## Required columns

| Column | Description |
|--------|-------------|
| `lotid` | Lot id |
| `wafscribe` | Wafer id / scribe |
| `die_x` | Die X (wafer map) |
| `die_y` | Die Y (wafer map) |
| `class_bin` | Class soft/hard bin number |
| `class_bin_name` | Class bin label (e.g. `TIMING_GDR`) |
| `gdr_bin` | Correlated GDR soft bin |
| `gdr_bin_name` | GDR bin label |
| `gdr_fail` | `1` / `true` if this die fails GDR |
| `tester_id` | Class tester |
| `test_site` | Multi-site number |
| `handler_id` | Handler |
| `chamber` | Chamber |
| `prober_id` | Prober / probe card id |
| `tested_at` | ISO timestamp (optional) |
| `stage` | Optional; default `CLASS` |

Aliases accepted: `wafxloc`/`wafyloc`, `wafer_id`, `curibin` (as class_bin), `site`.

Sample file: `class-gdr-dies.csv` (synthetic GDR lots with planted commonality hotspots).
