$ErrorActionPreference = 'Stop'

$projectRef = if ($env:SUPABASE_PROJECT_REF) { $env:SUPABASE_PROJECT_REF } else { 'yaauwnvcjjetdybeixfr' }

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "Logging in to Supabase..."
  & npx --yes supabase@latest login
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Linking to Supabase project $projectRef..."
& npx --yes supabase@latest link --project-ref $projectRef
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Pushing database migrations..."
& npx --yes supabase@latest db push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Deploying Edge Functions..."
& npx --yes supabase@latest functions deploy rejoin-game submit-move save-daily-puzzle register-user cron-save-daily-puzzle
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Supabase setup complete."
