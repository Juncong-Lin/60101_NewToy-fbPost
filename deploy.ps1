<#
.SYNOPSIS
    Deploy www.qili.ltd to GitHub Pages with clean history.
    
.DESCRIPTION
    This script squashes all local commits into a single commit before pushing
    to GitHub, ensuring no commit history or commit messages are exposed on the
    remote repository. The website at www.qili.ltd continues to work normally.

.USAGE
    .\deploy.ps1
    .\deploy.ps1 -Message "Custom deploy message"
#>

param(
    [string]$Message = "Deploy www.qili.ltd"
)

# Ensure we're in the right directory
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $repoRoot

# Helper: run git commands without PowerShell treating stderr as errors
function Invoke-Git {
    param([string[]]$Arguments)
    $output = & git @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    # Filter out stderr lines that are just informational (not real errors)
    $errors = $output | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] }
    $stdout = $output | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }
    return @{ Output = $stdout; ExitCode = $exitCode }
}

try {
    # Check for uncommitted changes
    $status = (Invoke-Git -Arguments 'status','--porcelain').Output
    if ($status) {
        Write-Host "Staging all changes..." -ForegroundColor Yellow
        Invoke-Git -Arguments 'add','-A' | Out-Null
        Invoke-Git -Arguments 'commit','-m','pending changes' | Out-Null
    }

    # Get current branch
    $currentBranch = (Invoke-Git -Arguments 'rev-parse','--abbrev-ref','HEAD').Output
    if ($currentBranch -ne "main") {
        Write-Host "ERROR: Not on 'main' branch. Current branch: $currentBranch" -ForegroundColor Red
        exit 1
    }

    Write-Host "Creating clean deploy commit..." -ForegroundColor Cyan

    # Create orphan branch (no history), then stage and commit
    Invoke-Git -Arguments 'checkout','--orphan','deploy-temp' | Out-Null
    Invoke-Git -Arguments 'add','-A' | Out-Null
    $commitResult = Invoke-Git -Arguments 'commit','-m',$Message
    if ($commitResult.ExitCode -ne 0) {
        Write-Host "ERROR: Failed to create commit" -ForegroundColor Red
        exit 1
    }

    # Replace main with the clean branch
    Invoke-Git -Arguments 'branch','-D','main' | Out-Null
    Invoke-Git -Arguments 'branch','-m','main' | Out-Null

    # Force push to GitHub (replaces all remote history)
    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    $pushResult = Invoke-Git -Arguments 'push','--force','origin','main'
    if ($pushResult.ExitCode -ne 0) {
        Write-Host "ERROR: Push failed" -ForegroundColor Red
        Write-Host ($pushResult.Output -join "`n") -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Deployed successfully!" -ForegroundColor Green
    Write-Host "  - Only 1 commit on GitHub (no history exposed)" -ForegroundColor Green
    Write-Host "  - www.qili.ltd will update shortly" -ForegroundColor Green

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    # Try to recover to main branch
    $branches = (Invoke-Git -Arguments 'branch','--list').Output
    if ($branches -match "main") {
        Invoke-Git -Arguments 'checkout','main' | Out-Null
    }
    exit 1
} finally {
    Pop-Location
}
