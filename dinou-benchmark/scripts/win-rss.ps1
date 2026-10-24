param([int]$ParentPid)
$all = Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,WorkingSetSize
$pids = [System.Collections.Generic.HashSet[int]]::new()
[void]$pids.Add($ParentPid)
$added = $true
while ($added) {
  $added = $false
  foreach ($p in $all) {
    if ($pids.Contains([int]$p.ParentProcessId) -and -not $pids.Contains([int]$p.ProcessId)) {
      [void]$pids.Add([int]$p.ProcessId)
      $added = $true
    }
  }
}
$sum = 0
foreach ($p in $all) {
  if ($pids.Contains([int]$p.ProcessId)) {
    $sum += [int64]$p.WorkingSetSize
  }
}
Write-Output $sum
