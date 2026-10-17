# sync_backlog.ps1
# One script for both cases:
#   - issues that do not exist yet are CREATED
#   - issues you already created (matched by the "[S1-01]" prefix in the title) are UPDATED:
#     body rewritten, labels added, owner and tester set, project fields filled in
# Safe to re-run. NOTE: it REWRITES issue bodies, so edits you made by hand in the body are replaced.
#
# BEFORE RUNNING
#   1. gh auth login   then   gh auth refresh -s project
#   2. In the Project, make sure these fields exist:
#        Story Points  (Number)
#        Sprint        (Iteration, titles exactly: Dry Run, Sprint 1, Sprint 2)
#        Tester        (Text)   <- new, optional but recommended
#   3. Teammates must be repo collaborators (Settings > Collaborators) or they cannot be assigned
#   4. Fill in the variables below
#
# USAGE
#   .\sync_backlog.ps1 -DryRun            # prints what it would do, changes nothing
#   .\sync_backlog.ps1                    # does it
#   .\sync_backlog.ps1 -TesterAsAssignee  # also adds the tester as a GitHub assignee
#                                         # (blurs "who owns this card", so off by default)
#
# This script has not been run against a live GitHub account. Its logic was dry-run against a mocked gh;
# the shape of the JSON that "gh project" returns may differ slightly. If a project-field step warns,
# the issue is still created/updated; set that column by hand in the Table view.

param(
    [switch]$DryRun,
    [switch]$TesterAsAssignee
)

$ErrorActionPreference = 'Stop'

$Repo          = 'Taran-S-1001/smart-expense-budget-app'
$Owner         = 'Taran-S-1001'
$ProjectNumber = 0      # the number in your project URL: github.com/users/<you>/projects/<N>

# GitHub usernames per Dev letter
$Users = @{
    A = 'Taran-S-1001'
    B = 'REPLACE_WITH_GITHUB_USERNAME'
    C = 'REPLACE_WITH_GITHUB_USERNAME'
    D = 'REPLACE_WITH_GITHUB_USERNAME'
}
$DevName = @{
    A = 'Dev A (Taran S)'
    B = 'Dev B (Suryatej Vojjala)'
    C = 'Dev C (Sujay P Nayak)'
    D = 'Dev D (Surya Raju Naik)'
}
# Cross-testing rotation: each person's work is independently tested by:
#   A's work -> D,  B's work -> A,  C's work -> B,  D's work -> C
$TesterOf = @{ A = 'D'; B = 'A'; C = 'B'; D = 'C' }

if ($ProjectNumber -eq 0) { throw 'Set $ProjectNumber first.' }

# ---------------------------------------------------------------- helpers
function Invoke-Gh {
    param([string[]]$GhArgs, [switch]$Write)
    if ($Write -and $DryRun) { Write-Host ("  [dry-run] gh " + ($GhArgs -join ' ')); return $null }
    $out = & gh @GhArgs
    if ($LASTEXITCODE -ne 0) {
        $name = ($GhArgs | Select-Object -First 2) -join ' '
        throw "gh $name failed (exit code $LASTEXITCODE)"
    }
    return $out
}

function Write-BodyFile($text) {
    $path = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
    return $path
}

function S($id, $title, $req, $epic, $owner, $pts, $sprint, $prio, $desc, $dep, $stretch = $false) {
    [pscustomobject]@{ Id = $id; Title = $title; Req = $req; Epic = $epic; Owner = $owner; Pts = $pts
                       Sprint = $sprint; Prio = $prio; Desc = $desc; Dep = $dep; Stretch = $stretch }
}

# ---------------------------------------------------------------- backlog data
$stories = @(
    # ---- Dry run ----
    (S 'D-01' 'Create GitHub Project, labels, templates; write and estimate backlog' '-' 'docs-process' 'A' 3 'Dry Run' 'high' 'Project linked to repo, fields configured, all stories created with points, owners and testers. Add .github/pull_request_template.md and the bug / deviation labels.' 'Needs: nothing. Unblocks: issue and PR workflow for everyone.'),
    (S 'D-02' 'Backend scaffold per SAD' '-' 'foundation' 'D' 3 'Dry Run' 'high' 'Express app, PostgreSQL connection, env config, health endpoint, backend/src/routes.js, module folders (auth, transactions, budgets, accounts, reports, notifications, admin, receipts, middleware), backend/tests/{unit,integration,independent}.' 'Needs: nothing - MERGE FIRST. Unblocks: D-03, D-04, D-06, D-07, D-08 (final), every module.'),
    (S 'D-03' 'DB schema and migrations per ER diagram' '-' 'foundation' 'D' 5 'Dry Run' 'high' 'Tables: User, Account, Category, Transaction, Budget, Receipt, Notification with FKs and constraints. Seed predefined categories.' 'Needs: D-02 (and the docker-compose from D-08). Unblocks: D-07 (test DB), all Sprint 1 stories.'),
    (S 'D-04' 'GitHub Actions CI pipeline' '-' 'foundation' 'D' 3 'Dry Run' 'high' 'Workflow runs npm ci and npm test on pushes to main, feature/** and test/** and on every PR into main. Use --passWithNoTests until D-07 lands.' 'Needs: D-02. Unblocks: CI on every later PR - merge right after D-02.'),
    (S 'D-05' 'Frontend shell' '-' 'foundation' 'A' 3 'Dry Run' 'high' 'React app with routing, API client, layout, auth context placeholder, frontend/src/features/<module> folders.' 'Needs: nothing (parallel with D-02). Unblocks: all Sprint 1 UI work.'),
    (S 'D-06' 'Auth middleware stub' 'F-002' 'auth' 'B' 3 'Dry Run' 'high' 'Verify JWT and set req.user (including role). Export a signTestToken(userId, role) helper so every module can write authenticated tests without waiting for login.' 'Needs: D-02. Unblocks: S1-03 to S1-06 (authenticated endpoints and tests), S2-03.'),
    (S 'D-07' 'Test harness: Jest + Supertest + test DB' '-' 'foundation' 'C' 3 'Dry Run' 'high' 'npm test runs unit and integration tests against a separate test database; tables cleaned between tests; example tests for each folder.' 'Needs: D-02, D-03. Unblocks: every unit, integration and independent test.'),
    (S 'D-08' 'README dev setup and docker-compose for PostgreSQL' '-' 'docs-process' 'B' 2 'Dry Run' 'medium' 'A new teammate can clone, run docker-compose, copy .env.example, run migrations and start the app by following the README. Push docker-compose.yml first (small PR), README last.' 'Needs: D-02 for env variable names. Unblocks: D-03 and everyone''s local setup.'),

    # ---- Sprint 1 ----
    (S 'S1-01' 'Registration with validation and salted hashing' 'SEBM-F-001, SEBM-SR-002' 'auth' 'B' 5 'Sprint 1' 'high' 'See AC-SEBM-F-001 (SRS 4.1) and AC-SEBM-SR-002 (SRS 5.1.2). Tests: TC-Reg-01, TC-Sec-03. Includes UI.' 'Needs: D-02, D-03, D-07. Unblocks: S1-02, S1-09. Target merge: Tue 20 Oct.'),
    (S 'S1-02' 'Login, JWT session, session persistence' 'SEBM-F-002' 'auth' 'B' 5 'Sprint 1' 'high' 'See AC-SEBM-F-002 (SRS 4.1). Test: TC-Auth-01. Includes UI.' 'Needs: S1-01 (same owner, sequential), D-05. Unblocks: S1-09, S1-10, demo login. Target merge: Wed 21 Oct.'),
    (S 'S1-03' 'Create and list accounts with balances' 'SEBM-F-030' 'accounts' 'A' 3 'Sprint 1' 'high' 'See AC-SEBM-F-030 (SRS 4.4). Test: TC-Acc-01. Includes UI.' 'Needs: D-03, D-06, D-05. Unblocks: S1-04 (same owner), S1-09. Target merge: Tue 20 Oct (noon).'),
    (S 'S1-04' 'Add expense/income transaction with atomic balance update' 'SEBM-F-010' 'transactions' 'A' 8 'Sprint 1' 'high' 'See AC-SEBM-F-010 (SRS 4.2). Test: TC-Exp-01. Balance update and insert in one DB transaction. Includes UI. Split if it overruns.' 'Needs: S1-03. Unblocks: S1-09, S1-10, S2-05, S2-12. Budgets read the transactions TABLE, so S1-06 does not wait for this code. Target merge: Wed 21 Oct.'),
    (S 'S1-05' 'Create category-wise / overall monthly budget' 'SEBM-F-020' 'budget' 'C' 5 'Sprint 1' 'high' 'See AC-SEBM-F-020 (SRS 4.3). Test: TC-Bud-01. Includes UI.' 'Needs: D-03 (categories seeded), D-06. Unblocks: S1-06, S2-08. Target merge: Tue 20 Oct.'),
    (S 'S1-06' 'Budget progress: spent vs limit' 'SEBM-F-021' 'budget' 'C' 5 'Sprint 1' 'high' 'See AC-SEBM-F-021 (SRS 4.3). Test: TC-Bud-02. Compute spent on read (SUM over the transactions table by category and period) instead of storing it. Includes UI.' 'Needs: S1-05. Use SQL fixtures until S1-04 merges, then re-run the integration test against real transactions. Unblocks: S1-09, S2-08. Target merge: Wed 21 Oct.'),
    (S 'S1-07' 'HTTPS/TLS configuration and secure headers' 'SEBM-SR-001' 'nfr-security' 'D' 2 'Sprint 1' 'high' 'See AC-SEBM-SR-001 (SRS 5.1.2). Test: TC-Sec-02.' 'Needs: D-02. Unblocks: S2-14. Target merge: Tue 20 Oct.'),
    (S 'S1-08' 'Notification service skeleton with mock provider' 'SEBM-F-050' 'notifications' 'D' 5 'Sprint 1' 'medium' 'See AC-SEBM-F-050 (SRS 4.6). Test: TC-Notif-01. Notification records, in-app list, provider behind an interface. Publish the contract NotificationService.send({ userId, type, message }) in the PR description.' 'Needs: D-02, D-03. Unblocks: S2-01 (reset delivery), S2-08, S2-13. Target merge: Wed 21 Oct.'),
    (S 'S1-09' 'End-to-end integration tests and demo script' '-' 'foundation' 'D' 3 'Sprint 1' 'high' 'Automated test of register, login, account, transaction, budget progress. Written demo script for the video. Draft the script earlier; the tests wait for the stories below.' 'Needs: S1-01, S1-02, S1-03, S1-04, S1-05, S1-06 merged (waits on Dev B, Dev A, Dev C). Unblocks: S1-10. Target: Thu 22 Oct.'),
    (S 'S1-10' 'Record and upload 1-minute Sprint 1 demo video' '-' 'docs-process' 'A' 1 'Sprint 1' 'high' 'Working product, committed under docs/demo/ (keep under about 50 MB).' 'Needs: S1-09 green, S1-02 (login). Unblocks: Sprint 1 review. Target: Fri 23 Oct morning.'),

    # ---- Sprint 2 ----
    (S 'S2-01' 'Password reset via time-limited link/OTP' 'SEBM-F-003' 'auth' 'B' 5 'Sprint 2' 'high' 'See AC-SEBM-F-003 (SRS 4.1). Test: TC-Auth-02. Deliver the link/OTP through NotificationService.send.' 'Needs: S1-01, S1-02, S1-08 (all merged in Sprint 1).'),
    (S 'S2-02' 'Automatic session timeout' 'SEBM-SR-004' 'auth' 'B' 3 'Sprint 2' 'medium' 'See AC-SEBM-SR-004 (SRS 5.1.2). Test: TC-Sec-05.' 'Needs: S1-02. Unblocks: S2-14.'),
    (S 'S2-03' 'RBAC middleware for admin endpoints' 'SEBM-SR-005' 'nfr-security' 'D' 3 'Sprint 2' 'high' 'See AC-SEBM-SR-005 (SRS 5.1.2). Test: TC-Sec-06. Build requireRole(role) in backend/src/middleware/rbac.js and test it on a dummy protected route. Dev B applies requireRole(''Admin'') to the admin router in S2-04.' 'Needs: D-06 (role in req.user). MERGE BEFORE S2-04 wiring. Unblocks: S2-04, S2-14.'),
    (S 'S2-04' 'Admin: manage predefined categories (minimal)' 'supports SEBM-F-013' 'auth' 'B' 3 'Sprint 2' 'medium' 'Admin-only endpoint and screen to add/edit predefined categories (user_id NULL in Category). Apply requireRole(''Admin'') from S2-03.' 'Needs: S2-03 merged (for the one-line wiring), D-03. Unblocks: RBAC verification by Dev C, S2-14.'),
    (S 'S2-05' 'Edit/delete transaction, reversing and reapplying balance' 'SEBM-F-011' 'transactions' 'A' 5 'Sprint 2' 'high' 'See AC-SEBM-F-011 (SRS 4.2). Test: TC-Exp-02. After create/edit/delete, call the Budget Service threshold check (contract defined by Dev C in S2-08) so warnings stay current.' 'Needs: S1-04; the budget hook needs the S2-08 contract (agree on Mon 26 Oct, wire after S2-08 merges).'),
    (S 'S2-06' 'Custom categories' 'SEBM-F-013' 'transactions' 'A' 3 'Sprint 2' 'medium' 'See AC-SEBM-F-013 (SRS 4.2). Test: TC-Exp-04. Predefined categories (user_id NULL) are managed by S2-04; do not import across modules.' 'Needs: D-03.'),
    (S 'S2-07' 'Atomic transfer between accounts' 'SEBM-F-031' 'accounts' 'A' 5 'Sprint 2' 'medium' 'See AC-SEBM-F-031 (SRS 4.4). Test: TC-Acc-02. Debit and credit in one DB transaction.' 'Needs: S1-03.'),
    (S 'S2-08' 'Threshold and limit-exceeded warnings' 'SEBM-F-022' 'budget' 'C' 3 'Sprint 2' 'medium' 'See AC-SEBM-F-022 (SRS 4.3). Test: TC-Bud-03. Publish budgetService.checkThreshold(userId, categoryId, date) early; it calls NotificationService.send.' 'Needs: S1-05, S1-06, S1-08. Unblocks: the budget hook in S2-05 (Dev A), end-to-end F-050 alert.'),
    (S 'S2-09' 'Weekly/monthly report with charts' 'SEBM-F-040' 'reports' 'C' 5 'Sprint 2' 'high' 'See AC-SEBM-F-040 (SRS 4.5). Test: TC-Rep-01.' 'Needs: S1-04 (data), S1-06. Unblocks: S2-10, S2-11.'),
    (S 'S2-10' 'Export report to PDF/CSV' 'SEBM-F-041' 'reports' 'C' 5 'Sprint 2' 'medium' 'See AC-SEBM-F-041 (SRS 4.5). Test: TC-Rep-02.' 'Needs: S2-09 (same owner, sequential).'),
    (S 'S2-11' 'Period-over-period comparison (stretch)' 'SEBM-F-042' 'reports' 'C' 3 'Sprint 2' 'low' 'See AC-SEBM-F-042 (SRS 4.5). Test: TC-Rep-03.' 'Needs: S2-09.' $true),
    (S 'S2-12' 'Receipt photo attach and view' 'SEBM-F-012' 'transactions' 'D' 5 'Sprint 2' 'medium' 'See AC-SEBM-F-012 (SRS 4.2). Test: TC-Exp-03. Local disk or stub storage is an acceptable logged deviation. Build a ReceiptSection component; Dev A mounts it on the transaction detail screen after it merges.' 'Needs: S1-04. UI slot: Dev A wires <ReceiptSection/> into transaction detail after this merges.'),
    (S 'S2-13' 'Bill payment reminders (stretch)' 'SEBM-F-051' 'notifications' 'D' 5 'Sprint 2' 'low' 'See AC-SEBM-F-051 (SRS 4.6). Test: TC-Notif-02.' 'Needs: S1-08.' $true),
    (S 'S2-14' 'NFR verification and documentation' 'SEBM-NF-001, NF-002, NF-003/SR-003, NF-004, NF-005' 'nfr-security' 'D' 5 'Sprint 2' 'high' 'Response-time check (TC-Perf-01), encryption at rest (TC-Sec-01/04), accessibility audit (TC-UX-01). Document the basis and limits for NF-002 and NF-005. Decide the SR-003 approach on Mon 26 Oct with Dev A, because it may touch the Account table.' 'Needs: most features merged (run after Wed 28 Oct), S1-07, S2-02, S2-03, S2-04.'),
    (S 'S2-15' 'Update SRS/SAD/Test Plan, finalize deviation log, set RTM statuses' '-' 'docs-process' 'A' 3 'Sprint 2' 'high' 'Documents match what was built; docs/DEVIATIONS.md complete.' 'Needs: all deviations collected and testing results in. Runs last: Thu 29 - Fri 30 Oct.'),
    (S 'S2-16' 'Record 2-minute demo video; tag release and freeze' '-' 'docs-process' 'D' 2 'Sprint 2' 'high' 'Working product video under docs/demo/; git tag v1.0; no further feature work.' 'Needs: every story merged and verified. Runs last: Fri 30 Oct.')
)

function Build-Body($s) {
    $tester = $TesterOf[$s.Owner]
@"
**Story ID:** $($s.Id)
**Owner:** $($DevName[$s.Owner])
**Independent tester:** $($DevName[$tester])
**Req ID(s):** $($s.Req)
**Story points:** $($s.Pts)
**Sprint:** $($s.Sprint)
**Dependencies:** $($s.Dep)
**Branch:** feature/<module>/<issue-number>-<short-name>

$($s.Desc)

**Definition of Done**
- [ ] Implemented per SRS v4.0 and SAD v1.1
- [ ] Unit and integration tests written and passing (TC IDs listed in the PR)
- [ ] PR raised by the owner from their own branch, reviewed and merged by the repo owner
- [ ] CI green
- [ ] Independently verified by $($DevName[$tester]) (comment "Verified by <name>")
- [ ] RTM status updated
"@
}

# ---------------------------------------------------------------- labels
Write-Host 'Creating/updating labels...'
$labels = @(
    @('epic: foundation','5319E7'), @('epic: auth','0E8A16'), @('epic: transactions','1D76DB'),
    @('epic: accounts','0052CC'), @('epic: budget','FBCA04'), @('epic: reports','D93F0B'),
    @('epic: notifications','F9D0C4'), @('epic: nfr-security','B60205'), @('epic: docs-process','6A737D'),
    @('priority: high','B60205'), @('priority: medium','FBCA04'), @('priority: low','0E8A16'),
    @('stretch','C5DEF5'), @('bug','D73A4A'), @('deviation','FEF2C0'),
    @('tester: Dev A','BFD4F2'), @('tester: Dev B','BFD4F2'), @('tester: Dev C','BFD4F2'), @('tester: Dev D','BFD4F2')
)
foreach ($l in $labels) {
    Invoke-Gh -Write -GhArgs @('label','create',$l[0],'--color',$l[1],'--repo',$Repo,'--force') | Out-Null
}

# ---------------------------------------------------------------- project field ids
$ProjectId   = (Invoke-Gh -GhArgs @('project','view',"$ProjectNumber",'--owner',$Owner,'--format','json') | ConvertFrom-Json).id
$fields      = (Invoke-Gh -GhArgs @('project','field-list',"$ProjectNumber",'--owner',$Owner,'--format','json') | ConvertFrom-Json).fields
$pointsField = $fields | Where-Object { $_.name -eq 'Story Points' }
$sprintField = $fields | Where-Object { $_.name -eq 'Sprint' }
$testerField = $fields | Where-Object { $_.name -eq 'Tester' }
$iterations  = @{}
if ($sprintField -and $sprintField.configuration -and $sprintField.configuration.iterations) {
    foreach ($it in $sprintField.configuration.iterations) { $iterations[$it.title] = $it.id }
}
if (-not $pointsField)        { Write-Warning 'No "Story Points" field found - set it by hand.' }
if ($iterations.Count -eq 0)  { Write-Warning 'No "Sprint" iterations found - set Sprint by hand.' }
if (-not $testerField)        { Write-Warning 'No "Tester" text field found - the tester is still in the label and issue body.' }

# ---------------------------------------------------------------- existing issues and project items
$existing = @(Invoke-Gh -GhArgs @('issue','list','--repo',$Repo,'--state','all','--limit','300','--json','number,title,assignees,url') | ConvertFrom-Json)
$items    = @((Invoke-Gh -GhArgs @('project','item-list',"$ProjectNumber",'--owner',$Owner,'--limit','300','--format','json') | ConvertFrom-Json).items)

# ---------------------------------------------------------------- sync
foreach ($s in $stories) {
    $ownerLogin  = $Users[$s.Owner]
    $testerKey   = $TesterOf[$s.Owner]
    $testerLogin = $Users[$testerKey]
    $labelList   = @("epic: $($s.Epic)", "priority: $($s.Prio)", "tester: Dev $testerKey")
    if ($s.Stretch) { $labelList += 'stretch' }
    $labelCsv    = $labelList -join ','
    $title       = "[$($s.Id)] $($s.Title)"
    $bodyFile    = Write-BodyFile (Build-Body $s)

    $issue = $existing | Where-Object { $_.title.StartsWith("[$($s.Id)]") } | Select-Object -First 1

    if ($issue) {
        $num = $issue.number
        $url = $issue.url
        Write-Host "Updating $($s.Id) (#$num)"
        $ghArgs = @('issue','edit',"$num",'--repo',$Repo,'--title',$title,'--body-file',$bodyFile,'--add-label',$labelCsv)
        # owner on, everyone else off (so a reassignment such as S2-03 moves the card)
        $current = @($issue.assignees | ForEach-Object { $_.login })
        foreach ($k in $Users.Keys) {
            $login = $Users[$k]
            if ($login.StartsWith('REPLACE')) { continue }
            if ($k -eq $s.Owner) { $ghArgs += @('--add-assignee', $login) }
            elseif ($TesterAsAssignee -and $k -eq $testerKey) { $ghArgs += @('--add-assignee', $login) }
            elseif ($current -contains $login) { $ghArgs += @('--remove-assignee', $login) }
        }
        Invoke-Gh -Write -GhArgs $ghArgs | Out-Null
    } else {
        Write-Host "Creating $($s.Id)"
        $ghArgs = @('issue','create','--repo',$Repo,'--title',$title,'--body-file',$bodyFile,'--label',$labelCsv)
        if (-not $ownerLogin.StartsWith('REPLACE')) { $ghArgs += @('--assignee', $ownerLogin) }
        if ($TesterAsAssignee -and -not $testerLogin.StartsWith('REPLACE')) { $ghArgs += @('--assignee', $testerLogin) }
        $out = Invoke-Gh -Write -GhArgs $ghArgs
        if ($DryRun) { Remove-Item $bodyFile -ErrorAction SilentlyContinue; continue }
        $url = ($out | Select-Object -Last 1).Trim()
        $num = [int]($url.Split('/')[-1])
    }
    Remove-Item $bodyFile -ErrorAction SilentlyContinue

    try {
        $item = $items | Where-Object { $_.content -and $_.content.number -eq $num } | Select-Object -First 1
        if (-not $item) {
            $added = Invoke-Gh -Write -GhArgs @('project','item-add',"$ProjectNumber",'--owner',$Owner,'--url',$url,'--format','json')
            if ($added) { $item = $added | ConvertFrom-Json }
        }
        if ($item) {
            if ($pointsField) {
                Invoke-Gh -Write -GhArgs @('project','item-edit','--id',$item.id,'--project-id',$ProjectId,'--field-id',$pointsField.id,'--number',"$($s.Pts)") | Out-Null
            }
            if ($sprintField -and $iterations.ContainsKey($s.Sprint)) {
                Invoke-Gh -Write -GhArgs @('project','item-edit','--id',$item.id,'--project-id',$ProjectId,'--field-id',$sprintField.id,'--iteration-id',$iterations[$s.Sprint]) | Out-Null
            }
            if ($testerField) {
                Invoke-Gh -Write -GhArgs @('project','item-edit','--id',$item.id,'--project-id',$ProjectId,'--field-id',$testerField.id,'--text',$DevName[$testerKey]) | Out-Null
            }
        }
    } catch {
        Write-Warning "Project fields not set for $($s.Id): $($_.Exception.Message)"
    }
}

Write-Host 'Done. Check the Project Table view (add columns: Assignees, Tester, Story Points, Sprint).'
