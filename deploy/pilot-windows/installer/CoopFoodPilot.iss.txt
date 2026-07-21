#define AppName "CoopFood Pilot"
#define AppVersion "0.1.0"
#define RuntimeSource "..\..\..\out\pilot-windows\runtime"
#define ControlCenterSource "..\..\..\pilot-control-center\bin\Release\net8.0-windows\win-x64\publish"

[Setup]
AppId={{D0C74F26-098C-4E1F-B2A2-3DA1157ECA34}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={autopf}\CoopFood Pilot
DefaultGroupName={#AppName}
OutputDir=..\..\..\out\pilot-windows\installer
OutputBaseFilename=CoopFoodPilotSetup
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
Compression=lzma2
SolidCompression=yes

[Files]
Source: "{#RuntimeSource}\*"; DestDir: "{app}\runtime"; Flags: recursesubdirs ignoreversion
Source: "{#ControlCenterSource}\*"; DestDir: "{app}\control-center"; Flags: recursesubdirs ignoreversion
Source: "..\runtime-config.example.json"; DestDir: "{commonappdata}\CoopFoodPilot"; DestName: "runtime.json.example"; Flags: onlyifdoesntexist

[Icons]
Name: "{group}\Pilot Control Center"; Filename: "{app}\control-center\CoopFoodPilot.ControlCenter.exe"
Name: "{autodesktop}\Pilot Control Center"; Filename: "{app}\control-center\CoopFoodPilot.ControlCenter.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Tạo shortcut Desktop"; GroupDescription: "Shortcut:"; Flags: unchecked

[Run]
Filename: "{sys}\icacls.exe"; Parameters: """{commonappdata}\CoopFoodPilot"" /inheritance:r /grant:r *S-1-5-18:(OI)(CI)F *S-1-5-32-544:(OI)(CI)F"; StatusMsg: "Bảo vệ cấu hình cụm..."; Flags: runhidden waituntilterminated
Filename: "{app}\runtime\service\CoopFoodPilotService.exe"; Parameters: "install"; StatusMsg: "Đăng ký CoopFoodPilotService..."; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "{app}\runtime\service\CoopFoodPilotService.exe"; Parameters: "stop"; Flags: runhidden waituntilterminated
Filename: "{app}\runtime\service\CoopFoodPilotService.exe"; Parameters: "uninstall"; Flags: runhidden waituntilterminated
