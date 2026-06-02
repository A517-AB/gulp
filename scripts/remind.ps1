param(
    [Parameter(Mandatory, Position=0)][string]$Title,
    [Parameter(Position=1)][string]$Body = '',
    [Parameter()][string]$At = ''
)

$icon = "$PSScriptRoot\..\public\icon.png"

function Send-Toast {
    if ($Body) {
        New-BurntToastNotification -Text $Title, $Body -AppLogo $icon -Sound 'Default'
    } else {
        New-BurntToastNotification -Text $Title -AppLogo $icon -Sound 'Default'
    }
}

if ($At) {
    # Schedule via Task Scheduler — fires once at the given time
    $action = New-ScheduledTaskAction -Execute 'pwsh' -Argument "-NonInteractive -Command `"Import-Module BurntToast; `$icon='$icon'; New-BurntToastNotification -Text '$Title', '$Body' -AppLogo `$icon -Sound Default`""
    $trigger = New-ScheduledTaskTrigger -Once -At $At
    $settings = New-ScheduledTaskSettingsSet -DeleteExpiredTaskAfter 00:01:00
    $taskName = "remind_$(Get-Date -Format 'yyyyMMddHHmmss')"
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
    Write-Host "Scheduled: '$Title' at $At (task: $taskName)"
} else {
    Send-Toast
}
