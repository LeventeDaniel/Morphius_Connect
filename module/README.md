# Morphius Connect UI Module

A Forge-compatible frontend module that provides a safe, read-only view of
Morphius Connect status and connection metadata when mounted inside Morphius.

---

## What it shows

- Connect availability and config load state
- Connection count, rules loaded, error count
- Per-connection: ID, type, adapter, auth mode, `hasAuth`, health enabled, approval required
- Health check status and response times (sanitized messages only)

## What it never shows

- Raw secrets, tokens, API keys, or passwords
- `.env` values or raw YAML config
- Full stack traces or internal paths
- `base_url` values (not returned by the safe endpoint)

---

## How Morphius discovers this module

Set the environment variable before starting Morphius:

```bash
# Windows
set MORPHIUS_MODULE_PATHS=C:\Users\leven\repo\Morphius_Connect\module

# macOS/Linux
export MORPHIUS_MODULE_PATHS=/path/to/Morphius_Connect/module
```

Then start Morphius:

```bash
cd C:\Users\leven\repo\Morphius
npm run dev
```

Morphius scans `MORPHIUS_MODULE_PATHS` on startup and after `/api/forge/reload`.
The module appears in the **External Modules** window (`show external modules` in the
command launcher, or mount it directly).

The scanner reads `manifest.json` only — it never imports or executes `module.tsx`.

---

## Forge validation

Validate the manifest using Morphius-Forge CLI:

```bash
node C:\Users\leven\repo\Morphius_Forge\packages\cli\dist\index.js validate C:\Users\leven\repo\Morphius_Connect\module
```

Or from within Morphius-Forge:

```bash
cd C:\Users\leven\repo\Morphius_Forge
npm run cli -- validate C:\Users\leven\repo\Morphius_Connect\module
```

---

## Manifest shape

The manifest follows the Forge progressive compatibility model:

| Field | Level |
|---|---|
| `id`, `name`, `version`, `type`, `entry` | Required (minimum valid) |
| `description`, `permissions`, `window` | Usable |
| `actions` | Integrated |
| `workflowCompatible`, `tags`, `author` | Recommended |

This module targets **integrated** compatibility level.

---

## Safe API endpoints used

When mounted inside Morphius, the module calls:

| Endpoint | Data returned |
|---|---|
| `GET /api/connect/status` | available, configLoaded, connectionCount, rulesLoaded, errorCount |
| `GET /api/connect/connections` | safe connection metadata (no secrets) |
| `GET /api/connect/health` | health results with sanitized messages |

When the backend is unreachable, the module falls back to mock data and shows a
`mock` indicator in the header.

---

## Security

- No secrets are imported into `module.tsx`
- No `.env` reading — `VITE_API_URL` is the only env var read, for the API base URL
- No auth/login logic
- No approval or sandbox logic
- The module is purely a read-only viewer of safe public metadata
