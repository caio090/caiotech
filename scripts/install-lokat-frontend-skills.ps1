[CmdletBinding()]
param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$sources = @(
  "https://github.com/greensock/gsap-skills",
  "https://github.com/CloudAI-X/threejs-skills"
)
$agents = @("codex", "claude-code")

function Invoke-SkillsInstall {
  param(
    [Parameter(Mandatory)] [string]$Source,
    [Parameter(Mandatory)] [string]$Agent
  )

  $arguments = @(
    "--yes", "skills", "add", $Source,
    "--agent", $Agent,
    "--skill", "*",
    "--copy",
    "--yes"
  )

  if ($DryRun) {
    Write-Host "DRY RUN: npx $($arguments -join ' ')"
    return
  }

  Write-Host "Installing audited frontend skills for $Agent from $Source"
  & npx @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Skills installation failed for $Agent from $Source (exit $LASTEXITCODE)."
  }
}

foreach ($agent in $agents) {
  foreach ($source in $sources) {
    Invoke-SkillsInstall -Source $source -Agent $agent
  }
}

Write-Host "Project-scoped frontend skills setup completed. Restart the agents before use."
