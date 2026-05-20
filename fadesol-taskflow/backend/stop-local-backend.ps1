$ErrorActionPreference = "SilentlyContinue"

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidDir = Join-Path $BackendDir ".local\pids"

foreach ($Port in @(8000, 8001, 8010, 8011, 8020, 8021)) {
    Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object {
            if ($_ -and $_ -ne 0) {
                Stop-Process -Id $_ -Force
                Write-Host "Stopped process on port $Port."
            }
        }
}

if (-not (Test-Path $PidDir)) {
    Write-Host "No local backend PID directory found."
    exit 0
}

Get-ChildItem $PidDir -Filter "*.pid" | ForEach-Object {
    $ServiceName = $_.BaseName
    $SavedPid = Get-Content $_.FullName

    if ($SavedPid) {
        $Process = Get-Process -Id ([int] $SavedPid)

        if ($Process) {
            Stop-Process -Id $Process.Id -Force
            Write-Host "$ServiceName stopped."
        }
    }

    Remove-Item $_.FullName -Force
}
