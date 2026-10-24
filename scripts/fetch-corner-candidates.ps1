param([string]$Proxy='http://127.0.0.1:7890')
$phase2Root=Split-Path -Parent $PSScriptRoot
$phase2CandidateRoot=Join-Path $phase2Root 'research/corner-candidates'
New-Item -ItemType Directory -Force $phase2CandidateRoot | Out-Null
$phase2Sessions=Get-Content -LiteralPath (Join-Path $phase2Root 'research/sessions-2026.json') -Raw | ConvertFrom-Json
$phase2Sessions | Where-Object {-not $_.is_cancelled} | ForEach-Object -ThrottleLimit 3 -Parallel {
 $key=[int]$_.circuit_key
 $target=Join-Path $using:phase2CandidateRoot "$key.json"
 try {
  if(-not (Test-Path -LiteralPath $target)){Invoke-WebRequest "https://api.multiviewer.app/api/v1/circuits/$key/2026" -Proxy $using:Proxy -UserAgent 'FastF1/3.6.1' -TimeoutSec 25 -OutFile $target}
  $candidate=Get-Content -LiteralPath $target -Raw | ConvertFrom-Json
  if($candidate.x.Count -lt 4){throw 'No usable track samples'}
  [pscustomobject]@{key=$key;name=$candidate.circuitName;year=$candidate.year;corners=$candidate.corners.Count;samples=$candidate.x.Count}
 } catch {[pscustomobject]@{key=$key;error=$_.Exception.Message}}
} | Sort-Object key | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $phase2CandidateRoot 'summary.json')
# Returned year can be historical. This only gathers candidates, never marks validation passed.
