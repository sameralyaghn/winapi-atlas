#!/usr/bin/env node
/**
 * Audit batch 1: high-suspicion APIs with no Sysmon/ETW mapping.
 *
 * This script is intentionally explicit rather than heuristic. Every review
 * below is tied to the API's existing Microsoft Learn link, the official
 * Sysmon event reference, and MITRE ATT&CK when the entry has a mapped
 * technique. It never invents a telemetry mapping.
 *
 * Run once: node scripts/audit-batch-1.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = join(root, 'data', 'apis.json')
const apis = JSON.parse(readFileSync(dataPath, 'utf8'))
const reviewedAt = '2026-11-15'

const SYSMON_SOURCE = {
  label: 'Microsoft Sysmon events',
  url: 'https://learn.microsoft.com/en-us/windows/security/operating-system-security/sysmon/sysmon-events'
}

/**
 * Documentation links that are not the API's own page. Equivalent means the
 * page documents a Win32/native counterpart; generic means an index or shared
 * reference page.
 */
const DOCS_KIND = {
  EtwNotificationRegister: 'generic',
  GetCurrentDirectoryW: 'direct',
  LdrEnumerateLoadedModules: 'equivalent',
  LdrGetProcedureAddress: 'equivalent',
  LdrLoadDll: 'equivalent',
  LdrUnloadDll: 'equivalent',
  NtCreateKey: 'equivalent',
  NtCreateThread: 'equivalent',
  NtCreateThreadEx: 'equivalent',
  NtCreateUserProcess: 'equivalent',
  NtDelayExecution: 'equivalent',
  NtDeleteFile: 'equivalent',
  NtDeleteKey: 'equivalent',
  NtDuplicateObject: 'equivalent',
  NtGetContextThread: 'equivalent',
  NtLoadDriver: 'equivalent',
  NtMapViewOfSection: 'equivalent',
  NtOpenKey: 'equivalent',
  NtProtectVirtualMemory: 'equivalent',
  NtQueryKey: 'equivalent',
  NtQueryValueKey: 'equivalent',
  NtQueueApcThread: 'equivalent',
  NtQueueApcThreadEx: 'equivalent',
  NtReadVirtualMemory: 'equivalent',
  NtResumeThread: 'equivalent',
  NtSetContextThread: 'equivalent',
  NtSetInformationProcess: 'equivalent',
  NtSetValueKey: 'equivalent',
  NtSuspendThread: 'equivalent',
  NtTerminateProcess: 'equivalent',
  NtTestAlert: 'generic',
  NtTraceControl: 'generic',
  NtTraceEvent: 'equivalent',
  NtUnloadDriver: 'equivalent',
  NtUnmapViewOfSection: 'equivalent',
  NtWriteVirtualMemory: 'equivalent',
  ObtainUserAgentString: 'direct',
  RtlCreateProcessParametersEx: 'generic',
  RtlCreateUserThread: 'generic',
  RtlDestroyProcessParameters: 'generic',
  RtlImageDirectoryEntryToData: 'equivalent',
  RtlImageNtHeader: 'generic',
  SetConsoleTitleW: 'direct',
  SetCurrentDirectoryW: 'direct',
  URLDownloadToCacheFileW: 'direct',
  URLDownloadToFile: 'direct',
  URLDownloadToFileA: 'direct',
  URLOpenBlockingStreamW: 'direct',
  WriteConsoleW: 'direct',
  ZwCreateThreadEx: 'equivalent'
}

const REVIEWS = {
  BCryptEncrypt: {
    summary: 'No reviewed Sysmon/ETW event identifies BCryptEncrypt; encryption is inferred from file behavior and EDR crypto telemetry.',
    notes: 'Correlate EDR user-mode crypto API telemetry with Sysmon 11 file writes and rapid renames or extension changes. The import alone is weak because browsers, messengers, VPNs and installers use the same API.'
  },
  BitBlt: {
    summary: 'Screen capture through BitBlt has no direct event; it is inferred from GDI/API telemetry and the resulting file or network activity.',
    notes: 'Use EDR GDI/API hooks or call-stack telemetry to observe BitBlt and adjacent GetDC, GetDIBits or StretchBlt calls. Correlate with Sysmon 11 image writes or Sysmon 3 connections from the same process.'
  },
  BlockInput: {
    summary: 'BlockInput has no reviewed Sysmon/ETW event; detect input suppression through EDR hooks and session behavior.',
    notes: 'Look for BlockInput together with window or input manipulation, not as a standalone event. EDR user-mode hooks or call stacks can surface the call; correlate with a process suppressing keyboard and mouse input while it performs other activity.'
  },
  ChangeServiceConfigW: {
    summary: 'ChangeServiceConfigW is not logged directly; the defensible signal is the resulting service-registry change and process execution.',
    notes: 'Monitor Sysmon 12/13 for writes under HKLM\\SYSTEM\\CurrentControlSet\\Services, especially ImagePath, ServiceDll, Start and ObjectName, and Sysmon 1 for the modified binary or service host starting. Treat the API import as context, not proof.'
  },
  CheckRemoteDebuggerPresent: {
    summary: 'CheckRemoteDebuggerPresent has no native event; anti-debug behavior must be inferred from API/EDR telemetry and surrounding execution.',
    notes: 'Use EDR user-mode hooks or call stacks and correlate with IsDebuggerPresent, NtQueryInformationProcess, timing checks or debugger-detection branches. The reviewed Sysmon event set does not record this query.'
  },
  CreateToolhelp32Snapshot: {
    summary: 'Process, thread or module snapshots are not recorded by Sysmon; discovery is detected through API/EDR telemetry and follow-on enumeration.',
    notes: 'Use EDR hooks or call stacks to see CreateToolhelp32Snapshot, then correlate with Process32First/Next, Module32First/Next, Thread32First and process-access activity (Sysmon 10 where configured). Sysmon 1 only shows child-process creation.'
  },
  CredEnumerateW: {
    summary: 'Credential Manager enumeration has no reviewed Sysmon/ETW event; EDR credential-API telemetry is the practical signal.',
    notes: 'Look for CredEnumerateW together with CredReadW/CredFree and subsequent authentication, token, file or network activity. Use EDR user-mode hooks; do not claim Sysmon captures the vault read.'
  },
  CredReadW: {
    summary: 'Credential Manager reads have no reviewed Sysmon/ETW event; detect them through EDR credential-API telemetry and correlated authentication.',
    notes: 'Correlate CredReadW with CredEnumerateW, credential-store access and later logon or network authentication. EDR user-mode hooks or call stacks are required; Sysmon does not record the vault read itself.'
  },
  CryptEncrypt: {
    summary: 'No reviewed Sysmon/ETW event identifies CryptEncrypt; ransomware behavior must be inferred from file and process effects.',
    notes: 'Correlate EDR crypto API telemetry with Sysmon 11 file writes, rapid renames and extension changes, and ransom-note or backup-tampering behavior. The API is also common in benign software, so never treat it as a verdict.'
  },
  CryptImportKey: {
    summary: 'CryptImportKey has no reviewed Sysmon/ETW event; key import is only a supporting signal for later encryption or decryption.',
    notes: 'Correlate EDR crypto API telemetry with CryptEncrypt/CryptDecrypt and Sysmon 11 file writes. Import presence alone is weak and common in browsers, VPNs and installers.'
  },
  DefineDosDeviceW: {
    summary: 'DefineDosDeviceW is not directly logged; detect doppelganging setups through API telemetry and adjacent file, image and process events.',
    notes: 'Use EDR user-mode hooks or call stacks for DefineDosDeviceW and correlate with process creation (Sysmon 1), image loads (Sysmon 7) and file writes (Sysmon 11). The device mapping itself has no reviewed Sysmon/ETW event.'
  },
  DeleteService: {
    summary: 'DeleteService has no direct event; the observable effect is removal of the service registry key and related process activity.',
    notes: 'Monitor Sysmon 12/13 for deletion or modification under the Services registry key and Sysmon 1 for service-host activity. Use EDR hooks for the API call; the service deletion event is not a Sysmon event.'
  },
  DuplicateToken: {
    summary: 'DuplicateToken has no reviewed Sysmon/ETW event; token duplication is inferred from EDR handle/token telemetry and the operations that follow.',
    notes: 'Correlate DuplicateToken with OpenProcessToken, DuplicateTokenEx, SetThreadToken or CreateProcessWithTokenW. Sysmon 10 can show process access when a token is taken from another process, but it does not identify the duplication call.'
  },
  DuplicateTokenEx: {
    summary: 'DuplicateTokenEx is not directly logged; correlate token-handle telemetry with impersonation or process creation that uses the duplicate.',
    notes: 'Look for DuplicateTokenEx plus OpenProcessToken, ImpersonateLoggedOnUser, SetThreadToken or CreateProcessWithTokenW. Sysmon 10 can provide process-access context; EDR handle/token telemetry is needed for the duplication itself.'
  },
  EnumProcesses: {
    summary: 'EnumProcesses has no reviewed Sysmon/ETW event; process discovery is detected through API/EDR telemetry and follow-on access.',
    notes: 'Use EDR hooks or call stacks and correlate with OpenProcess, EnumProcessModules, process-access events (Sysmon 10 where configured) and child-process creation (Sysmon 1). The enumeration call itself is not recorded.'
  },
  EtwEventWrite: {
    summary: 'EtwEventWrite has no self-event; detect tampering through ntdll integrity, EDR instrumentation and gaps in expected provider telemetry.',
    notes: 'Monitor ntdll image integrity, EDR hooks and provider-event gaps rather than expecting a Sysmon event for the API. Correlate with other AMSI/ETW tampering behavior; the absence of an event is not proof by itself.'
  },
  GetAsyncKeyState: {
    summary: 'GetAsyncKeyState has no reviewed Sysmon/ETW event; key polling is detected through EDR hooks, call stacks and behavioral analysis.',
    notes: 'Use EDR user-mode hooks or polling analysis and correlate with SetWindowsHookEx, GetKeyboardState or GetKeyState. The reviewed Sysmon event set does not record the key-state query.'
  },
  GetTokenInformation: {
    summary: 'GetTokenInformation has no reviewed Sysmon/ETW event; token reconnaissance is inferred from API/EDR telemetry and adjacent token operations.',
    notes: 'Correlate GetTokenInformation with OpenProcessToken, AdjustTokenPrivileges, DuplicateTokenEx or impersonation. EDR token/handle telemetry is required; Sysmon 10 may add process-access context but not the query.'
  },
  InternetReadFile: {
    summary: 'InternetReadFile has no reviewed Sysmon/ETW event; Sysmon 3 records the connection, not the response read.',
    notes: 'Use EDR network/API telemetry to observe InternetReadFile and correlate with Sysmon 3 connections and Sysmon 11 file writes from the same process. Import presence alone is common in browsers and updaters.'
  },
  InternetWriteFile: {
    summary: 'InternetWriteFile has no reviewed Sysmon/ETW event; Sysmon 3 shows the connection, not the bytes uploaded.',
    notes: 'Use EDR network/API telemetry for upload behavior and correlate with Sysmon 3 connections and file or credential access that could supply the data. Do not describe Sysmon 3 as request-body visibility.'
  },
  IsDebuggerPresent: {
    summary: 'IsDebuggerPresent has no native event; anti-debug checks are inferred from API/EDR telemetry and surrounding control flow.',
    notes: 'Use EDR user-mode hooks or call stacks and correlate with CheckRemoteDebuggerPresent, NtQueryInformationProcess, timing checks and debugger-detection branches. Sysmon does not log this query.'
  },
  listen: {
    summary: 'listen has no reviewed Sysmon/ETW event; Sysmon 3 records connections, not the socket state change.',
    notes: 'Use EDR socket/API telemetry, firewall or network-flow data for inbound listeners and correlate with accept, bind and subsequent connection events. A listening socket by itself is not proof of malicious behavior.'
  },
  LsaEnumerateLogonSessions: {
    summary: 'LsaEnumerateLogonSessions has no reviewed Sysmon/ETW event; LSASS access telemetry and EDR RPC visibility provide context.',
    notes: 'Use Sysmon 10 ProcessAccess where configured for LSASS access and EDR LSASS/RPC telemetry for the call. Correlate with LsaGetLogonSessionData and later token or authentication activity.'
  },
  LsaGetLogonSessionData: {
    summary: 'LsaGetLogonSessionData is not directly logged; detect it through LSASS access telemetry and the surrounding session-reconnaissance chain.',
    notes: 'Correlate with LsaEnumerateLogonSessions, LsaOpenPolicy and token operations. Sysmon 10 can show LSASS access when ProcessAccess is enabled; the LSA query itself requires EDR or LSASS-side telemetry.'
  },
  LsaOpenPolicy: {
    summary: 'LsaOpenPolicy has no reviewed Sysmon/ETW event; LSASS access and EDR RPC telemetry provide the practical signal.',
    notes: 'Look for LsaOpenPolicy together with LsaQueryInformationPolicy or LsaRetrievePrivateData. Sysmon 10 may show LSASS process access; EDR is needed to distinguish policy queries from normal security-tool behavior.'
  },
  LsaQueryInformationPolicy: {
    summary: 'LsaQueryInformationPolicy is not directly logged; correlate LSASS access with policy and account discovery behavior.',
    notes: 'Use Sysmon 10 ProcessAccess for LSASS context and EDR RPC telemetry for the policy query. Correlate with LsaOpenPolicy and subsequent account, session or token operations.'
  },
  LsaRetrievePrivateData: {
    summary: 'LsaRetrievePrivateData has no reviewed Sysmon/ETW event; detect LSASS secret access through process-access and EDR RPC telemetry.',
    notes: 'Correlate with LsaOpenPolicy and Sysmon 10 LSASS access where configured. EDR LSASS/RPC telemetry is required to see the private-data read; the API call is not a Sysmon event.'
  },
  NetSessionEnum: {
    summary: 'NetSessionEnum has no reviewed Sysmon/ETW event; correlate SMB/network activity with the surrounding discovery behavior.',
    notes: 'Use Sysmon 3 for network connections and Sysmon 17/18 for named pipes where applicable, plus EDR SMB/API telemetry. The enum call itself is not recorded.'
  },
  NetShareAdd: {
    summary: 'NetShareAdd is not directly logged; monitor share configuration changes and subsequent SMB access instead.',
    notes: 'Correlate Sysmon 12/13 registry changes for LanmanServer share configuration with Sysmon 3 and 17/18 access events. Use EDR API telemetry for the call and treat the import as context.'
  },
  NetUseAdd: {
    summary: 'NetUseAdd has no reviewed Sysmon/ETW event; correlate SMB connections and named-pipe activity with the connection setup.',
    notes: 'Use Sysmon 3 for network connections and Sysmon 17/18 for named pipes, plus EDR network/API telemetry. The API call itself is not recorded, and legitimate backup and admin tools use it.'
  },
  NetUserEnum: {
    summary: 'NetUserEnum has no reviewed Sysmon/ETW event; account discovery is detected through API/EDR telemetry and follow-on activity.',
    notes: 'Use EDR user-mode hooks or call stacks and correlate with NetUserGetInfo, NetLocalGroupGetMembers, logon activity and later credential access. Sysmon does not record the enumeration call.'
  },
  NetWkstaUserEnum: {
    summary: 'NetWkstaUserEnum is not directly logged; logged-on-user discovery is inferred from API/EDR telemetry and adjacent session queries.',
    notes: 'Correlate with NetSessionEnum, NetUserEnum, LsaEnumerateLogonSessions and later authentication activity. Use EDR hooks or call stacks; there is no reviewed Sysmon event for the API.'
  },
  NtCreateSection: {
    summary: 'NtCreateSection has no reviewed Sysmon/ETW event; section use is detected through EDR or provider-specific memory telemetry.',
    notes: 'Correlate with NtMapViewOfSection, NtWriteVirtualMemory and remote thread creation (Sysmon 8) where those adjacent operations produce events. EDR kernel/user telemetry is needed for the section creation itself.'
  },
  NtQueryInformationProcess: {
    summary: 'NtQueryInformationProcess has no reviewed Sysmon/ETW event; process reconnaissance and anti-debug checks need API/EDR telemetry.',
    notes: 'Correlate with IsDebuggerPresent, CheckRemoteDebuggerPresent, process-enumeration APIs and hollowing-related memory operations. Sysmon 10 can show process access, but not this query.'
  },
  NtQuerySystemInformation: {
    summary: 'NtQuerySystemInformation is not directly logged; system discovery requires API/EDR telemetry and correlation with follow-on access.',
    notes: 'Use EDR hooks or call stacks and correlate with EnumProcesses, NtQueryInformationProcess, process-access events (Sysmon 10) and child-process creation (Sysmon 1). The query itself is not a Sysmon event.'
  },
  NtSetInformationProcess: {
    summary: 'NtSetInformationProcess has no reviewed Sysmon/ETW event; process-configuration abuse requires EDR kernel or user-mode telemetry.',
    notes: 'Monitor EDR callbacks for instrumentation-callback, mitigation-policy and debug-flag changes and correlate with injection, debugger evasion or process tampering. Sysmon 25 may show adjacent image tampering but does not identify this API.'
  },
  NtSetInformationThread: {
    summary: 'NtSetInformationThread is not directly logged; ThreadHideFromDebugger and similar changes require EDR telemetry.',
    notes: 'Use EDR hooks or call stacks and correlate with IsDebuggerPresent, NtQueryInformationProcess and anti-debug behavior. The reviewed Sysmon event set does not expose this thread-information class.'
  },
  NtSetSystemInformation: {
    summary: 'NtSetSystemInformation has no reviewed Sysmon/ETW event; privileged system changes require EDR or provider-specific telemetry.',
    notes: 'Correlate with driver loading (Sysmon 6), service changes (Sysmon 12/13) and privileged process activity (Sysmon 1). The API call itself is not recorded, and legitimate security products also use it.'
  },
  NtTestAlert: {
    summary: 'NtTestAlert has no reviewed Sysmon/ETW event; APC delivery is inferred from the injection chain around it.',
    notes: 'Correlate with QueueUserAPC/NtQueueApcThread, remote thread creation (Sysmon 8) and process access (Sysmon 10). EDR or ETW-TI telemetry is needed to see the APC delivery itself.'
  },
  NtUnloadDriver: {
    summary: 'NtUnloadDriver is not directly logged; Sysmon 6 records driver loads, not unloads.',
    notes: 'Correlate service-registry changes (Sysmon 12/13), prior driver load (Sysmon 6) and EDR driver-management telemetry. Do not cite Sysmon 6 as an unload event.'
  },
  OpenProcessToken: {
    summary: 'OpenProcessToken has no reviewed Sysmon/ETW event; token acquisition is inferred from EDR handle telemetry and subsequent token operations.',
    notes: 'Correlate with DuplicateTokenEx, GetTokenInformation, AdjustTokenPrivileges, SetThreadToken and CreateProcessWithTokenW. Sysmon 10 can add process-access context when a handle is opened to another process.'
  },
  OpenSCManagerA: {
    summary: 'OpenSCManagerA has no reviewed Sysmon/ETW event; detect the resulting service operations rather than the ANSI open call.',
    notes: 'Correlate with Sysmon 12/13 service-registry changes and Sysmon 1 service-host or binary execution. Use EDR hooks for the API call; the documented Sysmon events describe effects, not the open itself.'
  },
  OpenSCManagerW: {
    summary: 'OpenSCManagerW is not directly logged; service-control intent is inferred from subsequent changes and execution.',
    notes: 'Correlate with CreateService, ChangeServiceConfig, StartService and DeleteService effects under the Services registry key (Sysmon 12/13) and process creation (Sysmon 1). The open call itself is not a Sysmon event.'
  },
  PFXExportCertStoreEx: {
    summary: 'PFXExportCertStoreEx has no reviewed Sysmon/ETW event; certificate/private-key export is inferred from file writes and EDR crypto telemetry.',
    notes: 'Correlate with Sysmon 11 writes of .pfx/.p12 files and EDR certificate-store/API telemetry. Legitimate browser, VPN and installer workflows also export PFX data, so scope by process and destination.'
  },
  PFXImportCertStore: {
    summary: 'PFXImportCertStore is not directly logged; correlate PFX file access with certificate-store changes and later signing or authentication.',
    notes: 'Use Sysmon 11 for PFX file creation/modification and EDR certificate-store/API telemetry for the import. There is no reviewed Sysmon event for the import call itself.'
  },
  SetThreadToken: {
    summary: 'SetThreadToken has no reviewed Sysmon/ETW event; impersonation is inferred from EDR token telemetry and the operations performed under the token.',
    notes: 'Correlate with DuplicateTokenEx, ImpersonateLoggedOnUser, OpenProcessToken and privileged file, registry or network access. Sysmon 1 can show a process created under the token; the thread-token assignment itself is not logged.'
  },
  SetTokenInformation: {
    summary: 'SetTokenInformation is not directly logged; integrity-level or session changes require EDR token telemetry and correlation.',
    notes: 'Correlate with duplicate/open token calls and subsequent privileged process creation (Sysmon 1), file or registry access. The API call itself has no reviewed Sysmon/ETW event.'
  },
  SetWindowsHookExA: {
    summary: 'SetWindowsHookExA has no direct event; Sysmon 7 can show a hook DLL loading, but not the hook installation.',
    notes: 'Use EDR user-mode hooks or call stacks and correlate with Sysmon 7 image loads only when a hook DLL is injected. Low-level keyboard hooks can run in the installing process without a DLL load.'
  },
  SetWindowsHookExW: {
    summary: 'SetWindowsHookExW is not directly logged; Sysmon 7 may show hook-DLL loading but not the hook call itself.',
    notes: 'Correlate hook installation with Sysmon 7 image loads only when a DLL is injected; low-level keyboard hooks may stay in-process. EDR hooks, call stacks and subsequent keylogging or input-capture behavior are the practical signals.'
  },
  StartServiceW: {
    summary: 'StartServiceW has no reviewed Sysmon/ETW event; the observable effect is service-host or service-binary execution.',
    notes: 'Correlate Sysmon 1 process creation for services.exe or the configured binary with prior service-registry changes (Sysmon 12/13). Use EDR API telemetry for the start call itself.'
  },
  VirtualAlloc: {
    summary: 'VirtualAlloc has no reviewed Sysmon/ETW event; memory allocation is inferred from EDR or provider-specific memory telemetry.',
    notes: 'Correlate with VirtualProtect, writes, image mapping and remote thread creation (Sysmon 8) where those adjacent operations produce events. Allocation alone is ubiquitous in normal processes.'
  },
  VirtualProtect: {
    summary: 'VirtualProtect is not directly logged; protection changes require EDR or provider-specific memory telemetry and adjacent injection context.',
    notes: 'Correlate with VirtualAlloc, writes and remote thread creation (Sysmon 8) or process access (Sysmon 10). Every process changes page protections, so use call stacks and the surrounding chain, not the import alone.'
  },
  waveInOpen: {
    summary: 'waveInOpen has no reviewed Sysmon/ETW event; microphone capture is inferred from EDR audio/API telemetry and file or network effects.',
    notes: 'Correlate with waveInStart, waveInAddBuffer, Sysmon 11 audio-file writes and Sysmon 3 uploads. EDR user-mode hooks or call stacks are needed for the device-open call.'
  },
  waveInStart: {
    summary: 'waveInStart is not directly logged; recording is inferred from EDR audio telemetry and the resulting file or network activity.',
    notes: 'Correlate with waveInOpen, waveInAddBuffer, Sysmon 11 file writes and Sysmon 3 connections. There is no reviewed Sysmon event for starting the waveform capture.'
  },
  WinHttpReadData: {
    summary: 'WinHttpReadData has no reviewed Sysmon/ETW event; Sysmon 3 records the connection, not the response-body read.',
    notes: 'Use EDR network/API telemetry and correlate with Sysmon 3 connections and file writes from the same process. Do not describe Sysmon 3 as payload-content visibility.'
  },
  WinHttpWriteData: {
    summary: 'WinHttpWriteData is not directly logged; Sysmon 3 shows the connection, not the uploaded body.',
    notes: 'Use EDR network/API telemetry for upload behavior and correlate with Sysmon 3 connections and the data source. The API call itself has no reviewed Sysmon event.'
  },
  WNetAddConnection2A: {
    summary: 'WNetAddConnection2A has no reviewed Sysmon/ETW event; correlate SMB connections and named pipes with the connection setup.',
    notes: 'Use Sysmon 3 for network connections and Sysmon 17/18 for named pipes, plus EDR network/API telemetry. The ANSI API call is not recorded.'
  },
  WNetAddConnection2W: {
    summary: 'WNetAddConnection2W is not directly logged; detect the resulting SMB connection and remote-share activity instead.',
    notes: 'Correlate Sysmon 3 connections and Sysmon 17/18 named-pipe activity with EDR API telemetry. Legitimate admin, backup and deployment tools use the same call.'
  },
  WNetAddConnection3W: {
    summary: 'WNetAddConnection3W has no reviewed Sysmon/ETW event; correlate SMB and named-pipe activity with the connection request.',
    notes: 'Use Sysmon 3 and 17/18 plus EDR network/API telemetry. The owner-window variant changes authentication prompting, not the observability of the connection itself.'
  },
  WTSQueryUserToken: {
    summary: 'WTSQueryUserToken is not directly logged; token acquisition requires EDR telemetry and correlation with later process creation.',
    notes: 'Correlate with DuplicateTokenEx, CreateProcessAsUser/CreateProcessWithTokenW and Sysmon 1 process creation. The query requires SeTcbPrivilege and is not a Sysmon event.'
  },
  ZwQuerySystemInformation: {
    summary: 'ZwQuerySystemInformation has no reviewed Sysmon/ETW event; native system discovery requires API/EDR telemetry.',
    notes: 'Use EDR hooks or call stacks and correlate with EnumProcesses, NtQueryInformationProcess, Sysmon 10 process access and Sysmon 1 child-process creation. The query itself is not recorded.'
  }
}

function mitreUrl(id) {
  const [base, sub] = String(id).split('.')
  return sub
    ? `https://attack.mitre.org/techniques/${base}/${sub}/`
    : `https://attack.mitre.org/techniques/${base}/`
}

function docsLabel(api) {
  if (api.docs_kind === 'equivalent') return 'Microsoft Learn — equivalent API documentation'
  if (api.docs_kind === 'generic') return 'Microsoft Learn — generic API documentation'
  if (api.docs_kind === 'related') return 'Microsoft Learn — related API documentation'
  return `Microsoft Learn — ${api.name}`
}

function sourcesFor(api) {
  const sources = [{ label: docsLabel(api), url: api.docs }]
  for (const tech of api.mitre || []) {
    sources.push({
      label: `MITRE ATT&CK ${tech.id}: ${tech.name}`,
      url: mitreUrl(tech.id)
    })
  }
  sources.push(SYSMON_SOURCE)
  return sources.filter((source, index, all) => all.findIndex((item) => item.url === source.url) === index)
}

const highNoTelemetry = apis.filter((api) => {
  const detection = api.detection || {}
  return api.suspicion === 'high' && !(detection.sysmon_events?.length || detection.etw_providers?.length)
})
const expected = new Set(highNoTelemetry.map((api) => api.name))
const reviewedNames = new Set(Object.keys(REVIEWS))
if (expected.size !== reviewedNames.size || [...expected].some((name) => !reviewedNames.has(name))) {
  throw new Error(`Batch mismatch: expected ${expected.size} high no-telemetry APIs, reviews cover ${reviewedNames.size}`)
}

let docsChanged = 0
let reviewedChanged = 0
for (const api of apis) {
  const docsKind = DOCS_KIND[api.name]
  if (docsKind) {
    api.docs_kind = docsKind
    docsChanged += 1
  }

  const review = REVIEWS[api.name]
  if (!review) continue
  if (!api.docs) throw new Error(`${api.name}: cannot review without a documentation URL`)
  api.reviewed_at = reviewedAt
  api.detection = {
    ...api.detection,
    summary: review.summary,
    notes: review.notes,
    sysmon_events: [],
    etw_providers: []
  }
  api.telemetry_coverage = 'none'
  api.sources = sourcesFor(api)
  reviewedChanged += 1
}

writeFileSync(dataPath, `${JSON.stringify(apis, null, 2)}\n`)
console.log(`Audit batch 1 applied: ${reviewedChanged} entries reviewed, ${docsChanged} documentation kind overrides applied`)
