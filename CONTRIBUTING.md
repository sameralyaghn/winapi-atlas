# Contributing to WinAPI Atlas

Thanks for helping improve the catalog. This project documents Windows APIs for defenders; it does not
accept exploit code, shellcode, weaponised samples or step-by-step attack instructions.

## Ways to contribute

- Add a missing Windows API.
- Correct a library, description, category or MITRE mapping.
- Improve detection guidance (better Sysmon events, ETW providers, correlation advice).
- Add or refine a technique preset in `data/presets.json`.
- Fix accessibility, responsive layout or performance issues in the UI.

## Add an API

1. Open `data/apis.json` and add one object. Keep the array sorted by `name` (the validator does not
   enforce order, but reviews are easier).
2. Use this shape:

```json
{
  "name": "VirtualAllocEx",
  "library": "Kernel32.dll",
  "description": "Reserves, commits or changes a region of memory inside another process.",
  "categories": ["injection", "memory-management"],
  "mitre": [{ "id": "T1055", "name": "Process Injection" }],
  "docs": "https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualallocex",
  "docs_kind": "direct",
  "detection": {
    "summary": "Executable allocation in a remote process is a strong injection precursor.",
    "sysmon_events": [],
    "etw_providers": ["Microsoft-Windows-Threat-Intelligence"],
    "notes": "Memory allocation APIs are not logged directly by Sysmon. Microsoft-Windows-Threat-Intelligence emits kernel memory events only when the provider is enabled. Correlate with a following WriteProcessMemory from the same source process."
  },
  "legit_use": "Debuggers, EDR agents, profilers and some installers.",
  "related": ["OpenProcess", "WriteProcessMemory", "VirtualProtectEx"],
  "suspicion": "high",
  "verified": true,
  "telemetry_coverage": "indirect",
  "reviewed_at": null,
  "sources": []
}
```

3. Rules:
   - The API must exist. Do not invent names, variants or documentation URLs.
   - `categories` must use ids from `data/categories.json` (`enumeration`, `injection`, `evasion`,
     `spying`, `internet`, `anti-debugging`, `ransomware`, `helper`, `persistence`,
     `privilege-escalation`, `credential-access`, `process-hollowing`, `lateral-movement`,
     `defense-evasion`, `crypto`, `registry`, `service-control`, `memory-management`,
     `network-sockets`).
   - `related` entries must exist in the dataset.
   - MITRE ids use `T####` or `T####.###`.
   - `docs_kind` must be `direct`, `related`, or `none`. Use `direct` only when the linked Microsoft Learn
     page is for this specific function. A generic or related page is `related`.
   - `telemetry_coverage` must be `direct`, `indirect`, `none`, or `unknown`. Sysmon and ETW events that
     describe OS effects are `indirect`. Use `direct` only when a provider reports the API call itself.
   - `reviewed_at` is `null` unless a human has reviewed the entry's claims. If set, use an ISO date that
     is not in the future and add at least one entry to `sources`.
   - `sources` uses `{ "label": "...", "url": "https://..." }` objects. Do not add a review date or a
     source you cannot substantiate.
   - `"verified"` is a legacy documentation-presence flag, not a review status. Set it to `false` only
     when no public Microsoft reference page exists for the function.
   - Prefer behavioural detection guidance over signatures.

The **Contribute** button in the app builds this JSON for you (and a prefilled issue body) without
sending anything to a server.

## Add a technique preset

Add an entry to `data/presets.json`:

```json
{
  "id": "classic-dll-injection",
  "title": "Classic DLL injection",
  "kind": "chain",
  "mitre": { "id": "T1055.001", "name": "Process Injection: Dynamic-link Library Injection" },
  "required": ["OpenProcess", "VirtualAllocEx", "WriteProcessMemory", "CreateRemoteThread"],
  "sequence": ["OpenProcess", "VirtualAllocEx", "WriteProcessMemory", "CreateRemoteThread"],
  "optional": ["VirtualProtectEx", "GetProcAddress", "LoadLibraryW"],
  "defender_note": "Correlate allocation, write and remote thread creation from one source process."
}
```

- Use `"kind": "chain"` for an ordered chain with at least two `required` APIs.
- `sequence` must list exactly the same APIs as `required`, in the intended execution order. Do not add an API just to satisfy the minimum.
- For a single-API pattern, use `"kind": "indicator"`, exactly one `required` API, and no `sequence`.
- Optional APIs do not affect required ordering and cannot replace a required API.
- Every listed API must exist in `data/apis.json`.
- An API cannot be both required and optional.
- The defender note should describe correlation and telemetry, not a bypass.

## Validate before opening a PR

```bash
npm run check
```

`npm run check` runs the dataset validator and the unit test suite. CI runs the same command on every push and pull request, and both must pass. You can also run each step separately with `npm run validate` and `npm test`.

## PR checklist

- [ ] `data/apis.json` parses and `npm run validate` reports 0 errors.
- [ ] Tests pass (`npm test`).
- [ ] `npm run check` passes locally.
- [ ] New entries use real API names and real Microsoft Learn links.
- [ ] `docs_kind` and `telemetry_coverage` match the evidence in the entry.
- [ ] `reviewed_at` and `sources` are only populated for a real, cited human review.
- [ ] Detection advice is behavioural and defensive.
- [ ] No exploit, malware or weaponised code is included.
- [ ] UI changes keep keyboard access, visible focus and AA contrast.
- [ ] If you changed the schema, update `README.md` and, when needed, `scripts/validate.mjs`.

## Data corrections

If an entry is wrong, say what is wrong and cite the source (Microsoft Learn page, Windows SDK header,
Sysmon schema, ATT&CK page). Corrections that remove a claim are as welcome as additions.