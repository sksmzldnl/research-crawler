#define MyAppName "ZeroWasteListener"
[Setup]
AppId={{921E3FE0-EC74-4A68-A20C-56B75711F831}
AppName={#MyAppName}
AppVersion=0.1.0
DefaultDirName={localappdata}\Programs\{#MyAppName}
DefaultGroupName={#MyAppName}
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=ZeroWasteListener-0.1.0-Windows-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\ZeroWasteListener.exe
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
Source: "..\dist\ZeroWasteListener\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\ZeroWasteListener.exe"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\ZeroWasteListener.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: unchecked

[Run]
Filename: "{app}\ZeroWasteListener.exe"; Description: "Launch ZeroWasteListener"; Flags: nowait postinstall skipifsilent
