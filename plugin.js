import {
  Badge,
  Button,
  Codicon,
  GlyphSpinner,
  host,
  Input,
  ScrollArea,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  surfaceModelSwitchConfirm,
  useValue
} from '@hermes/plugin-sdk'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'

const ID = 'model-tab'
const STYLE_ID = 'hermes-model-tab-style'
const CUSTOM_PROVIDER_SENTINEL = '__custom__'

// Exact valid values from hermes_constants.py (`VALID_REASONING_EFFORTS` + "none" + "default" unset).
const REASONING_OPTIONS = [
  { value: 'default', label: 'Default (inherit)' },
  { value: 'none', label: 'None (disabled)' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'Extra High (xhigh)' },
  { value: 'max', label: 'Max' },
  { value: 'ultra', label: 'Ultra' }
]

const VALID_REASONING_SET = new Set(REASONING_OPTIONS.map(o => o.value))
const REASONING_SHORT = {
  default: 'inherit',
  none: 'none',
  minimal: 'min',
  low: 'low',
  medium: 'med',
  high: 'high',
  xhigh: 'xhigh',
  max: 'max',
  ultra: 'ultra'
}

// Disk plugins are not scanned by Tailwind; all colors use Hermes CSS theme variables only.
const CSS = `
.hbm-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--ui-text-primary);font-size:12px;line-height:1.35}
.hbm-header{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:38px;padding:5px 7px 5px 9px;border-bottom:1px solid var(--ui-stroke-tertiary);flex-shrink:0}
.hbm-scroll{flex:1;min-height:0}
.hbm-list{display:flex;flex-direction:column;padding:0 0 8px}
.hbm-group-hdr{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:31px;padding:9px 10px 5px;border-bottom:1px solid var(--ui-stroke-tertiary);font-size:9.5px;font-weight:600;letter-spacing:0.055em;text-transform:uppercase;color:var(--ui-text-secondary)}
.hbm-row{position:relative;min-width:0;border-bottom:1px solid var(--ui-stroke-tertiary);background:transparent}
.hbm-row:not([data-expanded="true"]):hover{background:var(--chrome-action-hover)}
.hbm-row[data-current="true"]{background:var(--ui-bg-tertiary);box-shadow:inset 2px 0 0 var(--ui-accent)}
.hbm-row[data-expanded="true"]{background:var(--ui-bg-elevated,var(--ui-bg-chrome));box-shadow:inset 2px 0 0 var(--ui-accent)}
.hbm-row-btn{display:flex;flex-direction:column;gap:4px;width:100%;min-width:0;min-height:56px;padding:7px 8px 7px 10px;text-align:left;background:transparent;border:0;border-radius:0;cursor:pointer;color:inherit}
.hbm-row-btn:hover{background:transparent}
.hbm-row-btn:focus-visible{outline:2px solid var(--ui-accent);outline-offset:-2px}
.hbm-row-top{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0;min-height:18px}
.hbm-row-name-wrap{display:flex;align-items:center;gap:6px;min-width:0;flex:1}
.hbm-row-name{font-weight:600;font-size:12.5px;line-height:17px;color:var(--ui-text-primary);min-width:0;overflow-wrap:anywhere}
.hbm-status-dot{width:6px;height:6px;border-radius:50%;background:var(--ui-accent);flex:none}
.hbm-status-dot[data-active="true"]{background:transparent;border:1px solid var(--ui-accent);width:5px;height:5px}
.hbm-row-trailing{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex:none;color:var(--ui-text-secondary)}
.hbm-reasoning{display:inline-flex;align-items:center;justify-content:center;min-width:25px;height:16px;padding:0 4px;border:1px solid var(--ui-stroke-tertiary);border-radius:4px;background:var(--ui-bg-quinary,var(--ui-bg-chrome));color:var(--ui-text-secondary);font-family:var(--font-mono,monospace);font-size:9px;line-height:14px;white-space:nowrap}
.hbm-row-body{display:flex;flex-direction:column;gap:3px;min-width:0}
.hbm-model-line{display:flex;align-items:baseline;gap:6px;min-width:0;min-height:15px}
.hbm-provider{flex:none;max-width:78px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px;line-height:15px;color:var(--ui-text-secondary)}
.hbm-model{min-width:0;flex:1;font-family:var(--font-mono,monospace);font-size:10.5px;line-height:15px;color:var(--ui-text-secondary);white-space:normal;overflow-wrap:anywhere;word-break:break-word}
.hbm-model[data-empty="true"]{font-family:inherit;color:var(--ui-text-secondary)}
.hbm-fallback-line{display:flex;align-items:flex-start;gap:4px;min-width:0;font-family:var(--font-mono,monospace);font-size:9.5px;line-height:14px;color:var(--ui-text-secondary);overflow-wrap:anywhere;word-break:break-word}
.hbm-fallback-arrow{flex:none;color:var(--ui-text-quaternary,var(--ui-text-tertiary))}
.hbm-chevron{width:12px;height:12px;color:var(--ui-text-quaternary,var(--ui-text-tertiary));flex:none}
.hbm-row:hover .hbm-chevron,.hbm-row-btn:focus-visible .hbm-chevron{color:var(--ui-accent)}
.hbm-unavailable{margin-top:7px;border-top:1px solid var(--ui-stroke-secondary);border-bottom:1px solid var(--ui-stroke-tertiary)}
.hbm-unavailable-toggle{display:flex;align-items:center;gap:6px;width:100%;min-height:33px;padding:5px 9px;border:0;background:transparent;color:var(--ui-text-secondary);font:inherit;font-size:10.5px;text-align:left;cursor:pointer}
.hbm-unavailable-toggle:hover{background:var(--chrome-action-hover);color:var(--ui-text-secondary)}
.hbm-unavailable-toggle:focus-visible{outline:2px solid var(--ui-accent);outline-offset:-2px}
.hbm-unavailable-list{border-top:1px solid var(--ui-stroke-tertiary)}
.hbm-offline-row{display:flex;align-items:center;gap:6px;min-width:0;min-height:34px;padding:4px 7px 4px 10px;border-bottom:1px solid var(--ui-stroke-tertiary);color:var(--ui-text-secondary)}
.hbm-offline-row:last-child{border-bottom:0}
.hbm-offline-dot{width:5px;height:5px;border-radius:50%;background:var(--ui-danger,var(--ui-text-tertiary));flex:none}
.hbm-offline-name{flex:none;max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ui-text-secondary);font-size:11px;font-weight:600}
.hbm-offline-error{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px}
.hbm-retry{flex:none;width:24px;height:24px;min-height:24px;padding:2px;color:var(--ui-text-secondary)}
.hbm-editor{display:flex;flex-direction:column;gap:10px;margin:0 6px 8px 8px;padding:10px 9px 11px 10px;border-left:2px solid var(--ui-accent);border-radius:0 0 4px 4px;background:var(--ui-bg-quinary,var(--ui-bg-chrome))}
.hbm-editor-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:22px}
.hbm-editor-heading{display:flex;flex-direction:column;gap:2px;min-width:0}
.hbm-editor-title{font-size:10.5px;font-weight:600;color:var(--ui-text-primary)}
.hbm-catalog-status{font-size:9px;line-height:1.35;color:var(--ui-text-secondary);overflow-wrap:anywhere}
.hbm-form-section{display:flex;flex-direction:column;gap:7px;padding-top:9px;border-top:1px solid var(--ui-stroke-tertiary)}
.hbm-section-title{font-size:9.5px;font-weight:600;letter-spacing:0.055em;text-transform:uppercase;color:var(--ui-text-secondary)}
.hbm-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.hbm-label-row{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:16px}
.hbm-label{font-size:10.5px;font-weight:600;color:var(--ui-text-secondary)}
.hbm-hint{font-size:9px;line-height:1.35;color:var(--ui-text-secondary)}
.hbm-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;padding-top:8px;border-top:1px solid var(--ui-stroke-tertiary)}
.hbm-err-box{display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid var(--ui-stroke-secondary);border-radius:4px;background:var(--ui-bg-tertiary);font-size:10.5px;line-height:1.45;color:var(--ui-danger,var(--ui-text-primary));overflow-wrap:anywhere}
.hbm-err-box .hbm-actions{padding-top:2px;border-top:0}
.hbm-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px 12px;text-align:center;color:var(--ui-text-secondary);font-size:11px}
.hbm-badge-sm{font-size:9px;line-height:13px;padding:0 4px;height:15px;flex-shrink:0}
`

function routeKey(route) {
  return `${route.connectionId}::${route.profile}::${route.targetProfile}`
}

function errorText(err) {
  if (!err) return 'Unknown error'
  if (typeof err === 'string') return err
  if (typeof err.message === 'string' && err.message.trim()) return err.message.trim()
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

function isMissingProfileError(msg) {
  const s = String(msg || '').toLowerCase()
  return (
    s.includes('does not exist') ||
    s.includes('not found') ||
    s.includes('no such profile') ||
    s.includes('unknown profile')
  )
}

function normalizeFallbackEntries(cfg) {
  const out = []
  const seen = new Set()
  const addEntry = item => {
    if (!item) return
    let entry = null
    if (typeof item === 'object' && !Array.isArray(item)) {
      const provider = String(item.provider ?? '').trim()
      const model = String(item.model ?? '').trim()
      if (provider || model) {
        entry = { ...item, provider, model }
      }
    } else if (typeof item === 'string') {
      const s = item.trim()
      if (s) {
        const idx = s.indexOf('/')
        entry = idx > 0
          ? { provider: s.slice(0, idx), model: s.slice(idx + 1) }
          : { provider: '', model: s }
      }
    }
    if (!entry) return
    const id = `${entry.provider.toLowerCase()}|${entry.model.toLowerCase()}|${String(entry.base_url ?? '').trim().toLowerCase()}`
    if (!seen.has(id)) {
      seen.add(id)
      out.push(entry)
    }
  }

  // Canonical precedence matches hermes_cli/fallback_config.py: fallback_providers first, legacy fallback_model second.
  for (const raw of [cfg?.fallback_providers, cfg?.fallback_model]) {
    if (Array.isArray(raw)) {
      for (const item of raw) addEntry(item)
    } else if (raw && typeof raw === 'object') {
      addEntry(raw)
    } else if (typeof raw === 'string') {
      addEntry(raw)
    }
  }
  return out
}

function normalizeReasoningEffort(raw) {
  if (raw === null || raw === undefined || raw === true || raw === '') return 'default'
  if (raw === false) return 'none'
  if (typeof raw === 'object') {
    if (raw.enabled === false) return 'none'
    const lvl = String(raw.effort ?? '').trim().toLowerCase()
    return VALID_REASONING_SET.has(lvl) ? lvl : 'default'
  }
  const s = String(raw).trim().toLowerCase()
  if (s === 'none' || s === 'false' || s === 'disabled') return 'none'
  if (VALID_REASONING_SET.has(s)) return s
  return 'default'
}

function parseProfileConfig(cfg) {
  const safeCfg = cfg && typeof cfg === 'object' ? cfg : {}
  const modelBlock = safeCfg.model
  let provider = ''
  let model = ''
  if (typeof modelBlock === 'string') {
    model = modelBlock.trim()
  } else if (modelBlock && typeof modelBlock === 'object') {
    provider = String(modelBlock.provider ?? '').trim()
    model = String(modelBlock.default ?? '').trim()
  }

  const fallbacks = normalizeFallbackEntries(safeCfg)
  const firstFb = fallbacks[0] || { provider: '', model: '' }
  const extraFallbacks = fallbacks.slice(1)
  const hasLegacyFallback = safeCfg.fallback_model !== undefined && safeCfg.fallback_model !== null
  const reasoning = normalizeReasoningEffort(safeCfg.agent?.reasoning_effort)

  return {
    provider,
    model,
    fallbackProvider: firstFb.provider || '',
    fallbackModel: firstFb.model || '',
    firstFallbackExtras: firstFb,
    extraFallbacks,
    hasLegacyFallback,
    reasoning
  }
}

async function runCliConfig(route, subArgs) {
  const res = await host.requestProfile(
    route,
    'cli.exec',
    { argv: ['--profile', route.targetProfile, 'config', ...subArgs] },
    30000,
    { spawnPriority: 'foreground' }
  )
  if (res?.blocked) {
    throw new Error(res.hint || 'CLI command was blocked by the gateway')
  }
  if (typeof res?.code === 'number' && res.code !== 0) {
    throw new Error((res.output || `cli.exec exited with code ${res.code}`).trim())
  }
  return res
}

function extractModelIds(providerObj) {
  if (!providerObj || !Array.isArray(providerObj.models)) return []
  const ids = []
  const seen = new Set()
  for (const item of providerObj.models) {
    const id = typeof item === 'string'
      ? item.trim()
      : String(item?.id ?? item?.slug ?? item?.name ?? '').trim()
    if (id && !seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

function ProviderField({
  idPrefix,
  label,
  value,
  onChange,
  providers,
  placeholder,
  disabled,
  rightAction
}) {
  const knownSlugs = useMemo(() => new Set(providers.map(p => p.slug)), [providers])
  const selectValue = value && knownSlugs.has(value) ? value : CUSTOM_PROVIDER_SENTINEL

  return jsxs('div', {
    className: 'hbm-field',
    children: [
      jsxs('div', {
        className: 'hbm-label-row',
        children: [
          jsx('label', { className: 'hbm-label', htmlFor: `${idPrefix}-input`, children: label }),
          rightAction || null
        ]
      }),
      providers.length > 0 && jsxs(Select, {
        value: selectValue,
        disabled,
        onValueChange: next => {
          if (next === CUSTOM_PROVIDER_SENTINEL) {
            if (knownSlugs.has(value)) onChange('')
          } else {
            onChange(next)
          }
        },
        children: [
          jsx(SelectTrigger, {
            size: 'sm',
            className: 'w-full',
            children: jsx(SelectValue, { placeholder: 'Select provider…' })
          }),
          jsxs(SelectContent, {
            children: [
              providers.map(p => jsx(SelectItem, {
                value: p.slug,
                children: p.authenticated ? `${p.name || p.slug} (${p.slug})` : `${p.name || p.slug} (${p.slug}) · unconfigured`
              }, p.slug)),
              jsx(SelectItem, { value: CUSTOM_PROVIDER_SENTINEL, children: 'Custom / type manually…' })
            ]
          })
        ]
      }),
      jsx(Input, {
        id: `${idPrefix}-input`,
        value,
        disabled,
        onChange: e => onChange(e.target.value),
        placeholder: placeholder || 'e.g. openrouter, openai, anthropic',
        spellCheck: false,
        autoComplete: 'off'
      })
    ]
  })
}

function ProfileRowEditor({
  route,
  editorId,
  parsed,
  catalog,
  catalogLoading,
  catalogError,
  onReloadCatalog,
  onSaved,
  onCancel
}) {
  const [provider, setProvider] = useState(parsed.provider)
  const [model, setModel] = useState(parsed.model)
  const [fbProvider, setFbProvider] = useState(parsed.fallbackProvider)
  const [fbModel, setFbModel] = useState(parsed.fallbackModel)
  const [clearAllFallbacks, setClearAllFallbacks] = useState(false)
  const [reasoning, setReasoning] = useState(parsed.reasoning)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [canForceModel, setCanForceModel] = useState(false)

  const providers = useMemo(() => {
    const raw = Array.isArray(catalog?.providers) ? catalog.providers : []
    return raw
      .filter(p => p && typeof p.slug === 'string' && p.slug.trim())
      .sort((a, b) => {
        if (Boolean(a.authenticated) !== Boolean(b.authenticated)) {
          return a.authenticated ? -1 : 1
        }
        return String(a.name || a.slug).localeCompare(String(b.name || b.slug))
      })
  }, [catalog])

  const primaryModels = useMemo(() => {
    const row = providers.find(p => p.slug === provider.trim())
    return extractModelIds(row)
  }, [providers, provider])

  const fallbackModels = useMemo(() => {
    const row = providers.find(p => p.slug === fbProvider.trim())
    return extractModelIds(row)
  }, [providers, fbProvider])

  const uid = useMemo(() => routeKey(route).replace(/[^a-zA-Z0-9_-]/g, '_'), [route])
  const primaryListId = `hbm-models-${uid}`
  const fallbackListId = `hbm-fb-models-${uid}`

  const performSave = async forceModelCli => {
    const nextProvider = provider.trim()
    const nextModel = model.trim()
    const nextFbProvider = fbProvider.trim()
    const nextFbModel = fbModel.trim()

    if ((nextFbProvider && !nextFbModel) || (!nextFbProvider && nextFbModel)) {
      setSaveError('Fallback requires both a provider and a model (or click Clear).')
      return
    }

    const modelDirty = nextProvider !== parsed.provider || nextModel !== parsed.model
    const fbDirty =
      clearAllFallbacks ||
      nextFbProvider !== parsed.fallbackProvider ||
      nextFbModel !== parsed.fallbackModel
    const reasoningDirty = reasoning !== parsed.reasoning

    if (!modelDirty && !fbDirty && !reasoningDirty) {
      onCancel()
      return
    }

    setSaving(true)
    setSaveError(null)
    setCanForceModel(false)

    try {
      // 1. Primary provider + default model
      if (modelDirty) {
        if (!nextProvider && !nextModel) {
          await runCliConfig(route, ['unset', 'model'])
        } else if (!nextProvider || !nextModel) {
          throw new Error('Both Provider and Default Model are required to set a model.')
        } else if (forceModelCli) {
          await runCliConfig(route, ['set', 'model.provider', nextProvider])
          await runCliConfig(route, ['set', 'model.default', nextModel])
          if (parsed.provider && parsed.provider !== nextProvider) {
            try {
              await runCliConfig(route, ['unset', 'model.base_url'])
            } catch {
              // Ignore "Config key not set" when no stale base_url existed.
            }
          }
        } else {
          let res
          try {
            res = await host.requestProfile(
              route,
              'profiles.configure',
              { name: route.targetProfile, provider: nextProvider, model: nextModel },
              30000,
              { spawnPriority: 'foreground' }
            )
          } catch (err) {
            setCanForceModel(true)
            throw err
          }

          if (res?.confirm_required) {
            void surfaceModelSwitchConfirm({
              confirmMessage: res.confirm_message,
              failureMessage: `Failed to update model for ${route.targetProfile}`,
              model: nextModel,
              requestConfirmed: () =>
                host.requestProfile(
                  route,
                  'profiles.configure',
                  {
                    name: route.targetProfile,
                    provider: nextProvider,
                    model: nextModel,
                    confirm_expensive_model: true
                  },
                  30000,
                  { spawnPriority: 'foreground' }
                ),
              finish: () => {
                void onSaved(true)
              }
            })
          } else if (res?.applied && res.applied.model === false) {
            setCanForceModel(true)
            throw new Error(
              res.error ||
                'Gateway rejected this provider/model combination (model may be unlisted or provider unconfigured).'
            )
          }
        }
      }

      // 2. Fallback model (canonical `fallback_providers` list; clear legacy `fallback_model` if present)
      if (fbDirty) {
        let nextChain = []
        if (!clearAllFallbacks && nextFbProvider && nextFbModel) {
          const sameRoute =
            nextFbProvider === parsed.fallbackProvider &&
            nextFbModel === parsed.fallbackModel
          const firstEntry = sameRoute
            ? { ...parsed.firstFallbackExtras, provider: nextFbProvider, model: nextFbModel }
            : { provider: nextFbProvider, model: nextFbModel }
          nextChain = [firstEntry, ...parsed.extraFallbacks]
        }
        await runCliConfig(route, ['set', 'fallback_providers', JSON.stringify(nextChain)])
        if (parsed.hasLegacyFallback) {
          try {
            await runCliConfig(route, ['unset', 'fallback_model'])
          } catch {
            // Ignore if already unset.
          }
        }
      }

      // 3. Reasoning effort (`config.set` for concrete values; `cli.exec config unset` for default)
      if (reasoningDirty) {
        if (reasoning === 'default') {
          try {
            await runCliConfig(route, ['unset', 'agent.reasoning_effort'])
          } catch (err) {
            if (!/not set/i.test(errorText(err))) throw err
          }
        } else {
          await host.requestProfile(
            route,
            'config.set',
            {
              key: 'reasoning',
              value: reasoning,
              scope: 'global',
              profile: route.targetProfile
            },
            20000,
            { spawnPriority: 'foreground' }
          )
        }
      }

      host.notify({
        kind: 'success',
        message: `Updated model settings for ${route.targetProfile}`
      })
      await onSaved(false)
    } catch (err) {
      const msg = errorText(err)
      setSaveError(msg)
      host.notify({
        kind: 'error',
        message: `Failed to save ${route.targetProfile}: ${msg}`
      })
    } finally {
      setSaving(false)
    }
  }

  return jsxs('div', {
    className: 'hbm-editor',
    id: editorId,
    children: [
      jsxs('div', {
        className: 'hbm-editor-head',
        children: [
          jsxs('div', {
            className: 'hbm-editor-heading',
            children: [
              jsx('span', { className: 'hbm-editor-title', children: 'Model settings' }),
              jsx('span', {
                className: 'hbm-catalog-status',
                role: 'status',
                'aria-live': 'polite',
                children: catalogLoading
                  ? 'Loading provider catalog…'
                  : catalogError
                    ? `Catalog unavailable (${catalogError}) — manual entry enabled`
                    : `${providers.length} provider${providers.length === 1 ? '' : 's'} in catalog`
              })
            ]
          }),
          jsx(Button, {
            variant: 'ghost',
            size: 'icon-xs',
            title: 'Refresh model catalog',
            'aria-label': `Refresh model catalog for ${route.targetProfile}`,
            disabled: catalogLoading || saving,
            onClick: onReloadCatalog,
            children: catalogLoading
              ? jsx(GlyphSpinner, {})
              : jsx(Codicon, { name: 'refresh' })
          })
        ]
      }),

      jsxs('div', {
        className: 'hbm-form-section',
        children: [
          jsx('div', { className: 'hbm-section-title', children: 'Primary' }),
          jsx(ProviderField, {
            idPrefix: `hbm-prov-${uid}`,
            label: 'Provider',
            value: provider,
            onChange: setProvider,
            providers,
            disabled: saving
          }),

          jsxs('div', {
            className: 'hbm-field',
            children: [
              jsxs('div', {
                className: 'hbm-label-row',
                children: [
                  jsx('label', { className: 'hbm-label', htmlFor: `hbm-model-${uid}`, children: 'Default model' }),
                  primaryModels.length > 0 && jsx('span', {
                    className: 'hbm-hint',
                    children: `${primaryModels.length} listed · type any slug`
                  })
                ]
              }),
              jsx(Input, {
                id: `hbm-model-${uid}`,
                list: primaryModels.length > 0 ? primaryListId : undefined,
                value: model,
                disabled: saving,
                onChange: e => setModel(e.target.value),
                placeholder: 'e.g. anthropic/claude-sonnet-4 or openai/gpt-6.2-sol',
                spellCheck: false,
                autoComplete: 'off'
              }),
              primaryModels.length > 0 && jsx('datalist', {
                id: primaryListId,
                children: primaryModels.map(id => jsx('option', { value: id }, id))
              })
            ]
          })
        ]
      }),

      jsxs('div', {
        className: 'hbm-form-section',
        children: [
          jsx('div', { className: 'hbm-section-title', children: 'Fallback' }),
          jsx(ProviderField, {
            idPrefix: `hbm-fb-prov-${uid}`,
            label: 'Fallback provider',
            value: fbProvider,
            onChange: v => {
              setClearAllFallbacks(false)
              setFbProvider(v)
            },
            providers,
            placeholder: 'None (optional)',
            disabled: saving,
            rightAction: (fbProvider || fbModel || parsed.extraFallbacks.length > 0) && jsx(Button, {
              variant: 'ghost',
              size: 'xs',
              disabled: saving,
              onClick: () => {
                setFbProvider('')
                setFbModel('')
                setClearAllFallbacks(true)
              },
              children: 'Clear'
            })
          }),

          jsxs('div', {
            className: 'hbm-field',
            children: [
              jsxs('div', {
                className: 'hbm-label-row',
                children: [
                  jsx('label', { className: 'hbm-label', htmlFor: `hbm-fb-model-${uid}`, children: 'Fallback model' }),
                  !clearAllFallbacks && parsed.extraFallbacks.length > 0 && jsx('span', {
                    className: 'hbm-hint',
                    children: `Preserves +${parsed.extraFallbacks.length} extra`
                  })
                ]
              }),
              jsx(Input, {
                id: `hbm-fb-model-${uid}`,
                list: fallbackModels.length > 0 ? fallbackListId : undefined,
                value: fbModel,
                disabled: saving,
                onChange: e => {
                  setClearAllFallbacks(false)
                  setFbModel(e.target.value)
                },
                placeholder: 'None (optional)',
                spellCheck: false,
                autoComplete: 'off'
              }),
              fallbackModels.length > 0 && jsx('datalist', {
                id: fallbackListId,
                children: fallbackModels.map(id => jsx('option', { value: id }, id))
              })
            ]
          })
        ]
      }),

      jsxs('div', {
        className: 'hbm-form-section',
        children: [
          jsx('div', { className: 'hbm-section-title', children: 'Reasoning' }),
          jsxs('div', {
            className: 'hbm-field',
            children: [
              jsx('label', { className: 'hbm-label', htmlFor: `hbm-reasoning-${uid}`, children: 'Reasoning effort' }),
              jsxs(Select, {
                value: reasoning,
                disabled: saving,
                onValueChange: setReasoning,
                children: [
                  jsx(SelectTrigger, {
                    id: `hbm-reasoning-${uid}`,
                    size: 'sm',
                    className: 'w-full',
                    children: jsx(SelectValue, {})
                  }),
                  jsx(SelectContent, {
                    children: REASONING_OPTIONS.map(opt =>
                      jsx(SelectItem, { value: opt.value, children: opt.label }, opt.value)
                    )
                  })
                ]
              })
            ]
          })
        ]
      }),

      saveError && jsxs('div', {
        className: 'hbm-err-box',
        role: 'alert',
        children: [
          jsx('span', { children: saveError }),
          canForceModel && jsx('div', {
            className: 'hbm-actions',
            children: jsx(Button, {
              variant: 'outline',
              size: 'xs',
              disabled: saving,
              onClick: () => void performSave(true),
              children: 'Force write to config.yaml'
            })
          })
        ]
      }),

      jsxs('div', {
        className: 'hbm-actions',
        children: [
          jsx(Button, {
            variant: 'ghost',
            size: 'xs',
            disabled: saving,
            onClick: onCancel,
            children: 'Cancel'
          }),
          jsx(Button, {
            variant: 'default',
            size: 'xs',
            disabled: saving,
            onClick: () => void performSave(false),
            children: saving ? 'Saving…' : 'Save changes'
          })
        ]
      })
    ]
  })
}

function ModelsPane() {
  const activeProfile = useValue(host.state.profile)
  const activeConnectionId = useValue(host.state.connectionId)
  const focusedOwner = useValue(host.state.focusedSessionOwner)

  const [scope, setScope] = useState('current')
  const [routes, setRoutes] = useState([])
  const [connLabels, setConnLabels] = useState({})
  const [routesLoading, setRoutesLoading] = useState(true)
  const [routesError, setRoutesError] = useState(null)

  // Map<routeKey, { status: 'loading'|'ready'|'error', parsed?, error? }>
  const [rowStates, setRowStates] = useState({})
  // Map<routeKey, { status: 'loading'|'ready'|'error', data?, error? }>
  const [catalogStates, setCatalogStates] = useState({})
  const [expandedKey, setExpandedKey] = useState(null)
  const [unavailableGroups, setUnavailableGroups] = useState({})

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchOneProfile = useCallback(async (route, priority = 'background') => {
    const key = routeKey(route)
    setRowStates(prev => ({
      ...prev,
      [key]: { ...prev[key], status: 'loading', error: null }
    }))
    try {
      const res = await host.requestProfile(
        route,
        'config.get',
        { key: 'full', profile: route.targetProfile },
        15000,
        { spawnPriority: priority }
      )
      if (!mountedRef.current) return
      if (res && res.ok === false) {
        const msg = errorText(res.error || 'Profile unavailable')
        setRowStates(prev => ({
          ...prev,
          [key]: {
            status: isMissingProfileError(msg) ? 'missing' : 'error',
            parsed: prev[key]?.parsed || null,
            error: msg
          }
        }))
        return
      }
      const parsed = parseProfileConfig(res?.config ?? res)
      setRowStates(prev => ({
        ...prev,
        [key]: { status: 'ready', parsed, error: null }
      }))
    } catch (err) {
      if (!mountedRef.current) return
      const msg = errorText(err)
      setRowStates(prev => ({
        ...prev,
        [key]: {
          status: isMissingProfileError(msg) ? 'missing' : 'error',
          parsed: prev[key]?.parsed || null,
          error: msg
        }
      }))
    }
  }, [])

  const fetchCatalog = useCallback(async (route, forceRefresh = false) => {
    const key = routeKey(route)
    setCatalogStates(prev => ({
      ...prev,
      [key]: { ...prev[key], status: 'loading', error: null }
    }))
    try {
      const data = await host.requestProfile(
        route,
        'model.options',
        {
          include_unconfigured: true,
          refresh: forceRefresh,
          profile: route.targetProfile
        },
        20000,
        { spawnPriority: 'foreground' }
      )
      if (!mountedRef.current) return
      setCatalogStates(prev => ({
        ...prev,
        [key]: { status: 'ready', data, error: null }
      }))
    } catch (err) {
      if (!mountedRef.current) return
      setCatalogStates(prev => ({
        ...prev,
        [key]: { status: 'error', data: prev[key]?.data || null, error: errorText(err) }
      }))
    }
  }, [])

  const resolveCurrentConnId = useCallback(
    routeList => {
      if (activeConnectionId) return activeConnectionId
      const hostActive = typeof host.activeConnectionId === 'function' ? host.activeConnectionId() : null
      if (hostActive) return hostActive
      const primaryRoute = routeList.find(r => r.primary)
      return primaryRoute ? primaryRoute.connectionId : routeList[0]?.connectionId || null
    },
    [activeConnectionId]
  )

  const loadAll = useCallback(
    async targetScope => {
      setRoutesLoading(true)
      setRoutesError(null)
      try {
        const [routeList, connections] = await Promise.all([
          host.profileRoutes(),
          host.connections().catch(() => [])
        ])
        if (!mountedRef.current) return
        const safeRoutes = Array.isArray(routeList) ? routeList : []
        const labels = {}
        for (const conn of Array.isArray(connections) ? connections : []) {
          if (conn && conn.id) {
            labels[conn.id] = conn.label || conn.name || conn.id
          }
        }
        setConnLabels(labels)
        setRoutes(safeRoutes)
        setRoutesLoading(false)

        const curConn = resolveCurrentConnId(safeRoutes)
        const toFetch =
          targetScope === 'all'
            ? safeRoutes
            : safeRoutes.filter(r => !curConn || r.connectionId === curConn)

        await Promise.allSettled(toFetch.map(r => fetchOneProfile(r, 'background')))
      } catch (err) {
        if (!mountedRef.current) return
        setRoutesError(errorText(err))
        setRoutesLoading(false)
      }
    },
    [fetchOneProfile, resolveCurrentConnId]
  )

  // Fetch once on mount for the default scope ('current'); no auto-polling.
  useEffect(() => {
    void loadAll('current')
  }, [])

  const currentConnId = useMemo(
    () => resolveCurrentConnId(routes),
    [resolveCurrentConnId, routes]
  )

  const visibleRoutes = useMemo(() => {
    const filtered =
      scope === 'all'
        ? routes
        : routes.filter(r => !currentConnId || r.connectionId === currentConnId)
    return [...filtered].sort((a, b) => {
      if (a.connectionId !== b.connectionId) {
        if (a.connectionId === currentConnId) return -1
        if (b.connectionId === currentConnId) return 1
        return (connLabels[a.connectionId] || a.connectionId).localeCompare(
          connLabels[b.connectionId] || b.connectionId
        )
      }
      if (a.targetProfile === 'default' && b.targetProfile !== 'default') return -1
      if (b.targetProfile === 'default' && a.targetProfile !== 'default') return 1
      return a.targetProfile.localeCompare(b.targetProfile)
    })
  }, [scope, routes, currentConnId, connLabels])

  // When switching to 'all', lazily fetch only routes that haven't been loaded yet.
  const handleScopeChange = nextScope => {
    setScope(nextScope)
    if (nextScope === 'all') {
      const unloaded = routes.filter(r => !rowStates[routeKey(r)])
      if (unloaded.length > 0) {
        void Promise.allSettled(unloaded.map(r => fetchOneProfile(r, 'background')))
      }
    }
  }

  const handleToggleRow = route => {
    const key = routeKey(route)
    if (expandedKey === key) {
      setExpandedKey(null)
      return
    }
    setExpandedKey(key)
    const row = rowStates[key]
    if (!row || row.status === 'error') {
      void fetchOneProfile(route, 'foreground')
    }
    const cat = catalogStates[key]
    if (!cat || cat.status === 'error') {
      void fetchCatalog(route, false)
    }
  }

  const grouped = useMemo(() => {
    if (scope !== 'all') {
      return [{ connectionId: currentConnId || 'current', label: null, items: visibleRoutes }]
    }
    const map = new Map()
    for (const r of visibleRoutes) {
      if (!map.has(r.connectionId)) {
        map.set(r.connectionId, {
          connectionId: r.connectionId,
          label: connLabels[r.connectionId] || r.connectionId,
          isCurrent: r.connectionId === currentConnId,
          items: []
        })
      }
      map.get(r.connectionId).items.push(r)
    }
    return [...map.values()]
  }, [scope, visibleRoutes, currentConnId, connLabels])

  const isAnyLoading =
    routesLoading || visibleRoutes.some(r => rowStates[routeKey(r)]?.status === 'loading')

  const renderRow = route => {
    const key = routeKey(route)
    const row = rowStates[key]
    const parsed = row?.parsed
    const expanded = expandedKey === key
    const cat = catalogStates[key]

    const isFocused = Boolean(
      focusedOwner
        ? focusedOwner.profile === route.targetProfile &&
            (!focusedOwner.connectionId || focusedOwner.connectionId === route.connectionId)
        : activeProfile === route.targetProfile &&
            (!currentConnId || route.connectionId === currentConnId)
    )

    const fallbackSummary = parsed?.fallbackModel
      ? `${parsed.fallbackProvider ? `${parsed.fallbackProvider} · ` : ''}${parsed.fallbackModel}${
          parsed.extraFallbacks.length > 0 ? ` (+${parsed.extraFallbacks.length})` : ''
        }`
      : null
    const editorId = `hbm-editor-${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`

    return jsxs('div', {
      className: 'hbm-row',
      'data-profile': route.targetProfile,
      'data-expanded': expanded ? 'true' : 'false',
      'data-current': isFocused ? 'true' : 'false',
      children: [
        jsxs('button', {
          type: 'button',
          className: 'hbm-row-btn',
          'aria-expanded': expanded,
          'aria-controls': expanded && parsed ? editorId : undefined,
          onClick: () => handleToggleRow(route),
          children: [
            jsxs('div', {
              className: 'hbm-row-top',
              children: [
                jsxs('div', {
                  className: 'hbm-row-name-wrap',
                  children: [
                    jsx('span', { className: 'hbm-row-name', children: route.targetProfile }),
                    isFocused && jsx('span', {
                      className: 'hbm-status-dot',
                      role: 'img',
                      'aria-label': 'Focused profile',
                      title: 'Focused profile'
                    })
                  ]
                }),
                jsxs('span', {
                  className: 'hbm-row-trailing',
                  children: [
                    parsed && jsx('span', {
                      className: 'hbm-reasoning',
                      title: `Reasoning effort: ${parsed.reasoning}`,
                      'aria-label': `Reasoning effort: ${parsed.reasoning}`,
                      children: REASONING_SHORT[parsed.reasoning] || parsed.reasoning
                    }),
                    row?.status === 'loading' && jsx(GlyphSpinner, {}),
                    jsx(Codicon, {
                      name: expanded ? 'chevron-down' : 'chevron-right',
                      className: 'hbm-chevron'
                    })
                  ]
                })
              ]
            }),

            jsxs('div', {
              className: 'hbm-row-body',
              children: [
                jsxs('div', {
                  className: 'hbm-model-line',
                  children: [
                    jsx('span', {
                      className: 'hbm-provider',
                      title: parsed ? `Provider: ${parsed.provider || 'auto'}` : undefined,
                      children: parsed ? parsed.provider || 'auto' : ''
                    }),
                    jsx('span', {
                      className: 'hbm-model',
                      'data-empty': parsed?.model ? 'false' : 'true',
                      title: parsed?.model ? `${parsed.provider || 'auto'} / ${parsed.model}` : undefined,
                      children: parsed
                        ? parsed.model || 'No model configured'
                        : row?.status === 'loading'
                          ? 'Loading configuration…'
                          : 'Configuration unavailable'
                    })
                  ]
                }),
                fallbackSummary && jsxs('div', {
                  className: 'hbm-fallback-line',
                  title: `Fallback: ${fallbackSummary}`,
                  children: [
                    jsx('span', { className: 'hbm-fallback-arrow', children: '↳' }),
                    jsx('span', { children: fallbackSummary })
                  ]
                })
              ]
            })
          ]
        }),

        expanded && parsed && jsx(ProfileRowEditor, {
          route,
          editorId,
          parsed,
          catalog: cat?.data || null,
          catalogLoading: cat?.status === 'loading',
          catalogError: cat?.status === 'error' ? cat.error : null,
          onReloadCatalog: () => void fetchCatalog(route, true),
          onSaved: async keepOpen => {
            await fetchOneProfile(route, 'foreground')
            if (!keepOpen) setExpandedKey(null)
          },
          onCancel: () => setExpandedKey(null)
        }, `${key}:${parsed.provider}:${parsed.model}:${parsed.fallbackProvider}:${parsed.fallbackModel}:${parsed.reasoning}`)
      ]
    }, key)
  }

  const renderOfflineRow = route => {
    const key = routeKey(route)
    const row = rowStates[key]
    const message = row?.error || 'Unreachable'
    return jsxs('div', {
      className: 'hbm-offline-row',
      'data-profile': route.targetProfile,
      role: 'alert',
      children: [
        jsx('span', { className: 'hbm-offline-dot', 'aria-hidden': 'true' }),
        jsx('span', { className: 'hbm-offline-name', children: route.targetProfile }),
        jsx('span', {
          className: 'hbm-offline-error',
          title: message,
          children: message
        }),
        jsx(Button, {
          variant: 'ghost',
          size: 'icon-xs',
          className: 'hbm-retry',
          title: `Retry ${route.targetProfile}`,
          'aria-label': `Retry ${route.targetProfile}`,
          onClick: () => void fetchOneProfile(route, 'foreground'),
          children: jsx(Codicon, { name: 'refresh' })
        })
      ]
    }, key)
  }

  const renderGroup = group => {
    const visible = group.items.filter(route => rowStates[routeKey(route)]?.status !== 'missing')
    const online = visible.filter(route => rowStates[routeKey(route)]?.status !== 'error')
    const unavailable = visible.filter(route => rowStates[routeKey(route)]?.status === 'error')
    if (visible.length === 0) return null
    const unavailableOpen = Boolean(unavailableGroups[group.connectionId])
    const unavailableId = `hbm-unavailable-${String(group.connectionId).replace(/[^a-zA-Z0-9_-]/g, '_')}`

    return jsxs(Fragment, {
      children: [
        group.label && jsxs('div', {
          className: 'hbm-group-hdr',
          children: [
            jsx('span', { children: group.label }),
            group.isCurrent && jsx(Badge, {
              variant: 'outline',
              className: 'hbm-badge-sm',
              children: 'Current'
            })
          ]
        }),
        online.map(renderRow),
        unavailable.length > 0 && jsxs('div', {
          className: 'hbm-unavailable',
          children: [
            jsxs('button', {
              type: 'button',
              className: 'hbm-unavailable-toggle',
              'aria-expanded': unavailableOpen,
              'aria-controls': unavailableOpen ? unavailableId : undefined,
              onClick: () => setUnavailableGroups(prev => ({
                ...prev,
                [group.connectionId]: !unavailableOpen
              })),
              children: [
                jsx(Codicon, {
                  name: unavailableOpen ? 'chevron-down' : 'chevron-right',
                  className: 'hbm-chevron'
                }),
                jsx('span', { children: `Unavailable (${unavailable.length})` })
              ]
            }),
            unavailableOpen && jsx('div', {
              className: 'hbm-unavailable-list',
              id: unavailableId,
              children: unavailable.map(renderOfflineRow)
            })
          ]
        })
      ]
    }, group.connectionId)
  }

  return jsxs('div', {
    className: 'hbm-root',
    children: [
      jsxs('div', {
        className: 'hbm-header',
        children: [
          jsx(SegmentedControl, {
            value: scope,
            onChange: handleScopeChange,
            sizing: 'content',
            options: [
              { id: 'current', label: 'Current' },
              { id: 'all', label: 'All gateways' }
            ]
          }),
          jsx(Button, {
            variant: 'ghost',
            size: 'icon-xs',
            title: 'Refresh profiles',
            'aria-label': 'Refresh profiles',
            disabled: isAnyLoading,
            onClick: () => void loadAll(scope),
            children: isAnyLoading
              ? jsx(GlyphSpinner, {})
              : jsx(Codicon, { name: 'refresh' })
          })
        ]
      }),

      jsx(ScrollArea, {
        className: 'hbm-scroll',
        children: routesLoading && routes.length === 0
          ? jsxs('div', {
              className: 'hbm-empty',
              children: [jsx(GlyphSpinner, {}), jsx('span', { children: 'Loading profiles…' })]
            })
          : routesError
            ? jsxs('div', {
                className: 'hbm-empty',
                children: [
                  jsx('span', { children: routesError }),
                  jsx(Button, {
                    variant: 'outline',
                    size: 'xs',
                    onClick: () => void loadAll(scope),
                    children: 'Retry'
                  })
                ]
              })
            : visibleRoutes.length === 0
              ? jsx('div', {
                  className: 'hbm-empty',
                  children: 'No profiles found for this gateway.'
                })
              : jsx('div', {
                  className: 'hbm-list',
                  children: grouped.map(renderGroup)
                })
      })
    ]
  })
}

function injectStyle() {
  if (typeof document === 'undefined') return () => {}
  let el = document.getElementById(STYLE_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = CSS
    document.head.appendChild(el)
  }
  return () => {
    const existing = document.getElementById(STYLE_ID)
    if (existing) existing.remove()
  }
}

export default {
  id: ID,
  name: 'Model Tab',
  description: 'Inspect and edit default models, fallback models, and reasoning effort across Hermes profiles.',
  register(ctx) {
    const removeStyle = injectStyle()
    if (typeof ctx.onDispose === 'function') {
      ctx.onDispose(removeStyle)
    }

    ctx.register({
      id: 'pane',
      area: 'panes',
      title: 'Models',
      data: {
        placement: 'left',
        width: '260px',
        collapsible: true,
        hideOnly: true,
        dock: {
          pane: 'sessions',
          pos: 'center',
          enforce: true
        }
      },
      render: () => jsx(ModelsPane, {})
    })
  }
}
