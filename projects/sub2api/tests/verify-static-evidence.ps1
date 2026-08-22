param(
    [Parameter(Mandatory = $true)]
    [string]$UpstreamPath
)

$ErrorActionPreference = "Stop"
$expectedCommit = "67380eafd5ae2eaa8db910ae738199c3dac62e37"
$resolvedUpstream = (Resolve-Path -LiteralPath $UpstreamPath).Path

function Assert-FileContains {
    param(
        [Parameter(Mandatory = $true)][string]$RelativePath,
        [Parameter(Mandatory = $true)][string]$Pattern,
        [Parameter(Mandatory = $true)][string]$EvidenceId
    )

    $target = Join-Path $resolvedUpstream $RelativePath
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
        throw "[$EvidenceId] missing file: $RelativePath"
    }
    if (-not (Select-String -LiteralPath $target -Pattern $Pattern -Quiet)) {
        throw "[$EvidenceId] pattern not found in ${RelativePath}: $Pattern"
    }
    Write-Output "PASS $EvidenceId $RelativePath"
}

$safeDirectory = $resolvedUpstream.Replace("\", "/")
$actualCommit = (& git -c "safe.directory=$safeDirectory" -C $resolvedUpstream rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Unable to read upstream git commit"
}
if ($actualCommit -ne $expectedCommit) {
    throw "Commit mismatch: expected $expectedCommit, got $actualCommit"
}
Write-Output "PASS E01 commit=$actualCommit"

Assert-FileContains "backend/internal/domain/constants.go" 'PlatformComposite\s*=\s*"composite"' "E02"
Assert-FileContains "backend/internal/domain/constants.go" 'PlatformDeepseek\s*=\s*"deepseek"' "E02"
Assert-FileContains "backend/internal/domain/constants.go" 'AccountTypeBedrock\s*=\s*"bedrock"' "E03"
Assert-FileContains "backend/internal/domain/constants.go" 'AccountTypeServiceAccount\s*=\s*"service_account"' "E03"
Assert-FileContains "backend/internal/server/routes/gateway.go" 'gateway\.POST\("/messages"' "E04"
Assert-FileContains "backend/internal/server/routes/gateway.go" 'gateway\.POST\("/responses"' "E04"
Assert-FileContains "backend/internal/server/routes/gateway.go" 'gemini\.POST\("/models/\*modelAction"' "E04"
Assert-FileContains "backend/internal/server/routes/gateway.go" 'codexDirect\.POST\("/responses"' "E04"
Assert-FileContains "backend/internal/service/gateway_service.go" 'func \(s \*GatewayService\) GenerateSessionHash' "E06"
Assert-FileContains "backend/internal/service/gateway_service.go" 'source", "cacheable_content"' "E06"
Assert-FileContains "backend/internal/config/config.go" 'scheduler_score_weights\.ttft", 0\.5' "E07"
Assert-FileContains "backend/internal/service/usage_billing.go" 'UsageBillingMonetaryScale = 8' "E09"
Assert-FileContains "backend/ent/schema/account.go" 'field\.JSON\("credentials"' "E10"
Assert-FileContains "backend/internal/payment/crypto.go" 'payment provider configs are now stored as plaintext JSON' "E11"
Assert-FileContains "backend/internal/config/config.go" 'security\.url_allowlist\.enabled", false' "E12"
Assert-FileContains "backend/internal/config/config.go" 'security\.url_allowlist\.allow_private_hosts", true' "E12"
Assert-FileContains "backend/internal/config/config.go" 'security\.url_allowlist\.allow_insecure_http", true' "E12"
Assert-FileContains ".github/workflows/backend-ci.yml" 'make test-integration' "E13"
Assert-FileContains ".github/workflows/security-scan.yml" 'govulncheck ./\.\.\.' "E13"

Write-Output "Static evidence verification complete. Runtime behavior is not covered."
