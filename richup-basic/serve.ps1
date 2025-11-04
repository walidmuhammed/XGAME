param(
    [int]$Port = 8000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptRoot = if ($PSScriptRoot) {
    $PSScriptRoot
} elseif ($PSCommandPath) {
    Split-Path -Path $PSCommandPath -Parent
} else {
    (Get-Location).ProviderPath
}

Set-Location -LiteralPath $scriptRoot
$rootPath = ([System.IO.Path]::GetFullPath((Get-Location).ProviderPath))

function Get-ContentType {
    param([string]$Path)
    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { "text/html; charset=utf-8" }
        ".htm"  { "text/html; charset=utf-8" }
        ".js"   { "text/javascript; charset=utf-8" }
        ".mjs"  { "text/javascript; charset=utf-8" }
        ".css"  { "text/css; charset=utf-8" }
        ".json" { "application/json; charset=utf-8" }
        ".svg"  { "image/svg+xml" }
        ".png"  { "image/png" }
        ".jpg"  { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        ".gif"  { "image/gif" }
        ".ico"  { "image/x-icon" }
        default { "application/octet-stream" }
    }
}

function Resolve-RequestedPath {
    param([string]$RequestPath)

    $cleanPath = $RequestPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    if ([string]::IsNullOrWhiteSpace($cleanPath)) {
        $cleanPath = "index.html"
    }

    $candidate = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($rootPath, $cleanPath))

    if (-not $candidate.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
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
    $listener = [System.Net.HttpListener]::new()
    $prefix = "http://127.0.0.1:$Port/"
    $listener.Prefixes.Add($prefix)
    $listener.Start()

    Write-Host "Richup static server running" -ForegroundColor Green
    Write-Host "Serving: $rootPath"
    Write-Host "Open:    $prefix"
    Write-Host "Press Ctrl+C to stop.`n"

    while ($true) {
        $context = $listener.GetContext()
        $requestPath = $context.Request.Url.LocalPath
        $response = $context.Response

        try {
            $resolvedPath = Resolve-RequestedPath -RequestPath $requestPath

            if (-not $resolvedPath) {
                $response.StatusCode = 404
                $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                continue
            }

            $fileBytes = [System.IO.File]::ReadAllBytes($resolvedPath)
            $response.ContentType = Get-ContentType -Path $resolvedPath
            $response.ContentLength64 = $fileBytes.Length
            $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
        }
        catch {
            $response.StatusCode = 500
            $errorBytes = [System.Text.Encoding]::UTF8.GetBytes("500 Internal Server Error")
            $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
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
    Write-Error "Failed to start server on port $Port. Try another port or run PowerShell as administrator.`n$($_.Exception.Message)"
}
