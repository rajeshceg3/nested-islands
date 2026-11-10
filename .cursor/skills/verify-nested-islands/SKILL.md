---
name: verify-nested-islands
description: Verifies nested-islands (Islands All the Way Down map story) - app.js syntax plus a real offline-safe headless-Chrome render of the map story - with machine-readable evidence.
---

# Verify nested-islands

## Launch

```bash
python3 .cursor/skills/verify-nested-islands/verify.py
```

Exit 0 and `FAILURES=0` mean green. Static app; no services needed.
Chrome location can be overridden with `CHROME_BIN`.

## Doctor

Gates on `node` and a Chrome/Chromium binary.

## Drive

1. `node --check app.js`.
2. Headless-Chrome render against a throwaway local server on a free
   port. External hosts (map tiles) are made unresolvable via
   `--host-resolver-rules` so the render is offline-deterministic:
   the page must boot its title marker and Leaflet panes, and no JS
   console errors may appear.

## Evidence

Each run writes a fresh `EVIDENCE_DIR` with `evidence.json`.
`FAILURES=n` is the last line; the exit code mirrors it.

## Cleanup

The static server is a daemon thread on an ephemeral port, shut down at
the end of the run, pass or fail.

## Maintenance

When the page structure or boot markers change, update the render
assertions in the same commit.

## Known boundaries

- Map tiles come from a remote OSM host; offline, tile imagery is not
  asserted - the map engine booting (panes) and clean JS are.
