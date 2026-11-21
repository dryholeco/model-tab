# Model Tab

A standalone [Hermes Desktop](https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk) plugin (`id: model-tab`) that adds a **Models** tab to the left sidebar (docked with **Sessions**) for inspecting and editing model settings across Hermes profiles.

## Features

- **Profile overview:** View each profile's primary provider/model, fallback model, and reasoning effort for the **Current** gateway or across **All gateways** (manual refresh, lazy fetch on expand/scope change, no auto-polling).
- **Inline editor:** Edit primary provider and default model with live catalog suggestions (`model.options`) or manual model slugs, update or clear the fallback chain (`fallback_providers`, clearing legacy `fallback_model` when present), and set reasoning effort (`default` through `ultra`).
- **Safe writes:** Uses gateway RPC (`profiles.configure`, `config.set`, and `cli.exec config`) with expensive-model confirmation support and an optional `config.yaml` force-write fallback when a provider/model is unlisted or unconfigured.
- **Native styling, no build step:** Plain uncompiled ESM using `@hermes/plugin-sdk` components and Hermes `--ui-*` theme variables.

## Installation (Private Repo)

Standalone desktop plugins are loaded from the app-level `desktop-plugins/` directory inside `<HERMES_HOME>`:

- **macOS / Linux:** `~/.hermes/desktop-plugins/model-tab/` (or `$HERMES_HOME/desktop-plugins/model-tab/` if `HERMES_HOME` is set)
- **Windows:** `%LOCALAPPDATA%\hermes\desktop-plugins\model-tab\` (or `%HERMES_HOME%\desktop-plugins\model-tab\`)

The folder name **must** match the plugin ID (`model-tab`). One `desktop-plugins/` root serves all profiles and connections in Hermes Desktop.

### macOS / Linux (SSH)

```bash
mkdir -p "${HERMES_HOME:-$HOME/.hermes}/desktop-plugins"
git clone git@github.com:dryholeco/model-tab.git \
  "${HERMES_HOME:-$HOME/.hermes}/desktop-plugins/model-tab"
```

### macOS / Linux (GitHub CLI)

```bash
mkdir -p "${HERMES_HOME:-$HOME/.hermes}/desktop-plugins"
gh repo clone dryholeco/model-tab \
  "${HERMES_HOME:-$HOME/.hermes}/desktop-plugins/model-tab"
```

### Windows (PowerShell, SSH)

```powershell
$HermesHome = if ($env:HERMES_HOME) { $env:HERMES_HOME } else { Join-Path $env:LOCALAPPDATA "hermes" }
New-Item -ItemType Directory -Force -Path (Join-Path $HermesHome "desktop-plugins") | Out-Null
git clone git@github.com:dryholeco/model-tab.git (Join-Path $HermesHome "desktop-plugins\model-tab")
```

### Loading and Managing

1. Hermes Desktop watches `desktop-plugins/` and loads the plugin automatically within a few seconds.
2. If the **Models** tab does not appear right away, open the command palette (**⌘K** on macOS, **Ctrl+K** on Linux/Windows) and run **Reload desktop plugins**.
3. Toggle **Model Tab** on or off at any time in **Capabilities → Plugins**.

### Updating

```bash
git -C "${HERMES_HOME:-$HOME/.hermes}/desktop-plugins/model-tab" pull
```

Hermes Desktop hot-reloads `plugin.js` automatically when updated on disk.

## Migrating from `bot-models`

This plugin was previously installed under the ID `bot-models` (`desktop-plugins/bot-models/`). Because Hermes Desktop identifies plugins by `id`, keeping both `bot-models` and `model-tab` in `desktop-plugins/` will load **both** plugins and show two **Models** tabs.

To migrate cleanly without double-loading:

1. Move the old `bot-models` directory outside `desktop-plugins/` as a backup. Keep it until you've confirmed the new tab loads.
2. Install `model-tab` into `${HERMES_HOME:-$HOME/.hermes}/desktop-plugins/model-tab` using the steps above.
3. Run **⌘K → Reload desktop plugins** (or restart Hermes Desktop) and confirm only **Model Tab** is listed under **Capabilities → Plugins**.

No settings are lost during migration: the plugin stores no local `ctx.storage` state, and all model configuration remains in each profile's `config.yaml`.
