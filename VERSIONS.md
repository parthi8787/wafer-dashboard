# Versions

| Version | Git tag | Notes |
|---------|---------|--------|
| **0.0** | `v0.0` | Working baseline (build + start bat, Chrome localhost, probe + bin analysis). **Frozen — do not move or delete this tag.** |
| **0.1** | _(on main; tag when you freeze)_ | SDS + SDT + SDE on one probe page; LCode dropdown removed. |

## Run Version 0.0

```bat
run-v0.0.bat
```

## Run latest (main)

```bat
git checkout main
git pull
update-and-start.bat
```

## Rules for agents / future updates

- Never `git tag -f v0.0` or delete `v0.0`.
- Never force-push `release/v0.0`.
- New work goes on `main` (or feature branches). Bump to `0.1`, `0.2`, … with **new** tags only.
