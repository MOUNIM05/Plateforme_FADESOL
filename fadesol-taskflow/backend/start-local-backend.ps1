$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LocalDir = Join-Path $BackendDir ".local"
$LogDir = Join-Path $LocalDir "logs"
$PidDir = Join-Path $LocalDir "pids"

New-Item -ItemType Directory -Force -Path $LocalDir, $LogDir, $PidDir | Out-Null

$AuthServiceDir = Join-Path $BackendDir "services\auth_service"
$GatewayServiceDir = Join-Path $BackendDir "services\api_gateway"
$FrontendEnvFile = Join-Path (Split-Path -Parent $BackendDir) "frontend\.env.local"
$PythonPath = $BackendDir.Replace("\", "\\")
$SqlitePath = (Join-Path $LocalDir "auth_local.db").Replace("\", "/")
$AuthDatabaseUrl = "sqlite:///$SqlitePath"

function Stop-ExistingLocalProcess {
    param(
        [string] $Name
    )

    $PidFile = Join-Path $PidDir "$Name.pid"

    if (Test-Path $PidFile) {
        $SavedPid = Get-Content $PidFile -ErrorAction SilentlyContinue

        if ($SavedPid) {
            $Process = Get-Process -Id ([int] $SavedPid) -ErrorAction SilentlyContinue

            if ($Process) {
                Stop-Process -Id $Process.Id -Force
            }
        }

        Remove-Item $PidFile -Force
    }
}

function Stop-PortProcess {
    param(
        [int] $Port
    )

    Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object {
            if ($_ -and $_ -ne 0) {
                Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
            }
        }
}

function Test-PortAvailable {
    param(
        [int] $Port
    )

    try {
        $Address = [System.Net.IPAddress]::Parse("127.0.0.1")
        $Listener = [System.Net.Sockets.TcpListener]::new($Address, $Port)
        $Listener.Start()
        $Listener.Stop()
        return $true
    }
    catch {
        return $false
    }
}

function Get-AvailablePort {
    param(
        [int[]] $Ports,
        [string] $Name
    )

    foreach ($Port in $Ports) {
        if (Test-PortAvailable -Port $Port) {
            return $Port
        }
    }

    throw "No available $Name port found. Tried: $($Ports -join ', ')."
}

function Start-LocalService {
    param(
        [string] $Name,
        [string] $WorkingDirectory,
        [int] $Port,
        [string[]] $EnvironmentLines
    )

    Stop-ExistingLocalProcess -Name $Name
    Stop-PortProcess -Port $Port

    $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $LogFile = Join-Path $LogDir "$Name-$Timestamp.log"
    $PidFile = Join-Path $PidDir "$Name.pid"
    $CommandLines = @(
        "`$env:PYTHONPATH = '$BackendDir'"
        "`$env:SECRET_KEY = 'local_dev_secret_key_change_me_32_chars'"
        "`$env:JWT_SECRET_KEY = 'local_dev_secret_key_change_me_32_chars'"
        "`$env:ALGORITHM = 'HS256'"
        "`$env:JWT_ALGORITHM = 'HS256'"
        "`$env:ACCESS_TOKEN_EXPIRE_MINUTES = '120'"
    ) + $EnvironmentLines + @(
        "Set-Location '$WorkingDirectory'"
        "uvicorn app.main:app --host 127.0.0.1 --port $Port *> '$LogFile'"
    )

    $Command = $CommandLines -join "; "
    $Process = Start-Process -FilePath "powershell.exe" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $Command) `
        -WindowStyle Hidden `
        -PassThru

    Set-Content -Path $PidFile -Value $Process.Id
    Write-Host "$Name started on port $Port. Logs: $LogFile"
}

function Wait-ForHealth {
    param(
        [string] $Name,
        [string] $Url
    )

    for ($Attempt = 1; $Attempt -le 30; $Attempt++) {
        try {
            Invoke-RestMethod -Uri $Url -TimeoutSec 2 | Out-Null
            Write-Host "$Name is ready: $Url"
            return
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }

    throw "$Name did not answer at $Url. Check logs in $LogDir."
}

$AuthPort = Get-AvailablePort -Name "Auth service" -Ports @(8001, 8011, 8021)
$GatewayPort = Get-AvailablePort -Name "API Gateway" -Ports @(8000, 8010, 8020)

if ($GatewayPort -ne 8000) {
    Write-Host "Port 8000 is busy on Windows. API Gateway will use port $GatewayPort."
}

if ($AuthPort -ne 8001) {
    Write-Host "Port 8001 is busy on Windows. Auth service will use port $AuthPort."
}

Set-Content -Path $FrontendEnvFile -Value "VITE_API_BASE_URL=http://127.0.0.1:$GatewayPort"

Start-LocalService `
    -Name "auth_service" `
    -WorkingDirectory $AuthServiceDir `
    -Port $AuthPort `
    -EnvironmentLines @(
        "`$env:DATABASE_URL = '$AuthDatabaseUrl'"
        "`$env:AUTH_DATABASE_URL = '$AuthDatabaseUrl'"
    )

Start-LocalService `
    -Name "api_gateway" `
    -WorkingDirectory $GatewayServiceDir `
    -Port $GatewayPort `
    -EnvironmentLines @(
        "`$env:AUTH_SERVICE_URL = 'http://127.0.0.1:$AuthPort'"
        "`$env:USER_SERVICE_URL = 'http://127.0.0.1:8002'"
        "`$env:SERVICE_FADESOL_URL = 'http://127.0.0.1:8003'"
        "`$env:PROJECT_SERVICE_URL = 'http://127.0.0.1:8004'"
        "`$env:TASK_SERVICE_URL = 'http://127.0.0.1:8005'"
        "`$env:MESSAGE_SERVICE_URL = 'http://127.0.0.1:8006'"
        "`$env:CLICKUP_SERVICE_URL = 'http://127.0.0.1:8007'"
        "`$env:DASHBOARD_SERVICE_URL = 'http://127.0.0.1:8008'"
    )

Wait-ForHealth -Name "Auth service" -Url "http://127.0.0.1:$AuthPort/health"
Wait-ForHealth -Name "API Gateway" -Url "http://127.0.0.1:$GatewayPort/health"

$SeedPayload = @{
    email = "admin@fadesol.com"
    password = "admin12345"
    role = "Admin"
    is_enabled = $true
} | ConvertTo-Json

try {
    Invoke-RestMethod `
        -Uri "http://127.0.0.1:$GatewayPort/api/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $SeedPayload | Out-Null

    Write-Host "Local test account created: admin@fadesol.com / admin12345"
}
catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__

    if ($StatusCode -eq 400) {
        Write-Host "Local test account already exists: admin@fadesol.com / admin12345"
    }
    else {
        Write-Host "Could not create the local test account. You can still use /api/auth/register."
    }
}

Write-Host ""
Write-Host "Backend local is running without Docker:"
Write-Host "- API Gateway: http://127.0.0.1:$GatewayPort/health"
Write-Host "- Auth service: http://127.0.0.1:$AuthPort/health"
Write-Host "- Frontend env: $FrontendEnvFile"
Write-Host ""
Write-Host "To stop it, run: .\stop-local-backend.ps1"
