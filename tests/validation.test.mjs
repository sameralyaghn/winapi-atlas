import assert from 'node:assert/strict'
import test from 'node:test'

import { validateDataset } from '../scripts/validation.mjs'

const categories = [{
  id: 'injection',
  title: 'Injection',
  description: 'Placing code in another process.',
  explanation: 'Injection explanation.',
  color: '#38bdf8'
}]

const api = {
  name: 'CreateRemoteThread',
  library: 'Kernel32.dll',
  description: 'Creates a thread in another process.',
  categories: ['injection'],
  mitre: [],
  docs: 'https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createremotethread',
  docs_kind: 'direct',
  detection: {
    summary: 'Remote thread creation.',
    sysmon_events: [8],
    etw_providers: []
  },
  telemetry_coverage: 'indirect',
  legit_use: 'Debuggers.',
  related: [],
  suspicion: 'high',
  verified: true,
  reviewed_at: null,
  sources: []
}

const secondApi = {
  ...api,
  name: 'VirtualAllocEx',
  docs: 'https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualallocex'
}

const basePreset = {
  id: 'classic-injection',
  title: 'Classic injection',
  kind: 'chain',
  mitre: { id: 'T1055.001', name: 'Process Injection: DLL Injection' },
  required: ['VirtualAllocEx', 'CreateRemoteThread'],
  sequence: ['VirtualAllocEx', 'CreateRemoteThread'],
  optional: [],
  defender_note: 'Correlate allocation and remote thread creation.'
}

function errorsFor(mutate) {
  const candidate = structuredClone(api)
  mutate(candidate)
  return validateDataset([candidate], categories, [], { today: '2026-11-12' }).errors
}

function presetErrorsFor(mutate) {
  const preset = structuredClone(basePreset)
  mutate(preset)
  return validateDataset([secondApi, api], categories, [preset], { today: '2026-11-12' }).errors
}

function assertError(errors, fragment) {
  assert.ok(
    errors.some((error) => error.includes(fragment)),
    `expected an error containing "${fragment}", got:\n${errors.join('\n')}`
  )
}

test('validateDataset accepts a valid entry with paired review metadata', () => {
  const candidate = structuredClone(api)
  candidate.reviewed_at = '2026-01-10'
  candidate.sources = [{
    label: 'Microsoft Learn',
    url: candidate.docs
  }]
  const result = validateDataset([candidate], categories, [], { today: '2026-11-12' })
  assert.deepEqual(result.errors, [])
  assert.equal(result.reviewedCount, 1)
})

test('validateDataset rejects invalid docs_kind values', () => {
  const errors = errorsFor((candidate) => {
    candidate.docs_kind = 'first-party'
  })
  assertError(errors, 'docs_kind must be direct|related|none')
})

test('validateDataset rejects a none docs kind with a documentation URL', () => {
  const errors = errorsFor((candidate) => {
    candidate.docs_kind = 'none'
  })
  assertError(errors, 'docs_kind is none but a docs URL is present')
})

test('validateDataset rejects a direct docs kind without a documentation URL', () => {
  const errors = errorsFor((candidate) => {
    candidate.docs = ''
    candidate.docs_kind = 'direct'
  })
  assertError(errors, 'docs_kind is direct but no docs URL is present')
})

test('validateDataset rejects future and impossible review dates', () => {
  assertError(errorsFor((candidate) => {
    candidate.reviewed_at = '2027-01-01'
  }), 'reviewed_at must be null or a valid ISO date')

  assertError(errorsFor((candidate) => {
    candidate.reviewed_at = '2026-02-30'
  }), 'reviewed_at must be null or a valid ISO date')
})

test('validateDataset requires review dates and sources to be paired', () => {
  assertError(errorsFor((candidate) => {
    candidate.reviewed_at = '2026-01-10'
  }), 'reviewed_at requires at least one source')

  assertError(errorsFor((candidate) => {
    candidate.sources = [{
      label: 'Microsoft Learn',
      url: candidate.docs
    }]
  }), 'sources require a reviewed_at date')
})

test('validateDataset rejects malformed source labels and non-HTTPS URLs', () => {
  assertError(errorsFor((candidate) => {
    candidate.reviewed_at = '2026-01-10'
    candidate.sources = [{ label: '', url: candidate.docs }]
  }), 'each source needs a non-empty label')

  assertError(errorsFor((candidate) => {
    candidate.reviewed_at = '2026-01-10'
    candidate.sources = [{ label: 'Microsoft Learn', url: 'http://learn.microsoft.com/' }]
  }), 'each source needs an https URL')
})

test('validateDataset rejects a non-array sources field', () => {
  const errors = errorsFor((candidate) => {
    candidate.sources = 'https://learn.microsoft.com/'
  })
  assertError(errors, 'sources must be an array')
})

test('validateDataset rejects invalid telemetry coverage values', () => {
  const errors = errorsFor((candidate) => {
    candidate.telemetry_coverage = 'native'
  })
  assertError(errors, 'telemetry_coverage must be direct|indirect|none|unknown')
})

test('validateDataset rejects event-backed coverage claims without mappings', () => {
  assertError(errorsFor((candidate) => {
    candidate.detection.sysmon_events = []
    candidate.telemetry_coverage = 'indirect'
  }), 'telemetry_coverage indirect requires a Sysmon or ETW mapping')

  assertError(errorsFor((candidate) => {
    candidate.detection.sysmon_events = []
    candidate.telemetry_coverage = 'direct'
  }), 'telemetry_coverage direct requires a Sysmon or ETW mapping')
})

test('validateDataset rejects none coverage when events are mapped', () => {
  const errors = errorsFor((candidate) => {
    candidate.telemetry_coverage = 'none'
  })
  assertError(errors, 'telemetry_coverage none conflicts with recorded Sysmon/ETW mappings')
})

test('validateDataset allows unknown coverage without evidence', () => {
  const errors = errorsFor((candidate) => {
    candidate.detection.sysmon_events = []
    candidate.telemetry_coverage = 'unknown'
  })
  assert.deepEqual(errors, [])
})

test('validateDataset accepts valid chain and indicator presets', () => {
  const indicator = structuredClone(basePreset)
  indicator.id = 'driver-indicator'
  indicator.kind = 'indicator'
  indicator.required = ['CreateRemoteThread']
  delete indicator.sequence

  const result = validateDataset([secondApi, api], categories, [basePreset, indicator], { today: '2026-11-12' })
  assert.deepEqual(result.errors, [])
})

test('validateDataset rejects chains with fewer than two required APIs', () => {
  const errors = presetErrorsFor((preset) => {
    preset.required = ['CreateRemoteThread']
    preset.sequence = ['CreateRemoteThread']
  })
  assertError(errors, 'chain presets require at least two required APIs')
})

test('validateDataset rejects chain sequences that omit a required API', () => {
  const errors = presetErrorsFor((preset) => {
    preset.sequence = ['CreateRemoteThread']
  })
  assertError(errors, 'sequence must contain exactly the required APIs')
})

test('validateDataset rejects chain sequences with extra APIs', () => {
  const errors = presetErrorsFor((preset) => {
    preset.sequence = ['VirtualAllocEx', 'CreateRemoteThread', 'OpenProcess']
  })
  assertError(errors, 'sequence must contain exactly the required APIs')
})

test('validateDataset rejects duplicate APIs in a chain sequence', () => {
  const errors = presetErrorsFor((preset) => {
    preset.sequence = ['VirtualAllocEx', 'VirtualAllocEx']
  })
  assertError(errors, 'sequence must not contain duplicates')
})

test('validateDataset requires explicit preset kinds', () => {
  const errors = presetErrorsFor((preset) => {
    delete preset.kind
  })
  assertError(errors, 'kind must be chain|indicator')
})

test('validateDataset classifications reject invalid indicator shapes', () => {
  assertError(presetErrorsFor((preset) => {
    preset.kind = 'indicator'
    preset.required = ['CreateRemoteThread']
  }), 'indicator presets must not define a sequence')

  assertError(presetErrorsFor((preset) => {
    preset.kind = 'indicator'
    delete preset.sequence
  }), 'indicator presets require exactly one required API')
})
