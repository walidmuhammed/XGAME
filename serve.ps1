param(
    [int]$Port = 8000
)

Set-Location -LiteralPath $PSScriptRoot
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$RootPath = (Get-Location).ProviderPath

function Get-ContentType {
    param([string]$Path)
    $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
    switch ($ext) {
        ".html" { return "text/html; charset=utf-8" }
        ".htm"  { return "text/html; charset=utf-8" }
        ".js"   { return "text/javascript; charset=utf-8" }
        ".mjs"  { return "text/javascript; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".svg"  { return "image/svg+xml" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".gif"  { return "image/gif" }
        ".ico"  { return "image/x-icon" }
        ".mp3"  { return "audio/mpeg" }
        ".wav"  { return "audio/wav" }
        ".mp4"  { return "video/mp4" }
        default { return "application/octet-stream" }
    }
}

function Resolve-RequestedPath {
    param([string]$RequestPath)

    $cleanPath = $RequestPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    if ([string]::IsNullOrWhiteSpace($cleanPath)) {
        $cleanPath = "index.html"
    }

    $candidate = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($RootPath, $cleanPath))

    if (-not $candidate.StartsWith($RootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $null
    }

    if (Test-Path -LiteralPath $candidate -PathType Container) {
        $candidate = [System.IO.Path]::Combine($candidate, "index.html")
    }

    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        return $null
    }

    return $candidate
}

try {
    $prefix = "http://127.0.0.1:$Port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($prefix)
    $listener.Start()

    Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
        if ($listener -and $listener.IsListening) {            
            $listener.Stop()
            $listener.Close()
        }
    } | Out-Null

    Write-Host "Richup static server running" -ForegroundColor Green
    Write-Host "Serving: $RootPath"
    Write-Host "Open:    $prefix"
    Write-Host "Press Ctrl+C to stop.`n"

    while ($true) {
        $context = $listener.GetContext() # Blocks until a request arrives
        $request = $context.Request
        $response = $context.Response

        try {
            $resolvedPath = Resolve-RequestedPath -RequestPath $request.Url.LocalPath

            if (-not $resolvedPath) {
                $response.StatusCode = 404
                $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.OutputStream.Write($body, 0, $body.Length)
                continue
            }

            $bytes = [System.IO.File]::ReadAllBytes($resolvedPath)
            $response.ContentType = Get-ContentType -Path $resolvedPath
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        catch {
            $response.StatusCode = 500
            $body = [System.Text.Encoding]::UTF8.GetBytes("500 Internal Server Error")
            $response.OutputStream.Write($body, 0, $body.Length)
        }
        finally {
            if ($response.OutputStream) {
                $response.OutputStream.Close()
            }
            $response.Close()
        }
    }
}
catch {
    Write-Error "Failed to start server on port $Port. Try another port or run as administrator.`n$($_.Exception.Message)"
}
finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
        $listener.Close()
    }
}
