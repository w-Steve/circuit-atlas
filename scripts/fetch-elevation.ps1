$ErrorActionPreference = 'Stop'
$requests = Get-Content research/elevation-requests.json -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force research/elevation | Out-Null
foreach ($request in $requests) {
  $destination = "research/elevation/$($request.id)-$($request.part).json"
  if (Test-Path -LiteralPath $destination) {
    try { $cachedElevation = Get-Content -LiteralPath $destination -Raw | ConvertFrom-Json; if ($cachedElevation.status -eq 'OK' -and $cachedElevation.results.Count -gt 0) { continue } } catch { }
  }
  for ($attempt = 0; $attempt -lt 4; $attempt++) {
    try {
      Invoke-WebRequest -Uri $request.url -Proxy 'http://127.0.0.1:7890' -OutFile $destination -TimeoutSec 45
      $responseElevation = Get-Content -LiteralPath $destination -Raw | ConvertFrom-Json
      if ($responseElevation.status -ne 'OK') { throw 'Elevation service returned an invalid response' }
      break
    } catch {
      if ($attempt -eq 3) { throw }
      Start-Sleep -Seconds ($attempt + 1)
    }
  }
  Write-Output "$($request.id) part $($request.part)"
  Start-Sleep -Milliseconds 1100
}
