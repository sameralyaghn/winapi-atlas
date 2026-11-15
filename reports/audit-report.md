# Audit report

Generated from `data/apis.json` by `npm run audit`.

## Coverage

- **Entries reviewed:** 61 of 721
- **High-suspicion reviewed:** 61 of 123
- **High-suspicion without Sysmon/ETW:** 61 (61 reviewed)
- **High-suspicion with mapped telemetry still unreviewed:** 62
- **Generic detection notes remaining:** 519
- **Telemetry unknown:** 0
- **Entries without MITRE mapping:** 292
- **Descriptions under 45 characters:** 237
- **Unique legitimate-use strings:** 117
- **Documentation kinds:** direct=679, equivalent=34, generic=7, related=1, none=0
- **Documentation links reclassified as equivalent/generic:** 41

## Reviewed entries

| API | Suspicion | Telemetry | Docs | Generic note | Reviewed |
| --- | --- | --- | --- | --- | --- |
| BCryptEncrypt | high | none | direct |  | 2026-11-15 |
| BitBlt | high | none | direct |  | 2026-11-15 |
| BlockInput | high | none | direct |  | 2026-11-15 |
| ChangeServiceConfigW | high | none | direct |  | 2026-11-15 |
| CheckRemoteDebuggerPresent | high | none | direct |  | 2026-11-15 |
| CreateToolhelp32Snapshot | high | none | direct |  | 2026-11-15 |
| CredEnumerateW | high | none | direct |  | 2026-11-15 |
| CredReadW | high | none | direct |  | 2026-11-15 |
| CryptEncrypt | high | none | direct |  | 2026-11-15 |
| CryptImportKey | high | none | direct |  | 2026-11-15 |
| DefineDosDeviceW | high | none | direct |  | 2026-11-15 |
| DeleteService | high | none | direct |  | 2026-11-15 |
| DuplicateToken | high | none | direct |  | 2026-11-15 |
| DuplicateTokenEx | high | none | direct |  | 2026-11-15 |
| EnumProcesses | high | none | direct |  | 2026-11-15 |
| EtwEventWrite | high | none | direct |  | 2026-11-15 |
| GetAsyncKeyState | high | none | direct |  | 2026-11-15 |
| GetTokenInformation | high | none | direct |  | 2026-11-15 |
| InternetReadFile | high | none | direct |  | 2026-11-15 |
| InternetWriteFile | high | none | direct |  | 2026-11-15 |
| IsDebuggerPresent | high | none | direct |  | 2026-11-15 |
| listen | high | none | direct |  | 2026-11-15 |
| LsaEnumerateLogonSessions | high | none | direct |  | 2026-11-15 |
| LsaGetLogonSessionData | high | none | direct |  | 2026-11-15 |
| LsaOpenPolicy | high | none | direct |  | 2026-11-15 |
| LsaQueryInformationPolicy | high | none | direct |  | 2026-11-15 |
| LsaRetrievePrivateData | high | none | direct |  | 2026-11-15 |
| NetSessionEnum | high | none | direct |  | 2026-11-15 |
| NetShareAdd | high | none | direct |  | 2026-11-15 |
| NetUseAdd | high | none | direct |  | 2026-11-15 |
| NetUserEnum | high | none | direct |  | 2026-11-15 |
| NetWkstaUserEnum | high | none | direct |  | 2026-11-15 |
| NtCreateSection | high | none | direct |  | 2026-11-15 |
| NtQueryInformationProcess | high | none | direct |  | 2026-11-15 |
| NtQuerySystemInformation | high | none | direct |  | 2026-11-15 |
| NtSetInformationProcess | high | none | equivalent |  | 2026-11-15 |
| NtSetInformationThread | high | none | direct |  | 2026-11-15 |
| NtSetSystemInformation | high | none | direct |  | 2026-11-15 |
| NtTestAlert | high | none | generic |  | 2026-11-15 |
| NtUnloadDriver | high | none | equivalent |  | 2026-11-15 |
| OpenProcessToken | high | none | direct |  | 2026-11-15 |
| OpenSCManagerA | high | none | direct |  | 2026-11-15 |
| OpenSCManagerW | high | none | direct |  | 2026-11-15 |
| PFXExportCertStoreEx | high | none | direct |  | 2026-11-15 |
| PFXImportCertStore | high | none | direct |  | 2026-11-15 |
| SetThreadToken | high | none | direct |  | 2026-11-15 |
| SetTokenInformation | high | none | direct |  | 2026-11-15 |
| SetWindowsHookExA | high | none | direct |  | 2026-11-15 |
| SetWindowsHookExW | high | none | direct |  | 2026-11-15 |
| StartServiceW | high | none | direct |  | 2026-11-15 |
| VirtualAlloc | high | none | direct |  | 2026-11-15 |
| VirtualProtect | high | none | direct |  | 2026-11-15 |
| waveInOpen | high | none | direct |  | 2026-11-15 |
| waveInStart | high | none | direct |  | 2026-11-15 |
| WinHttpReadData | high | none | direct |  | 2026-11-15 |
| WinHttpWriteData | high | none | direct |  | 2026-11-15 |
| WNetAddConnection2A | high | none | direct |  | 2026-11-15 |
| WNetAddConnection2W | high | none | direct |  | 2026-11-15 |
| WNetAddConnection3W | high | none | direct |  | 2026-11-15 |
| WTSQueryUserToken | high | none | direct |  | 2026-11-15 |
| ZwQuerySystemInformation | high | none | direct |  | 2026-11-15 |

## Batch notes

The reviewed set contains 61 entries with no mapped Sysmon/ETW event. Their guidance explicitly names the absence of a direct mapping and the practical alternatives (EDR API hooks, call stacks, imports, or adjacent documented events). No reviewed entry claims direct telemetry without an event mapping.

Documentation links for native `Nt*`/`Zw*`/`Rtl*` entries were classified as `equivalent` when they document a counterpart, and shared index pages as `generic`. These classification fixes are independent of review status.

## Sources used

- Microsoft Learn API/documentation pages: 61
- Microsoft Sysmon event reference: 61
- MITRE ATT&CK technique pages: 52
- Unique source labels/URLs: 85

- 61 × Microsoft Sysmon events <https://learn.microsoft.com/en-us/windows/security/operating-system-security/sysmon/sysmon-events>
- 5 × MITRE ATT&CK T1134.001: Access Token Manipulation: Token Impersonation/Theft <https://attack.mitre.org/techniques/T1134/001/>
- 4 × MITRE ATT&CK T1021.002: Remote Services: SMB/Windows Admin Shares <https://attack.mitre.org/techniques/T1021/002/>
- 4 × MITRE ATT&CK T1082: System Information Discovery <https://attack.mitre.org/techniques/T1082/>
- 4 × MITRE ATT&CK T1685: Disable or Modify Tools <https://attack.mitre.org/techniques/T1685/>
- 3 × MITRE ATT&CK T1033: System Owner/User Discovery <https://attack.mitre.org/techniques/T1033/>
- 3 × MITRE ATT&CK T1055: Process Injection <https://attack.mitre.org/techniques/T1055/>
- 3 × MITRE ATT&CK T1056.001: Input Capture: Keylogging <https://attack.mitre.org/techniques/T1056/001/>
- 3 × MITRE ATT&CK T1057: Process Discovery <https://attack.mitre.org/techniques/T1057/>
- 3 × MITRE ATT&CK T1622: Debugger Evasion <https://attack.mitre.org/techniques/T1622/>
- 2 × MITRE ATT&CK T1041: Exfiltration Over C2 Channel <https://attack.mitre.org/techniques/T1041/>
- 2 × MITRE ATT&CK T1071: Application Layer Protocol <https://attack.mitre.org/techniques/T1071/>
- 2 × MITRE ATT&CK T1123: Audio Capture <https://attack.mitre.org/techniques/T1123/>
- 2 × MITRE ATT&CK T1486: Data Encrypted for Impact <https://attack.mitre.org/techniques/T1486/>
- 2 × MITRE ATT&CK T1552.004: Unsecured Credentials: Private Keys <https://attack.mitre.org/techniques/T1552/004/>
- 2 × MITRE ATT&CK T1555: Credentials from Password Stores <https://attack.mitre.org/techniques/T1555/>
- 1 × Microsoft Learn — BCryptEncrypt <https://learn.microsoft.com/en-us/windows/win32/api/bcrypt/nf-bcrypt-bcryptencrypt>
- 1 × Microsoft Learn — BitBlt <https://learn.microsoft.com/en-us/windows/win32/api/wingdi/nf-wingdi-bitblt>
- 1 × Microsoft Learn — BlockInput <https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-blockinput>
- 1 × Microsoft Learn — ChangeServiceConfigW <https://learn.microsoft.com/en-us/windows/win32/api/winsvc/nf-winsvc-changeserviceconfigw>
- 1 × Microsoft Learn — CheckRemoteDebuggerPresent <https://learn.microsoft.com/en-us/windows/win32/api/debugapi/nf-debugapi-checkremotedebuggerpresent>
- 1 × Microsoft Learn — CreateToolhelp32Snapshot <https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/nf-tlhelp32-createtoolhelp32snapshot>
- 1 × Microsoft Learn — CredEnumerateW <https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credenumeratew>
- 1 × Microsoft Learn — CredReadW <https://learn.microsoft.com/en-us/windows/win32/api/wincred/nf-wincred-credreadw>
- 1 × Microsoft Learn — CryptEncrypt <https://learn.microsoft.com/en-us/windows/win32/api/wincrypt/nf-wincrypt-cryptencrypt>
- 1 × Microsoft Learn — CryptImportKey <https://learn.microsoft.com/en-us/windows/win32/api/wincrypt/nf-wincrypt-cryptimportkey>
- 1 × Microsoft Learn — DefineDosDeviceW <https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-definedosdevicew>
- 1 × Microsoft Learn — DeleteService <https://learn.microsoft.com/en-us/windows/win32/api/winsvc/nf-winsvc-deleteservice>
- 1 × Microsoft Learn — DuplicateToken <https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-duplicatetoken>
- 1 × Microsoft Learn — DuplicateTokenEx <https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-duplicatetokenex>
- 1 × Microsoft Learn — EnumProcesses <https://learn.microsoft.com/en-us/windows/win32/api/psapi/nf-psapi-enumprocesses>
- 1 × Microsoft Learn — equivalent API documentation <https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/wdm/nf-wdm-zwunloaddriver>
- 1 × Microsoft Learn — equivalent API documentation <https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setprocessinformation>
- 1 × Microsoft Learn — EtwEventWrite <https://learn.microsoft.com/en-us/windows/win32/devnotes/etweventwrite>
- 1 × Microsoft Learn — generic API documentation <https://learn.microsoft.com/en-us/windows-hardware/drivers/kernel/ntxxx-routines>
- 1 × Microsoft Learn — GetAsyncKeyState <https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getasynckeystate>
- 1 × Microsoft Learn — GetTokenInformation <https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-gettokeninformation>
- 1 × Microsoft Learn — InternetReadFile <https://learn.microsoft.com/en-us/windows/win32/api/wininet/nf-wininet-internetreadfile>
- 1 × Microsoft Learn — InternetWriteFile <https://learn.microsoft.com/en-us/windows/win32/api/wininet/nf-wininet-internetwritefile>
- 1 × Microsoft Learn — IsDebuggerPresent <https://learn.microsoft.com/en-us/windows/win32/api/debugapi/nf-debugapi-isdebuggerpresent>
- 1 × Microsoft Learn — listen <https://learn.microsoft.com/en-us/windows/win32/api/winsock2/nf-winsock2-listen>
- 1 × Microsoft Learn — LsaEnumerateLogonSessions <https://learn.microsoft.com/en-us/windows/win32/api/ntsecapi/nf-ntsecapi-lsaenumeratelogonsessions>
- 1 × Microsoft Learn — LsaGetLogonSessionData <https://learn.microsoft.com/en-us/windows/win32/api/ntsecapi/nf-ntsecapi-lsagetlogonsessiondata>
- 1 × Microsoft Learn — LsaOpenPolicy <https://learn.microsoft.com/en-us/windows/win32/api/ntsecapi/nf-ntsecapi-lsaopenpolicy>
- 1 × Microsoft Learn — LsaQueryInformationPolicy <https://learn.microsoft.com/en-us/windows/win32/api/ntsecapi/nf-ntsecapi-lsaqueryinformationpolicy>
- 1 × Microsoft Learn — LsaRetrievePrivateData <https://learn.microsoft.com/en-us/windows/win32/api/ntsecapi/nf-ntsecapi-lsaretrieveprivatedata>
- 1 × Microsoft Learn — NetSessionEnum <https://learn.microsoft.com/en-us/windows/win32/api/lmshare/nf-lmshare-netsessionenum>
- 1 × Microsoft Learn — NetShareAdd <https://learn.microsoft.com/en-us/windows/win32/api/lmshare/nf-lmshare-netshareadd>
- 1 × Microsoft Learn — NetUseAdd <https://learn.microsoft.com/en-us/windows/win32/api/lmuse/nf-lmuse-netuseadd>
- 1 × Microsoft Learn — NetUserEnum <https://learn.microsoft.com/en-us/windows/win32/api/lmaccess/nf-lmaccess-netuserenum>
- 1 × Microsoft Learn — NetWkstaUserEnum <https://learn.microsoft.com/en-us/windows/win32/api/lmwksta/nf-lmwksta-netwkstauserenum>
- 1 × Microsoft Learn — NtCreateSection <https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-ntcreatesection>
- 1 × Microsoft Learn — NtQueryInformationProcess <https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntqueryinformationprocess>
- 1 × Microsoft Learn — NtQuerySystemInformation <https://learn.microsoft.com/en-us/windows/win32/api/winternl/nf-winternl-ntquerysysteminformation>
- 1 × Microsoft Learn — NtSetInformationThread <https://learn.microsoft.com/en-us/windows-hardware/drivers/ddi/ntifs/nf-ntifs-ntsetinformationthread>
- 1 × Microsoft Learn — NtSetSystemInformation <https://learn.microsoft.com/en-us/windows/win32/sysinfo/ntsetsysteminformation>
- 1 × Microsoft Learn — OpenProcessToken <https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-openprocesstoken>
- 1 × Microsoft Learn — OpenSCManagerA <https://learn.microsoft.com/en-us/windows/win32/api/winsvc/nf-winsvc-openscmanagera>
- 1 × Microsoft Learn — OpenSCManagerW <https://learn.microsoft.com/en-us/windows/win32/api/winsvc/nf-winsvc-openscmanagerw>
- 1 × Microsoft Learn — PFXExportCertStoreEx <https://learn.microsoft.com/en-us/windows/win32/api/wincrypt/nf-wincrypt-pfxexportcertstoreex>
- 1 × Microsoft Learn — PFXImportCertStore <https://learn.microsoft.com/en-us/windows/win32/api/wincrypt/nf-wincrypt-pfximportcertstore>
- 1 × Microsoft Learn — SetThreadToken <https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setthreadtoken>
- 1 × Microsoft Learn — SetTokenInformation <https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-settokeninformation>
- 1 × Microsoft Learn — SetWindowsHookExA <https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowshookexa>
- 1 × Microsoft Learn — SetWindowsHookExW <https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowshookexw>
- 1 × Microsoft Learn — StartServiceW <https://learn.microsoft.com/en-us/windows/win32/api/winsvc/nf-winsvc-startservicew>
- 1 × Microsoft Learn — VirtualAlloc <https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualalloc>
- 1 × Microsoft Learn — VirtualProtect <https://learn.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-virtualprotect>
- 1 × Microsoft Learn — waveInOpen <https://learn.microsoft.com/en-us/windows/win32/api/mmeapi/nf-mmeapi-waveinopen>
- 1 × Microsoft Learn — waveInStart <https://learn.microsoft.com/en-us/windows/win32/api/mmeapi/nf-mmeapi-waveinstart>
- 1 × Microsoft Learn — WinHttpReadData <https://learn.microsoft.com/en-us/windows/win32/api/winhttp/nf-winhttp-winhttpreaddata>
- 1 × Microsoft Learn — WinHttpWriteData <https://learn.microsoft.com/en-us/windows/win32/api/winhttp/nf-winhttp-winhttpwritedata>
- 1 × Microsoft Learn — WNetAddConnection2A <https://learn.microsoft.com/en-us/windows/win32/api/winnetwk/nf-winnetwk-wnetaddconnection2a>
- 1 × Microsoft Learn — WNetAddConnection2W <https://learn.microsoft.com/en-us/windows/win32/api/winnetwk/nf-winnetwk-wnetaddconnection2w>
- 1 × Microsoft Learn — WNetAddConnection3W <https://learn.microsoft.com/en-us/windows/win32/api/winnetwk/nf-winnetwk-wnetaddconnection3w>
- 1 × Microsoft Learn — WTSQueryUserToken <https://learn.microsoft.com/en-us/windows/win32/api/wtsapi32/nf-wtsapi32-wtsqueryusertoken>
- 1 × Microsoft Learn — ZwQuerySystemInformation <https://learn.microsoft.com/en-us/windows/win32/sysinfo/zwquerysysteminformation>
- 1 × MITRE ATT&CK T1003.004: OS Credential Dumping: LSA Secrets <https://attack.mitre.org/techniques/T1003/004/>
- 1 × MITRE ATT&CK T1049: System Network Connections Discovery <https://attack.mitre.org/techniques/T1049/>
- 1 × MITRE ATT&CK T1087.001: Account Discovery: Local Account <https://attack.mitre.org/techniques/T1087/001/>
- 1 × MITRE ATT&CK T1095: Non-Application Layer Protocol <https://attack.mitre.org/techniques/T1095/>
- 1 × MITRE ATT&CK T1113: Screen Capture <https://attack.mitre.org/techniques/T1113/>
- 1 × MITRE ATT&CK T1134: Access Token Manipulation <https://attack.mitre.org/techniques/T1134/>
- 1 × MITRE ATT&CK T1543.003: Create or Modify System Process: Windows Service <https://attack.mitre.org/techniques/T1543/003/>
- 1 × MITRE ATT&CK T1569.002: System Services: Service Execution <https://attack.mitre.org/techniques/T1569/002/>

## Still open

- 660 entries remain unreviewed and are marked as such in the app.
- 519 entries still carry the generic user-mode detection note.
- 62 high-suspicion entries remain in the queue, including 62 with mapped telemetry.
- 292 entries have no MITRE technique, 237 have descriptions under 45 characters, and there are 117 unique legitimate-use strings.

