# create_backlog.ps1
# Bulk-creates labels and the 34 backlog issues from SPRINT_PLAN.md, adds them to your GitHub Project,
# and sets the Story Points and Sprint fields.
#
# BEFORE RUNNING
#   1. Install GitHub CLI (winget install --id GitHub.cli), reopen PowerShell
#   2. gh auth login
#   3. gh auth refresh -s project
#   4. In the Project, create a Number field named "Story Points" and an Iteration field named "Sprint"
#      with three iterations titled exactly: Dry Run, Sprint 1, Sprint 2
#   5. Add your teammates as repo collaborators (Settings > Collaborators) or they cannot be assigned
#   6. Fill in the variables below
#
# NOTE: this script has not been test-run against a live GitHub account. If the Project field step prints a
# warning, the issues are still created and added; set Story Points / Sprint in the Table view instead.

$ErrorActionPreference = 'Stop'

$Repo          = 'Taran-S-1001/smart-expense-budget-app'
$Owner         = 'Taran-S-1001'
$ProjectNumber = 0      # the number in your project URL: github.com/users/<you>/projects/<N>

$Users = @{
    Taran     = 'Taran-S-1001'
    Suryatej  = 'REPLACE_WITH_GITHUB_USERNAME'
    Sujay     = 'REPLACE_WITH_GITHUB_USERNAME'
    SuryaRaju = 'REPLACE_WITH_GITHUB_USERNAME'
}

if ($ProjectNumber -eq 0) { throw 'Set $ProjectNumber first.' }

# ---------- labels ----------
$labels = @(
    @('epic: foundation',    '5319E7'), @('epic: auth',          '0E8A16'), @('epic: transactions', '1D76DB'),
    @('epic: accounts',      '0052CC'), @('epic: budget',        'FBCA04'), @('epic: reports',      'D93F0B'),
    @('epic: notifications', 'F9D0C4'), @('epic: nfr-security',  'B60205'), @('epic: docs-process', '6A737D'),
    @('priority: high',      'B60205'), @('priority: medium',    'FBCA04'), @('priority: low',      '0E8A16'),
    @('stretch',             'C5DEF5')
)
foreach ($l in $labels) {
    gh label create $l[0] --color $l[1] --repo $Repo --force | Out-Null
}

# ---------- project field ids ----------
$ProjectId = (gh project view $ProjectNumber --owner $Owner --format json | ConvertFrom-Json).id
$fields    = (gh project field-list $ProjectNumber --owner $Owner --format json | ConvertFrom-Json).fields
$pointsField = $fields | Where-Object { $_.name -eq 'Story Points' }
$sprintField = $fields | Where-Object { $_.name -eq 'Sprint' }
$iterations  = @{}
if ($sprintField -and $sprintField.configuration -and $sprintField.configuration.iterations) {
    foreach ($it in $sprintField.configuration.iterations) { $iterations[$it.title] = $it.id }
}
if (-not $pointsField -or $iterations.Count -eq 0) {
    Write-Warning 'Could not read Story Points / Sprint fields; issues will be created but fields must be set manually.'
}

# ---------- stories ----------
function S($id, $title, $req, $epic, $owner, $pts, $sprint, $prio, $desc, $stretch = $false) {
    [pscustomobject]@{ Id = $id; Title = $title; Req = $req; Epic = $epic; Owner = $owner; Pts = $pts
                       Sprint = $sprint; Prio = $prio; Desc = $desc; Stretch = $stretch }
}

$stories = @(
    # ---- Dry run ----
    (S 'D-01' 'Create GitHub Project, labels, templates; write and estimate backlog' '-' 'docs-process' 'Taran' 3 'Dry Run' 'high' 'Project linked to repo, fields configured, all stories created with points and assignees.'),
    (S 'D-02' 'Backend scaffold per SAD' '-' 'foundation' 'SuryaRaju' 3 'Dry Run' 'high' 'Express app, PostgreSQL connection, env config, health endpoint, module folders (auth, transactions, budgets, accounts, reports, notifications, admin).'),
    (S 'D-03' 'DB schema and migrations per ER diagram' '-' 'foundation' 'SuryaRaju' 5 'Dry Run' 'high' 'Tables: User, Account, Category, Transaction, Budget, Receipt, Notification with FKs and constraints. Seed predefined categories.'),
    (S 'D-04' 'GitHub Actions CI pipeline' '-' 'foundation' 'SuryaRaju' 3 'Dry Run' 'high' 'Workflow runs npm ci and npm test on every push to feature branches and every PR into main.'),
    (S 'D-05' 'Frontend shell' '-' 'foundation' 'Taran' 3 'Dry Run' 'high' 'React app with routing, API client, layout and auth context placeholder.'),
    (S 'D-06' 'Auth middleware stub' 'F-002' 'auth' 'Suryatej' 3 'Dry Run' 'high' 'Verify JWT and set req.user so other modules can build against it before full login lands.'),
    (S 'D-07' 'Test harness: Jest + Supertest + test DB' '-' 'foundation' 'Sujay' 3 'Dry Run' 'high' 'npm test runs unit and integration tests against a separate test database.'),
    (S 'D-08' 'README dev setup and docker-compose for PostgreSQL' '-' 'docs-process' 'Suryatej' 2 'Dry Run' 'medium' 'A new teammate can clone, run docker-compose, and start the app by following the README.'),

    # ---- Sprint 1 ----
    (S 'S1-01' 'Registration with validation and salted hashing' 'SEBM-F-001, SEBM-SR-002' 'auth' 'Suryatej' 5 'Sprint 1' 'high' 'See AC-SEBM-F-001 (SRS 4.1) and AC-SEBM-SR-002 (SRS 5.1.2). Tests: TC-Reg-01, TC-Sec-03. Includes UI.'),
    (S 'S1-02' 'Login, JWT session, session persistence' 'SEBM-F-002' 'auth' 'Suryatej' 5 'Sprint 1' 'high' 'See AC-SEBM-F-002 (SRS 4.1). Test: TC-Auth-01. Includes UI.'),
    (S 'S1-03' 'Create and list accounts with balances' 'SEBM-F-030' 'accounts' 'Taran' 3 'Sprint 1' 'high' 'See AC-SEBM-F-030 (SRS 4.4). Test: TC-Acc-01. Includes UI.'),
    (S 'S1-04' 'Add expense/income transaction with atomic balance update' 'SEBM-F-010' 'transactions' 'Taran' 8 'Sprint 1' 'high' 'See AC-SEBM-F-010 (SRS 4.2). Test: TC-Exp-01. Balance update and insert in one DB transaction. Includes UI. Split if it overruns.'),
    (S 'S1-05' 'Create category-wise / overall monthly budget' 'SEBM-F-020' 'budget' 'Sujay' 5 'Sprint 1' 'high' 'See AC-SEBM-F-020 (SRS 4.3). Test: TC-Bud-01. Includes UI.'),
    (S 'S1-06' 'Budget progress: spent vs limit' 'SEBM-F-021' 'budget' 'Sujay' 5 'Sprint 1' 'high' 'See AC-SEBM-F-021 (SRS 4.3). Test: TC-Bud-02. Depends on S1-04; use seed data until merged. Includes UI.'),
    (S 'S1-07' 'HTTPS/TLS configuration and secure headers' 'SEBM-SR-001' 'nfr-security' 'SuryaRaju' 2 'Sprint 1' 'high' 'See AC-SEBM-SR-001 (SRS 5.1.2). Test: TC-Sec-02.'),
    (S 'S1-08' 'Notification service skeleton with mock provider' 'SEBM-F-050' 'notifications' 'SuryaRaju' 5 'Sprint 1' 'medium' 'See AC-SEBM-F-050 (SRS 4.6). Test: TC-Notif-01. Notification records, in-app list, provider behind an interface so it can be swapped.'),
    (S 'S1-09' 'End-to-end integration tests and demo script' '-' 'foundation' 'SuryaRaju' 3 'Sprint 1' 'high' 'Automated test of register, login, account, transaction, budget progress. Written demo script for the video.'),
    (S 'S1-10' 'Record and upload 1-minute Sprint 1 demo video' '-' 'docs-process' 'Taran' 1 'Sprint 1' 'high' 'Working product, committed under docs/demo/.'),

    # ---- Sprint 2 ----
    (S 'S2-01' 'Password reset via time-limited link/OTP' 'SEBM-F-003' 'auth' 'Suryatej' 5 'Sprint 2' 'high' 'See AC-SEBM-F-003 (SRS 4.1). Test: TC-Auth-02.'),
    (S 'S2-02' 'Automatic session timeout' 'SEBM-SR-004' 'auth' 'Suryatej' 3 'Sprint 2' 'medium' 'See AC-SEBM-SR-004 (SRS 5.1.2). Test: TC-Sec-05.'),
    (S 'S2-03' 'RBAC for admin endpoints' 'SEBM-SR-005' 'nfr-security' 'Suryatej' 3 'Sprint 2' 'high' 'See AC-SEBM-SR-005 (SRS 5.1.2). Test: TC-Sec-06.'),
    (S 'S2-04' 'Admin: manage predefined categories (minimal)' 'supports SEBM-F-013' 'auth' 'Suryatej' 3 'Sprint 2' 'medium' 'Admin-only endpoint and screen to add/edit predefined categories (Admin Service in SAD).'),
    (S 'S2-05' 'Edit/delete transaction, reversing and reapplying balance' 'SEBM-F-011' 'transactions' 'Taran' 5 'Sprint 2' 'high' 'See AC-SEBM-F-011 (SRS 4.2). Test: TC-Exp-02.'),
    (S 'S2-06' 'Custom categories' 'SEBM-F-013' 'transactions' 'Taran' 3 'Sprint 2' 'medium' 'See AC-SEBM-F-013 (SRS 4.2). Test: TC-Exp-04.'),
    (S 'S2-07' 'Atomic transfer between accounts' 'SEBM-F-031' 'accounts' 'Taran' 5 'Sprint 2' 'medium' 'See AC-SEBM-F-031 (SRS 4.4). Test: TC-Acc-02. Debit and credit in one DB transaction.'),
    (S 'S2-08' 'Threshold and limit-exceeded warnings' 'SEBM-F-022' 'budget' 'Sujay' 3 'Sprint 2' 'medium' 'See AC-SEBM-F-022 (SRS 4.3). Test: TC-Bud-03. Triggers the F-050 notification path.'),
    (S 'S2-09' 'Weekly/monthly report with charts' 'SEBM-F-040' 'reports' 'Sujay' 5 'Sprint 2' 'high' 'See AC-SEBM-F-040 (SRS 4.5). Test: TC-Rep-01.'),
    (S 'S2-10' 'Export report to PDF/CSV' 'SEBM-F-041' 'reports' 'Sujay' 5 'Sprint 2' 'medium' 'See AC-SEBM-F-041 (SRS 4.5). Test: TC-Rep-02.'),
    (S 'S2-11' 'Period-over-period comparison (stretch)' 'SEBM-F-042' 'reports' 'Sujay' 3 'Sprint 2' 'low' 'See AC-SEBM-F-042 (SRS 4.5). Test: TC-Rep-03.' $true),
    (S 'S2-12' 'Receipt photo attach and view' 'SEBM-F-012' 'transactions' 'SuryaRaju' 5 'Sprint 2' 'medium' 'See AC-SEBM-F-012 (SRS 4.2). Test: TC-Exp-03. Local disk or stub storage is an acceptable logged deviation.'),
    (S 'S2-13' 'Bill payment reminders (stretch)' 'SEBM-F-051' 'notifications' 'SuryaRaju' 5 'Sprint 2' 'low' 'See AC-SEBM-F-051 (SRS 4.6). Test: TC-Notif-02.' $true),
    (S 'S2-14' 'NFR verification and documentation' 'SEBM-NF-001, NF-002, NF-003/SR-003, NF-004, NF-005' 'nfr-security' 'SuryaRaju' 5 'Sprint 2' 'high' 'Response-time check (TC-Perf-01), encryption at rest (TC-Sec-01/04), accessibility audit (TC-UX-01). Document the basis and limits for NF-002 and NF-005.'),
    (S 'S2-15' 'Update SRS/SAD/Test Plan, finalize deviation log, set RTM statuses' '-' 'docs-process' 'Taran' 3 'Sprint 2' 'high' 'Documents match what was built; docs/DEVIATIONS.md complete.'),
    (S 'S2-16' 'Record 2-minute demo video; tag release and freeze' '-' 'docs-process' 'SuryaRaju' 2 'Sprint 2' 'high' 'Working product video under docs/demo/; git tag v1.0; no further feature work.')
)

# ---------- create ----------
foreach ($s in $stories) {
    $labelList = @("epic: $($s.Epic)", "priority: $($s.Prio)")
    if ($s.Stretch) { $labelList += 'stretch' }

    $body = @"
**Story ID:** $($s.Id)
**Req ID(s):** $($s.Req)
**Story points:** $($s.Pts)
**Sprint:** $($s.Sprint)

$($s.Desc)

**Definition of Done**
- [ ] Implemented per SRS v4.0 and SAD v1.1
- [ ] Unit and integration tests written and passing (TC IDs listed in the PR)
- [ ] PR raised by the assignee, reviewed and merged by the repo owner
- [ ] CI green
- [ ] RTM status updated
"@

    $ghArgs = @('issue', 'create', '--repo', $Repo, '--title', "[$($s.Id)] $($s.Title)",
                '--body', $body, '--label', ($labelList -join ','))
    $login = $Users[$s.Owner]
    if ($login -and -not $login.StartsWith('REPLACE')) { $ghArgs += @('--assignee', $login) }

    $out = & gh @ghArgs
    $url = ($out | Select-Object -Last 1).Trim()
    Write-Host "Created $($s.Id): $url"

    try {
        $item = gh project item-add $ProjectNumber --owner $Owner --url $url --format json | ConvertFrom-Json
        if ($pointsField) {
            gh project item-edit --id $item.id --project-id $ProjectId --field-id $pointsField.id --number $s.Pts | Out-Null
        }
        if ($sprintField -and $iterations.ContainsKey($s.Sprint)) {
            gh project item-edit --id $item.id --project-id $ProjectId --field-id $sprintField.id --iteration-id $iterations[$s.Sprint] | Out-Null
        }
    } catch {
        Write-Warning "Project fields not set for $($s.Id): $($_.Exception.Message)"
    }
}

Write-Host "Done. Check the Project Table view."
