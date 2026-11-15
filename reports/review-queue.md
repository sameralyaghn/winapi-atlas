# Review queue

Generated from `data/apis.json`: **660 unreviewed entries**.

Priority order: all high-suspicion entries first (no-telemetry gaps before mapped telemetry), then medium-suspicion entries with mapped telemetry, then the remainder.

## Summary

- Total entries: 721
- Reviewed: 61
- Unreviewed: 660
- High suspicion: 123 (61 reviewed; 61/61 no-telemetry reviewed)
- Generic detection notes: 519
- Telemetry unknown: 0
- Entries without MITRE mapping: 292
- Descriptions under 45 characters: 237
- Unique legitimate-use strings: 117

## 2 — High suspicion, mapped telemetry (62)

| API | Suspicion | Telemetry | Docs | Generic note | Reviewed |
| --- | --- | --- | --- | --- | --- |
| accept | high | indirect | direct |  |  |
| AdjustTokenPrivileges | high | indirect | direct |  |  |
| AmsiScanBuffer | high | indirect | direct |  |  |
| connect | high | indirect | direct |  |  |
| CreateProcessAsUserW | high | indirect | direct |  |  |
| CreateProcessWithTokenW | high | indirect | direct |  |  |
| CreateRemoteThread | high | indirect | direct |  |  |
| CreateRemoteThreadEx | high | indirect | direct |  |  |
| CreateServiceA | high | indirect | direct |  |  |
| CreateServiceW | high | indirect | direct |  |  |
| CryptUnprotectData | high | indirect | direct |  |  |
| DnsQuery_A | high | indirect | direct |  |  |
| DnsQuery_W | high | indirect | direct |  |  |
| DnsQueryEx | high | indirect | direct |  |  |
| FtpGetFileW | high | indirect | direct |  |  |
| FtpPutFileW | high | indirect | direct |  |  |
| gethostbyname | high | indirect | direct |  |  |
| HttpSendRequestW | high | indirect | direct |  |  |
| ImpersonateLoggedOnUser | high | indirect | direct |  |  |
| ImpersonateNamedPipeClient | high | indirect | direct |  |  |
| InternetOpenUrlA | high | indirect | direct |  |  |
| InternetOpenUrlW | high | indirect | direct |  |  |
| LogonUserExW | high | indirect | direct |  |  |
| LogonUserW | high | indirect | direct |  |  |
| MiniDumpWriteDump | high | indirect | direct |  |  |
| NetLocalGroupAddMembers | high | indirect | direct |  |  |
| NtAllocateVirtualMemory | high | indirect | direct |  |  |
| NtCreateKey | high | indirect | equivalent |  |  |
| NtCreateThread | high | indirect | equivalent |  |  |
| NtCreateThreadEx | high | indirect | equivalent |  |  |
| NtCreateUserProcess | high | indirect | equivalent |  |  |
| NtLoadDriver | high | indirect | equivalent |  |  |
| NtMapViewOfSection | high | indirect | equivalent |  |  |
| NtOpenProcess | high | indirect | direct |  |  |
| NtProtectVirtualMemory | high | indirect | equivalent |  |  |
| NtQueueApcThread | high | indirect | equivalent |  |  |
| NtQueueApcThreadEx | high | indirect | equivalent |  |  |
| NtReadVirtualMemory | high | indirect | equivalent |  |  |
| NtSetContextThread | high | indirect | equivalent |  |  |
| NtSetValueKey | high | indirect | equivalent |  |  |
| NtUnmapViewOfSection | high | indirect | equivalent |  |  |
| NtWriteVirtualMemory | high | indirect | equivalent |  |  |
| OpenProcess | high | indirect | direct |  |  |
| QueueUserAPC | high | indirect | direct |  |  |
| ReadProcessMemory | high | indirect | direct |  |  |
| RegCreateKeyExW | high | indirect | direct |  |  |
| RegLoadKeyW | high | indirect | direct |  |  |
| RegRestoreKeyW | high | indirect | direct |  |  |
| RegSaveKeyW | high | indirect | direct |  |  |
| RegSetValueExW | high | indirect | direct |  |  |
| RtlCreateUserThread | high | indirect | generic |  |  |
| SetThreadContext | high | indirect | direct |  |  |
| URLDownloadToFile | high | indirect | direct |  |  |
| URLDownloadToFileA | high | indirect | direct |  |  |
| VirtualAllocEx | high | indirect | direct |  |  |
| VirtualProtectEx | high | indirect | direct |  |  |
| WinHttpSendRequest | high | indirect | direct |  |  |
| WriteProcessMemory | high | indirect | direct |  |  |
| WSAConnect | high | indirect | direct |  |  |
| ZwCreateThreadEx | high | indirect | equivalent |  |  |
| ZwLoadDriver | high | indirect | direct |  |  |
| ZwUnmapViewOfSection | high | indirect | direct |  |  |

## 3 — Medium suspicion, mapped telemetry (63)

| API | Suspicion | Telemetry | Docs | Generic note | Reviewed |
| --- | --- | --- | --- | --- | --- |
| AmsiScanString | medium | indirect | direct |  |  |
| CopyFileW | medium | indirect | direct |  |  |
| CreateFileA | medium | indirect | direct |  |  |
| CreateFileW | medium | indirect | direct |  |  |
| CreateProcessA | medium | indirect | direct |  |  |
| CreateProcessW | medium | indirect | direct |  |  |
| CreateProcessWithLogonW | medium | indirect | direct |  |  |
| CreateThread | medium | indirect | direct |  |  |
| DeleteFileW | medium | indirect | direct |  |  |
| FindFirstFileA | medium | indirect | direct |  |  |
| FindFirstFileW | medium | indirect | direct |  |  |
| FindNextFileW | medium | indirect | direct |  |  |
| FtpCreateDirectoryW | medium | indirect | direct |  |  |
| FtpDeleteFileW | medium | indirect | direct |  |  |
| FtpOpenFileW | medium | indirect | direct |  |  |
| getaddrinfo | medium | indirect | direct |  |  |
| GetThreadContext | medium | indirect | direct |  |  |
| InternetConnectW | medium | indirect | direct |  |  |
| LdrLoadDll | medium | indirect | equivalent |  |  |
| LoadLibraryA | medium | indirect | direct |  |  |
| LoadLibraryExW | medium | indirect | direct |  |  |
| LoadLibraryW | medium | indirect | direct |  |  |
| MoveFileExW | medium | indirect | direct |  |  |
| NetLocalGroupDelMembers | medium | indirect | direct |  |  |
| NtCreateFile | medium | indirect | direct |  |  |
| NtDeleteFile | medium | indirect | equivalent |  |  |
| NtDeleteKey | medium | indirect | equivalent |  |  |
| NtFreeVirtualMemory | medium | indirect | direct |  |  |
| NtGetContextThread | medium | indirect | equivalent |  |  |
| NtOpenFile | medium | indirect | direct |  |  |
| NtOpenKey | medium | indirect | equivalent |  |  |
| NtReadFile | medium | indirect | direct |  |  |
| NtResumeThread | medium | indirect | equivalent |  |  |
| NtSuspendThread | medium | indirect | equivalent |  |  |
| NtTerminateProcess | medium | indirect | equivalent |  |  |
| NtWriteFile | medium | indirect | direct |  |  |
| recv | medium | indirect | direct |  |  |
| recvfrom | medium | indirect | direct |  |  |
| RegDeleteKeyW | medium | indirect | direct |  |  |
| RegDeleteTreeW | medium | indirect | direct |  |  |
| RegDeleteValueW | medium | indirect | direct |  |  |
| RegOpenKeyExW | medium | indirect | direct |  |  |
| RegSetKeyValueW | medium | indirect | direct |  |  |
| ResumeThread | medium | indirect | direct |  |  |
| send | medium | indirect | direct |  |  |
| sendto | medium | indirect | direct |  |  |
| SetFileAttributesW | medium | indirect | direct |  |  |
| SetFileTime | medium | indirect | direct |  |  |
| ShellExecuteA | medium | indirect | direct |  |  |
| ShellExecuteExW | medium | indirect | direct |  |  |
| ShellExecuteW | medium | indirect | direct |  |  |
| SuspendThread | medium | indirect | direct |  |  |
| TerminateProcess | medium | indirect | direct |  |  |
| URLDownloadToCacheFileW | medium | indirect | direct |  |  |
| URLOpenBlockingStreamW | medium | indirect | direct |  |  |
| VirtualFreeEx | medium | indirect | direct |  |  |
| WinExec | medium | indirect | direct |  |  |
| WinHttpConnect | medium | indirect | direct |  |  |
| WriteFile | medium | indirect | direct |  |  |
| WSARecv | medium | indirect | direct |  |  |
| WSARecvFrom | medium | indirect | direct |  |  |
| WSASend | medium | indirect | direct |  |  |
| WSASendTo | medium | indirect | direct |  |  |

## 4 — Remaining entries (535)

| API | Suspicion | Telemetry | Docs | Generic note | Reviewed |
| --- | --- | --- | --- | --- | --- |
| AddVectoredExceptionHandler | medium | none | direct | yes |  |
| AmsiInitialize | medium | none | direct | yes |  |
| AmsiOpenSession | medium | none | direct | yes |  |
| AttachThreadInput | medium | none | direct | yes |  |
| BCryptExportKey | medium | none | direct | yes |  |
| BCryptGenerateKeyPair | medium | none | direct | yes |  |
| BCryptGenerateSymmetricKey | medium | none | direct | yes |  |
| BCryptGenRandom | medium | none | direct | yes |  |
| BCryptImportKey | medium | none | direct | yes |  |
| BCryptImportKeyPair | medium | none | direct | yes |  |
| BCryptOpenAlgorithmProvider | medium | none | direct | yes |  |
| bind | medium | none | direct | yes |  |
| ChangeServiceConfig2W | medium | none | direct | yes |  |
| ClipCursor | medium | none | direct | yes |  |
| CoCreateInstance | medium | none | direct | yes |  |
| CoCreateInstanceEx | medium | none | direct | yes |  |
| CoGetObject | medium | none | direct | yes |  |
| CoInitializeSecurity | medium | none | direct | yes |  |
| ControlService | medium | none | direct | yes |  |
| ControlServiceExW | medium | none | direct | yes |  |
| CoSetProxyBlanket | medium | none | direct | yes |  |
| CreateCompatibleBitmap | medium | none | direct | yes |  |
| CreateCompatibleDC | medium | none | direct | yes |  |
| CreateFileMappingW | medium | none | direct | yes |  |
| CreateMutexW | medium | none | direct | yes |  |
| CreatePipe | medium | none | direct | yes |  |
| CredDeleteW | medium | none | direct | yes |  |
| CredWriteW | medium | none | direct | yes |  |
| CryptAcquireContextW | medium | none | direct | yes |  |
| CryptDeriveKey | medium | none | direct | yes |  |
| CryptExportKey | medium | none | direct | yes |  |
| CryptGenKey | medium | none | direct | yes |  |
| CryptGenRandom | medium | none | direct | yes |  |
| DebugActiveProcess | medium | none | direct | yes |  |
| DebugActiveProcessStop | medium | none | direct | yes |  |
| DebugBreak | medium | none | direct | yes |  |
| DeviceIoControl | medium | none | direct | yes |  |
| DsEnumerateDomainTrustsW | medium | none | direct | yes |  |
| DsGetDcNameW | medium | none | direct | yes |  |
| DuplicateHandle | medium | none | direct | yes |  |
| EmptyClipboard | medium | none | direct | yes |  |
| EnumDesktopWindows | medium | none | direct | yes |  |
| EnumDeviceDrivers | medium | none | direct | yes |  |
| EnumProcessModules | medium | none | direct | yes |  |
| EnumProcessModulesEx | medium | none | direct | yes |  |
| EnumServicesStatusExW | medium | none | direct | yes |  |
| EnumWindows | medium | none | direct | yes |  |
| EtwNotificationRegister | medium | none | generic | yes |  |
| EventSetInformation | medium | none | direct | yes |  |
| FindWindowExW | medium | none | direct | yes |  |
| FindWindowW | medium | none | direct | yes |  |
| GetAdaptersAddresses | medium | none | direct | yes |  |
| GetAdaptersInfo | medium | none | direct | yes |  |
| GetClipboardData | medium | none | direct | yes |  |
| GetClipboardSequenceNumber | medium | none | direct | yes |  |
| GetDC | medium | none | direct | yes |  |
| GetDIBits | medium | none | direct | yes |  |
| GetExtendedTcpTable | medium | none | direct | yes |  |
| GetKeyboardState | medium | none | direct | yes |  |
| GetKeyState | medium | none | direct | yes |  |
| GetProcAddress | medium | none | direct | yes |  |
| GetSystemFirmwareTable | medium | none | direct | yes |  |
| GetTcpTable2 | medium | none | direct | yes |  |
| GetTempPathW | medium | none | direct | yes |  |
| GetWindowDC | medium | none | direct | yes |  |
| Heap32ListFirst | medium | none | direct | yes |  |
| Heap32ListNext | medium | none | direct | yes |  |
| HeapCreate | medium | none | direct | yes |  |
| HeapSetInformation | medium | none | direct | yes |  |
| HttpOpenRequestW | medium | none | direct | yes |  |
| IcmpCreateFile | medium | none | direct | yes |  |
| IcmpSendEcho | medium | none | direct | yes |  |
| InternetOpenA | medium | none | direct | yes |  |
| InternetOpenW | medium | none | direct | yes |  |
| InternetReadFileExW | medium | none | direct | yes |  |
| keybd_event | medium | none | direct | yes |  |
| LdrEnumerateLoadedModules | medium | none | equivalent | yes |  |
| LdrGetProcedureAddress | medium | none | equivalent | yes |  |
| LdrRegisterDllNotification | medium | none | direct | yes |  |
| LookupPrivilegeValueW | medium | none | direct | yes |  |
| LsaStorePrivateData | medium | none | direct | yes |  |
| MapViewOfFile | medium | none | direct | yes |  |
| MapViewOfFileEx | medium | none | direct | yes |  |
| Module32FirstW | medium | none | direct | yes |  |
| Module32NextW | medium | none | direct | yes |  |
| mouse_event | medium | none | direct | yes |  |
| NCryptCreatePersistedKey | medium | none | direct | yes |  |
| NCryptDeleteKey | medium | none | direct | yes |  |
| NCryptOpenKey | medium | none | direct | yes |  |
| NetConnectionEnum | medium | none | direct | yes |  |
| NetFileEnum | medium | none | direct | yes |  |
| NetLocalGroupEnum | medium | none | direct | yes |  |
| NetLocalGroupGetMembers | medium | none | direct | yes |  |
| NetMessageBufferSend | medium | none | direct | yes |  |
| NetServerEnum | medium | none | direct | yes |  |
| NetShareDel | medium | none | direct | yes |  |
| NetShareEnum | medium | none | direct | yes |  |
| NetUserGetInfo | medium | none | direct | yes |  |
| NetUserGetLocalGroups | medium | none | direct | yes |  |
| NtDelayExecution | medium | none | equivalent | yes |  |
| NtDuplicateObject | medium | none | equivalent | yes |  |
| NtOpenThread | medium | none | direct | yes |  |
| NtQueryDirectoryFile | medium | none | direct | yes |  |
| NtQueryInformationThread | medium | none | direct | yes |  |
| NtQueryObject | medium | none | direct | yes |  |
| NtQueryVirtualMemory | medium | none | direct | yes |  |
| NtTraceControl | medium | none | generic | yes |  |
| NtTraceEvent | medium | none | equivalent | yes |  |
| OpenClipboard | medium | none | direct | yes |  |
| OpenFileMappingW | medium | none | direct | yes |  |
| OpenInputDesktop | medium | none | direct | yes |  |
| OpenServiceW | medium | none | direct | yes |  |
| OpenThread | medium | none | direct | yes |  |
| OpenThreadToken | medium | none | direct | yes |  |
| OutputDebugStringA | medium | none | direct | yes |  |
| OutputDebugStringW | medium | none | direct | yes |  |
| PostThreadMessageW | medium | none | direct | yes |  |
| PrintWindow | medium | none | direct | yes |  |
| Process32FirstW | medium | none | direct | yes |  |
| Process32NextW | medium | none | direct | yes |  |
| RegConnectRegistryW | medium | none | direct | yes |  |
| RtlCreateProcessParametersEx | medium | none | generic | yes |  |
| RtlGetVersion | medium | none | direct | yes |  |
| select | medium | none | direct | yes |  |
| SendInput | medium | none | direct | yes |  |
| SetActiveWindow | medium | none | direct | yes |  |
| SetClipboardData | medium | none | direct | yes |  |
| SetCursorPos | medium | none | direct | yes |  |
| SetForegroundWindow | medium | none | direct | yes |  |
| SetHandleInformation | medium | none | direct | yes |  |
| SetProcessDEPPolicy | medium | none | direct | yes |  |
| SetProcessMitigationPolicy | medium | none | direct | yes |  |
| SetServiceObjectSecurity | medium | none | direct | yes |  |
| SetUnhandledExceptionFilter | medium | none | direct | yes |  |
| SetWindowLongPtrW | medium | none | direct | yes |  |
| SetWinEventHook | medium | none | direct | yes |  |
| SHFileOperationA | medium | none | direct | yes |  |
| SHFileOperationW | medium | none | direct | yes |  |
| ShowWindow | medium | none | direct | yes |  |
| socket | medium | none | direct | yes |  |
| StretchBlt | medium | none | direct | yes |  |
| SystemParametersInfoW | medium | none | direct | yes |  |
| Thread32First | medium | none | direct | yes |  |
| Thread32Next | medium | none | direct | yes |  |
| ToUnicodeEx | medium | none | direct | yes |  |
| UnmapViewOfFile | medium | none | direct | yes |  |
| UpdateProcThreadAttribute | medium | none | direct | yes |  |
| VirtualQuery | medium | none | direct | yes |  |
| VirtualQueryEx | medium | none | direct | yes |  |
| waveInAddBuffer | medium | none | direct | yes |  |
| WinHttpOpen | medium | none | direct | yes |  |
| WinHttpOpenRequest | medium | none | direct | yes |  |
| WinHttpReceiveResponse | medium | none | direct | yes |  |
| WinHttpSetCredentials | medium | none | direct | yes |  |
| WNetEnumResourceW | medium | none | direct | yes |  |
| WNetOpenEnumW | medium | none | direct | yes |  |
| Wow64DisableWow64FsRedirection | medium | none | direct | yes |  |
| WSAAsyncSelect | medium | none | direct | yes |  |
| WSADuplicateSocketW | medium | none | direct | yes |  |
| WSAEventSelect | medium | none | direct | yes |  |
| WSAIoctl | medium | none | direct | yes |  |
| WSAPoll | medium | none | direct | yes |  |
| WSASocketA | medium | none | direct | yes |  |
| WSASocketW | medium | none | direct | yes |  |
| WSAStartup | medium | none | direct | yes |  |
| WTSEnumerateProcessesW | medium | none | direct | yes |  |
| WTSEnumerateSessionsW | medium | none | direct | yes |  |
| AddVectoredContinueHandler | low | none | direct | yes |  |
| AllocateAndInitializeSid | low | none | direct | yes |  |
| AllocConsole | low | none | direct | yes |  |
| AmsiCloseSession | low | none | direct | yes |  |
| AmsiUninitialize | low | none | direct | yes |  |
| AttachConsole | low | none | direct | yes |  |
| BCryptCloseAlgorithmProvider | low | none | direct | yes |  |
| BCryptCreateHash | low | none | direct | yes |  |
| BCryptDecrypt | low | none | direct | yes |  |
| BCryptDeriveKey | low | none | direct | yes |  |
| BCryptDestroyHash | low | none | direct | yes |  |
| BCryptDestroyKey | low | none | direct | yes |  |
| BCryptFinishHash | low | none | direct | yes |  |
| BCryptGetProperty | low | none | direct | yes |  |
| BCryptHash | low | none | direct | yes |  |
| BCryptHashData | low | none | direct | yes |  |
| BCryptKeyDerivation | low | none | direct | yes |  |
| BCryptSetProperty | low | none | direct | yes |  |
| BCryptSignHash | low | none | direct | yes |  |
| BCryptVerifySignature | low | none | direct | yes |  |
| Beep | low | none | direct | yes |  |
| CallNextHookEx | low | none | direct | yes |  |
| CertCloseStore | low | none | direct | yes |  |
| CertEnumCertificatesInStore | low | none | direct | yes |  |
| CertFindCertificateInStore | low | none | direct | yes |  |
| CertFreeCertificateContext | low | none | direct | yes |  |
| CertGetCertificateContextProperty | low | none | direct | yes |  |
| CertOpenStore | low | none | direct | yes |  |
| CertOpenSystemStoreW | low | none | direct | yes |  |
| CheckTokenMembership | low | none | direct | yes |  |
| CloseClipboard | low | none | direct | yes |  |
| CloseHandle | low | none | direct | yes |  |
| closesocket | low | none | direct | yes |  |
| CLSIDFromProgID | low | none | direct | yes |  |
| CLSIDFromString | low | none | direct | yes |  |
| CoGetClassObject | low | none | direct | yes |  |
| CoInitialize | low | none | direct | yes |  |
| CoInitializeEx | low | none | direct | yes |  |
| CommandLineToArgvW | low | none | direct | yes |  |
| ContinueDebugEvent | low | none | direct | yes |  |
| CopyFileExW | low | indirect | direct |  |  |
| CoTaskMemAlloc | low | none | direct | yes |  |
| CoTaskMemFree | low | none | direct | yes |  |
| CoUninitialize | low | none | direct | yes |  |
| CreateDirectoryW | low | indirect | direct |  |  |
| CreateEventW | low | none | direct | yes |  |
| CreateFontW | low | none | direct | yes |  |
| CreateHardLinkW | low | none | direct | yes |  |
| CreateSemaphoreW | low | none | direct | yes |  |
| CreateTimerQueue | low | none | direct | yes |  |
| CreateTimerQueueTimer | low | none | direct | yes |  |
| CreateWellKnownSid | low | none | direct | yes |  |
| CreateWindowExW | low | none | direct | yes |  |
| CredFree | low | none | direct | yes |  |
| CryptBinaryToStringW | low | none | direct | yes |  |
| CryptCreateHash | low | none | direct | yes |  |
| CryptDecrypt | low | none | direct | yes |  |
| CryptDestroyHash | low | none | direct | yes |  |
| CryptDestroyKey | low | none | direct | yes |  |
| CryptEnumProvidersW | low | none | direct | yes |  |
| CryptGetHashParam | low | none | direct | yes |  |
| CryptGetKeyParam | low | none | direct | yes |  |
| CryptGetProvParam | low | none | direct | yes |  |
| CryptHashData | low | none | direct | yes |  |
| CryptMsgClose | low | none | direct | yes |  |
| CryptMsgOpenToEncode | low | none | direct | yes |  |
| CryptMsgUpdate | low | none | direct | yes |  |
| CryptProtectData | low | none | direct | yes |  |
| CryptQueryObject | low | none | direct | yes |  |
| CryptReleaseContext | low | none | direct | yes |  |
| CryptSetKeyParam | low | none | direct | yes |  |
| CryptSignHashW | low | none | direct | yes |  |
| CryptStringToBinaryW | low | none | direct | yes |  |
| CryptVerifySignatureW | low | none | direct | yes |  |
| DefWindowProcW | low | none | direct | yes |  |
| DeleteCriticalSection | low | none | direct | yes |  |
| DeleteDC | low | none | direct | yes |  |
| DeleteObject | low | none | direct | yes |  |
| DeleteProcThreadAttributeList | low | none | direct | yes |  |
| DestroyWindow | low | none | direct | yes |  |
| DispatchMessageW | low | none | direct | yes |  |
| DnsRecordListFree | low | none | direct | yes |  |
| EnterCriticalSection | low | none | direct | yes |  |
| EnumChildWindows | low | none | direct | yes |  |
| EnumClipboardFormats | low | none | direct | yes |  |
| EnumDependentServicesW | low | none | direct | yes |  |
| EnumDisplayMonitors | low | none | direct | yes |  |
| EnumPageFilesW | low | none | direct | yes |  |
| EnumSystemFirmwareTables | low | none | direct | yes |  |
| EnumThreadWindows | low | none | direct | yes |  |
| EtwEventRegister | low | none | related | yes |  |
| EtwEventUnregister | low | none | direct | yes |  |
| ExitProcess | low | indirect | direct |  |  |
| ExitThread | low | indirect | direct |  |  |
| ExpandEnvironmentStringsW | low | none | direct | yes |  |
| FindClose | low | none | direct | yes |  |
| FlushInstructionCache | low | none | direct | yes |  |
| FlushViewOfFile | low | none | direct | yes |  |
| freeaddrinfo | low | none | direct | yes |  |
| FreeConsole | low | none | direct | yes |  |
| FreeEnvironmentStringsW | low | none | direct | yes |  |
| FreeLibrary | low | none | direct | yes |  |
| FreeSid | low | none | direct | yes |  |
| GetACP | low | none | direct | yes |  |
| GetActiveWindow | low | none | direct | yes |  |
| GetClassNameW | low | none | direct | yes |  |
| GetClientRect | low | none | direct | yes |  |
| GetCommandLineW | low | none | direct | yes |  |
| GetComputerNameW | low | none | direct | yes |  |
| GetConsoleWindow | low | none | direct | yes |  |
| GetCurrentDirectoryW | low | none | direct | yes |  |
| GetCurrentProcess | low | none | direct | yes |  |
| GetCurrentProcessId | low | none | direct | yes |  |
| GetCurrentThread | low | none | direct | yes |  |
| GetCurrentThreadId | low | none | direct | yes |  |
| GetCursorPos | low | none | direct | yes |  |
| GetDesktopWindow | low | none | direct | yes |  |
| GetDeviceDriverBaseNameW | low | none | direct | yes |  |
| GetDiskFreeSpaceExW | low | none | direct | yes |  |
| GetDriveTypeW | low | none | direct | yes |  |
| GetEnvironmentStringsW | low | none | direct | yes |  |
| GetEnvironmentVariableW | low | none | direct | yes |  |
| GetExitCodeProcess | low | none | direct | yes |  |
| GetFileAttributesW | low | none | direct | yes |  |
| GetFileSizeEx | low | none | direct | yes |  |
| GetForegroundWindow | low | none | direct | yes |  |
| GetFullPathNameW | low | none | direct | yes |  |
| GetHandleInformation | low | none | direct | yes |  |
| gethostbyaddr | low | indirect | direct |  |  |
| GetIpAddrTable | low | none | direct | yes |  |
| GetKeyboardLayout | low | none | direct | yes |  |
| GetKeyboardLayoutList | low | none | direct | yes |  |
| GetLastError | low | none | direct | yes |  |
| GetLastInputInfo | low | none | direct | yes |  |
| GetLocaleInfoW | low | none | direct | yes |  |
| GetLocalTime | low | none | direct | yes |  |
| GetLogicalDrives | low | none | direct | yes |  |
| GetLogicalDriveStringsW | low | none | direct | yes |  |
| GetMessageW | low | none | direct | yes |  |
| GetModuleBaseNameW | low | none | direct | yes |  |
| GetModuleFileNameA | low | none | direct | yes |  |
| GetModuleFileNameExW | low | none | direct | yes |  |
| GetModuleFileNameW | low | none | direct | yes |  |
| GetModuleHandleExW | low | none | direct | yes |  |
| GetModuleHandleW | low | none | direct | yes |  |
| GetMonitorInfoW | low | none | direct | yes |  |
| getnameinfo | low | indirect | direct |  |  |
| GetNativeSystemInfo | low | none | direct | yes |  |
| GetOEMCP | low | none | direct | yes |  |
| getpeername | low | none | direct | yes |  |
| GetPerformanceInfo | low | none | direct | yes |  |
| GetPhysicallyInstalledSystemMemory | low | none | direct | yes |  |
| GetProcessHeap | low | none | direct | yes |  |
| GetProcessHeaps | low | none | direct | yes |  |
| GetProcessId | low | none | direct | yes |  |
| GetProcessImageFileNameW | low | none | direct | yes |  |
| GetProcessMemoryInfo | low | none | direct | yes |  |
| GetProcessTimes | low | none | direct | yes |  |
| GetServiceDisplayNameW | low | none | direct | yes |  |
| GetServiceKeyNameW | low | none | direct | yes |  |
| GetShellWindow | low | none | direct | yes |  |
| getsockname | low | none | direct | yes |  |
| getsockopt | low | none | direct | yes |  |
| GetStartupInfoW | low | none | direct | yes |  |
| GetStdHandle | low | none | direct | yes |  |
| GetSystemDirectoryW | low | none | direct | yes |  |
| GetSystemInfo | low | none | direct | yes |  |
| GetSystemMetrics | low | none | direct | yes |  |
| GetSystemTime | low | none | direct | yes |  |
| GetSystemTimeAsFileTime | low | none | direct | yes |  |
| GetSystemTimePreciseAsFileTime | low | none | direct | yes |  |
| GetTempFileNameW | low | indirect | direct |  |  |
| GetThreadDesktop | low | none | direct | yes |  |
| GetThreadId | low | none | direct | yes |  |
| GetTickCount | low | none | direct | yes |  |
| GetTickCount64 | low | none | direct | yes |  |
| GetTopWindow | low | none | direct | yes |  |
| GetUdpTable | low | none | direct | yes |  |
| GetUserDefaultUILanguage | low | none | direct | yes |  |
| GetUserNameW | low | none | direct | yes |  |
| GetVersionExW | low | none | direct | yes |  |
| GetVolumeInformationW | low | none | direct | yes |  |
| GetWindow | low | none | direct | yes |  |
| GetWindowLongPtrW | low | none | direct | yes |  |
| GetWindowRect | low | none | direct | yes |  |
| GetWindowsDirectoryW | low | none | direct | yes |  |
| GetWindowTextW | low | none | direct | yes |  |
| GetWindowThreadProcessId | low | none | direct | yes |  |
| GlobalAlloc | low | none | direct | yes |  |
| GlobalFree | low | none | direct | yes |  |
| GlobalLock | low | none | direct | yes |  |
| GlobalMemoryStatusEx | low | none | direct | yes |  |
| GlobalUnlock | low | none | direct | yes |  |
| HeapAlloc | low | none | direct | yes |  |
| HeapDestroy | low | none | direct | yes |  |
| HeapFree | low | none | direct | yes |  |
| HeapReAlloc | low | none | direct | yes |  |
| HeapValidate | low | none | direct | yes |  |
| HeapWalk | low | none | direct | yes |  |
| htonl | low | none | direct | yes |  |
| htons | low | none | direct | yes |  |
| HttpQueryInfoW | low | none | direct | yes |  |
| IcmpCloseHandle | low | none | direct | yes |  |
| inet_addr | low | none | direct | yes |  |
| inet_ntoa | low | none | direct | yes |  |
| inet_ntop | low | none | direct | yes |  |
| inet_pton | low | none | direct | yes |  |
| InitializeCriticalSection | low | none | direct | yes |  |
| InitializeProcThreadAttributeList | low | none | direct | yes |  |
| InternetCanonicalizeUrlW | low | none | direct | yes |  |
| InternetCloseHandle | low | none | direct | yes |  |
| InternetCrackUrlW | low | none | direct | yes |  |
| InternetGetConnectedState | low | none | direct | yes |  |
| InternetGetCookieW | low | none | direct | yes |  |
| InternetQueryOptionW | low | none | direct | yes |  |
| InternetSetCookieW | low | none | direct | yes |  |
| InternetSetOptionW | low | none | direct | yes |  |
| InternetSetStatusCallback | low | none | direct | yes |  |
| ioctlsocket | low | none | direct | yes |  |
| IsClipboardFormatAvailable | low | none | direct | yes |  |
| IsProcessorFeaturePresent | low | none | direct | yes |  |
| IsWindow | low | none | direct | yes |  |
| IsWindowVisible | low | none | direct | yes |  |
| IsWow64Process | low | none | direct | yes |  |
| IsWow64Process2 | low | none | direct | yes |  |
| KillTimer | low | none | direct | yes |  |
| LdrUnloadDll | low | none | equivalent | yes |  |
| LeaveCriticalSection | low | none | direct | yes |  |
| LocalAlloc | low | none | direct | yes |  |
| LocalFree | low | none | direct | yes |  |
| LookupAccountNameW | low | none | direct | yes |  |
| LookupAccountSidW | low | none | direct | yes |  |
| LsaClose | low | none | direct | yes |  |
| LsaFreeReturnBuffer | low | none | direct | yes |  |
| MapVirtualKeyW | low | none | direct | yes |  |
| MessageBeep | low | none | direct | yes |  |
| MessageBoxW | low | none | direct | yes |  |
| MoveWindow | low | none | direct | yes |  |
| NCryptDecrypt | low | none | direct | yes |  |
| NCryptEncrypt | low | none | direct | yes |  |
| NCryptEnumKeys | low | none | direct | yes |  |
| NCryptFreeObject | low | none | direct | yes |  |
| NCryptOpenStorageProvider | low | none | direct | yes |  |
| NCryptSignHash | low | none | direct | yes |  |
| NCryptVerifySignature | low | none | direct | yes |  |
| NetApiBufferFree | low | none | direct | yes |  |
| NetGetJoinInformation | low | none | direct | yes |  |
| NetServerGetInfo | low | none | direct | yes |  |
| NetShareGetInfo | low | none | direct | yes |  |
| NetUseDel | low | none | direct | yes |  |
| NetWkstaGetInfo | low | none | direct | yes |  |
| NtClose | low | none | direct | yes |  |
| ntohl | low | none | direct | yes |  |
| ntohs | low | none | direct | yes |  |
| NtQueryKey | low | indirect | equivalent |  |  |
| NtQueryValueKey | low | indirect | equivalent |  |  |
| ObtainUserAgentString | low | none | direct | yes |  |
| OleInitialize | low | none | direct | yes |  |
| OleUninitialize | low | none | direct | yes |  |
| OpenEventW | low | none | direct | yes |  |
| OpenMutexW | low | none | direct | yes |  |
| PathCombineW | low | none | direct | yes |  |
| PathFileExistsW | low | none | direct | yes |  |
| PathFindFileNameW | low | none | direct | yes |  |
| PathRemoveFileSpecW | low | none | direct | yes |  |
| PeekMessageW | low | none | direct | yes |  |
| PostMessageW | low | none | direct | yes |  |
| ProgIDFromCLSID | low | none | direct | yes |  |
| QueryFullProcessImageNameW | low | none | direct | yes |  |
| QueryPerformanceCounter | low | none | direct | yes |  |
| QueryPerformanceFrequency | low | none | direct | yes |  |
| QueryServiceConfig2W | low | none | direct | yes |  |
| QueryServiceConfigW | low | none | direct | yes |  |
| QueryServiceObjectSecurity | low | none | direct | yes |  |
| QueryServiceStatus | low | none | direct | yes |  |
| QueryServiceStatusEx | low | none | direct | yes |  |
| RaiseException | low | none | direct | yes |  |
| ReadFile | low | indirect | direct |  |  |
| RegCloseKey | low | none | direct | yes |  |
| RegEnumKeyExW | low | indirect | direct |  |  |
| RegEnumValueW | low | indirect | direct |  |  |
| RegGetValueW | low | indirect | direct |  |  |
| RegisterClassExW | low | none | direct | yes |  |
| RegisterClipboardFormatW | low | none | direct | yes |  |
| RegisterHotKey | low | none | direct | yes |  |
| RegisterServiceCtrlHandlerExW | low | none | direct | yes |  |
| RegisterServiceCtrlHandlerW | low | none | direct | yes |  |
| RegisterWindowMessageW | low | none | direct | yes |  |
| RegNotifyChangeKeyValue | low | none | direct | yes |  |
| RegQueryValueExW | low | indirect | direct |  |  |
| ReleaseDC | low | none | direct | yes |  |
| ReleaseMutex | low | none | direct | yes |  |
| ReleaseSemaphore | low | none | direct | yes |  |
| RemoveDirectoryW | low | indirect | direct |  |  |
| RemoveVectoredExceptionHandler | low | none | direct | yes |  |
| ResetEvent | low | none | direct | yes |  |
| RevertToSelf | low | none | direct | yes |  |
| RtlCopyMemory | low | none | direct | yes |  |
| RtlDestroyProcessParameters | low | none | generic | yes |  |
| RtlFillMemory | low | none | direct | yes |  |
| RtlImageDirectoryEntryToData | low | none | equivalent | yes |  |
| RtlImageNtHeader | low | none | generic | yes |  |
| RtlMoveMemory | low | none | direct | yes |  |
| RtlSecureZeroMemory | low | none | direct | yes |  |
| RtlZeroMemory | low | none | direct | yes |  |
| SelectObject | low | none | direct | yes |  |
| SendMessageW | low | none | direct | yes |  |
| SetConsoleTitleW | low | none | direct | yes |  |
| SetCurrentDirectoryW | low | none | direct | yes |  |
| SetEndOfFile | low | indirect | direct |  |  |
| SetEnvironmentVariableW | low | none | direct | yes |  |
| SetEvent | low | none | direct | yes |  |
| SetFilePointer | low | none | direct | yes |  |
| SetKeyboardState | low | none | direct | yes |  |
| SetLastError | low | none | direct | yes |  |
| SetServiceStatus | low | none | direct | yes |  |
| setsockopt | low | none | direct | yes |  |
| SetStdHandle | low | none | direct | yes |  |
| SetTimer | low | none | direct | yes |  |
| SetWindowPos | low | none | direct | yes |  |
| SHGetFolderPathW | low | none | direct | yes |  |
| SHGetKnownFolderPath | low | none | direct | yes |  |
| SHGetSpecialFolderPathW | low | none | direct | yes |  |
| shutdown | low | none | direct | yes |  |
| Sleep | low | none | direct | yes |  |
| SleepEx | low | none | direct | yes |  |
| StartServiceCtrlDispatcherW | low | none | direct | yes |  |
| StringFromCLSID | low | none | direct | yes |  |
| SwitchToThread | low | none | direct | yes |  |
| TranslateMessage | low | none | direct | yes |  |
| UnhookWindowsHookEx | low | none | direct | yes |  |
| UnhookWinEvent | low | none | direct | yes |  |
| UnregisterDeviceNotification | low | none | direct | yes |  |
| UnregisterHotKey | low | none | direct | yes |  |
| VirtualFree | low | none | direct | yes |  |
| VirtualLock | low | none | direct | yes |  |
| VirtualUnlock | low | none | direct | yes |  |
| VkKeyScanW | low | none | direct | yes |  |
| WaitForDebugEvent | low | none | direct | yes |  |
| WaitForMultipleObjects | low | none | direct | yes |  |
| WaitForSingleObject | low | none | direct | yes |  |
| WaitForSingleObjectEx | low | none | direct | yes |  |
| waveInClose | low | none | direct | yes |  |
| waveInPrepareHeader | low | none | direct | yes |  |
| WinHttpAddRequestHeaders | low | none | direct | yes |  |
| WinHttpCheckPlatform | low | none | direct | yes |  |
| WinHttpCloseHandle | low | none | direct | yes |  |
| WinHttpCrackUrl | low | none | direct | yes |  |
| WinHttpQueryDataAvailable | low | none | direct | yes |  |
| WinHttpQueryHeaders | low | none | direct | yes |  |
| WinHttpSetOption | low | none | direct | yes |  |
| WinHttpSetStatusCallback | low | none | direct | yes |  |
| WNetCancelConnection2W | low | none | direct | yes |  |
| WNetCloseEnum | low | none | direct | yes |  |
| WNetGetUniversalNameW | low | none | direct | yes |  |
| Wow64RevertWow64FsRedirection | low | none | direct | yes |  |
| WriteConsoleW | low | none | direct | yes |  |
| WSAAddressToStringW | low | none | direct | yes |  |
| WSACleanup | low | none | direct | yes |  |
| WSACloseEvent | low | none | direct | yes |  |
| WSACreateEvent | low | none | direct | yes |  |
| WSAEnumNetworkEvents | low | none | direct | yes |  |
| WSAGetLastError | low | none | direct | yes |  |
| WSAResetEvent | low | none | direct | yes |  |
| WSASetEvent | low | none | direct | yes |  |
| WSASetLastError | low | none | direct | yes |  |
| WSAStringToAddressW | low | none | direct | yes |  |
| WSAWaitForMultipleEvents | low | none | direct | yes |  |

