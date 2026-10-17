# SEBM Sprint Plan (Dry Run + Sprint 1 + Sprint 2)

Source of truth for scope, ownership, testers, estimates, order of work and waiting points. Requirement IDs refer to SRS v4.0, design to SAD v1.1, test case IDs to Test Plan v1.1. This file supersedes `SPRINT1.md`. The same backlog is loaded into GitHub by `sync_backlog.ps1`.

## 1. Calendar

| Period | Dates | Purpose |
|---|---|---|
| Dry run | Thu 15 - Fri 16 Oct (weekend buffer, spill-over to Mon 19 morning) | Foundation + practise the full branch / PR / CI / review / merge cycle |
| Refinement + Sprint 1 planning | Mon 19 Oct, morning (backlog entries may still change) | Confirm points, owners, testers |
| **Sprint 1** | Mon 19 - Fri 23 Oct | Working core flow; 1-minute demo video uploaded to the repo |
| **Sprint 2** | Mon 26 - Fri 30 Oct | Remaining features, documentation, 2-minute video, **freeze** |

## 2. Roles and cross-testing

| Role | Person | Builds | Independently tests |
|---|---|---|---|
| **Dev A** (Scrum Master, repo owner) | Taran S | Accounts, Transactions, frontend shell, documentation | Auth (Dev B's work) |
| **Dev B** | Suryatej Vojjala | Auth, Admin, local dev setup | Budgets + Reports (Dev C's work) |
| **Dev C** | Sujay P Nayak | Budgets, Reports, test harness, RTM upkeep | Notifications + Security/NFRs (Dev D's work) |
| **Dev D** | Surya Raju Naik | DB schema, CI/CD, TLS, RBAC middleware, Notifications, Receipts, NFR checks | Accounts + Transactions (Dev A's work) |

**Rule: if you built it, you cannot test it.** The tester of a story is the person assigned to test its owner's work: A's work is tested by D, B's by A, C's by B, D's by C. This holds even where a story sits in another module (for example S2-12 Receipts is built by Dev D, so Dev C verifies it).

## 3. Working agreements

- **One issue = one branch = one PR.** Branch: `feature/<module>/<issue-number>-<short-name>`. Independent tests: `test/<module>/<issue-number>-<short-name>`. Bug fixes: `feature/<module>/<bug-issue-number>-fix-<short-name>`.
- **Owner raises the PR** with `Closes #<issue>`, requirement IDs and TC IDs. **Dev A reviews and merges** (Dev D reviews Dev A's PRs). Nobody merges their own PR. Nobody edits another member's module folder.
- **Review windows:** Dev A reviews at about 10:00 and 17:00 daily. A PR opened before 15:00 gets a same-day review. Blocking foundation PRs are flagged in the group chat for immediate review.
- **CI green before merge.** A red build is fixed before anything else is merged.
- **Definition of Done:** implemented per SRS/SAD; unit + integration tests pass; CI green; PR reviewed and merged; **independent tester comments "Verified by <name>"**; RTM status updated (Dev C); card moved to Done.
- **Scrum events:** daily 10-minute stand-up (done / next / blocked); planning Mon 19 and Mon 26; review + retro Fri 23 and Fri 30.
- **Blocked rule:** if blocked for more than 4 working hours, post in the group chat naming who you are waiting for, and comment on the blocking issue. Do not sit idle: do the "while waiting" work in section 5.
- **Deviations** are logged in `docs/DEVIATIONS.md` the moment they are decided.

## 4. Backlog

Points are Fibonacci. Tester = the person who independently verifies the story.

### Dry run - 25 pts

| ID | Story | Owner | Tester | Pts |
|---|---|---|---|---|
| D-01 | GitHub Project, labels, PR template; backlog written and estimated | A | D | 3 |
| D-02 | Backend scaffold per SAD | D | C | 3 |
| D-03 | DB schema + migrations per ER diagram, seed categories | D | C | 5 |
| D-04 | GitHub Actions CI | D | C | 3 |
| D-05 | Frontend shell | A | D | 3 |
| D-06 | Auth middleware stub + test-token helper | B | A | 3 |
| D-07 | Jest + Supertest + test DB harness | C | B | 3 |
| D-08 | README dev setup + docker-compose Postgres | B | A | 2 |

### Sprint 1 - 42 pts

Goal: register, log in, create an account, add a transaction, set a budget, see spending against it, see a notification record.

| ID | Story | Req | Owner | Tester | Pts |
|---|---|---|---|---|---|
| S1-01 | Registration, validation, salted hashing | F-001, SR-002 | B | A | 5 |
| S1-02 | Login, JWT session, persistence | F-002 | B | A | 5 |
| S1-03 | Create/list accounts with balances | F-030 | A | D | 3 |
| S1-04 | Add transaction with atomic balance update | F-010 | A | D | 8 |
| S1-05 | Create category-wise / overall monthly budget | F-020 | C | B | 5 |
| S1-06 | Budget progress: spent vs limit | F-021 | C | B | 5 |
| S1-07 | HTTPS/TLS configuration | SR-001 | D | C | 2 |
| S1-08 | Notification service skeleton, mock provider | F-050 | D | C | 5 |
| S1-09 | End-to-end integration tests + demo script | - | D | C | 3 |
| S1-10 | Record and upload 1-minute demo video | - | A | D | 1 |

### Sprint 2 - 63 pts (55 core + 8 stretch)

| ID | Story | Req | Owner | Tester | Pts |
|---|---|---|---|---|---|
| S2-01 | Password reset | F-003 | B | A | 5 |
| S2-02 | Session timeout | SR-004 | B | A | 3 |
| S2-03 | **RBAC middleware for admin endpoints (reassigned to Dev D)** | SR-005 | D | C | 3 |
| S2-04 | Admin: manage predefined categories | supports F-013 | B | A | 3 |
| S2-05 | Edit/delete transaction | F-011 | A | D | 5 |
| S2-06 | Custom categories | F-013 | A | D | 3 |
| S2-07 | Transfer between accounts | F-031 | A | D | 5 |
| S2-08 | Threshold / limit-exceeded warnings | F-022 | C | B | 3 |
| S2-09 | Weekly/monthly report with charts | F-040 | C | B | 5 |
| S2-10 | Export PDF/CSV | F-041 | C | B | 5 |
| S2-11 | Period comparison (stretch) | F-042 | C | B | 3 |
| S2-12 | Receipt photo attach/view | F-012 | D | C | 5 |
| S2-13 | Bill reminders (stretch) | F-051 | D | C | 5 |
| S2-14 | NFR verification + documentation | NF-001..005, SR-003 | D | C | 5 |
| S2-15 | Update SRS/SAD/Test Plan, deviation log, RTM | - | A | D | 3 |
| S2-16 | 2-minute video, tag v1.0, freeze | - | D | C | 2 |

### Points per person

| | Dry run | Sprint 1 | Sprint 2 (core) |
|---|---|---|---|
| Dev A | 6 | 12 | 16 |
| Dev B | 5 | 10 | 11 |
| Dev C | 3 | 10 | 16 (13) |
| Dev D | 11 | 10 | 20 (15) |

Dev D is the heaviest in the dry run and in Sprint 2 after the SR-005 move. See open decisions in section 8.

## 5. Order of work and who waits for whom

### 5.1 Dry run (Thu 15 - Fri 16, buffer to Mon 19)

**Merge order (Dev A merges in this order; later items branch from earlier ones):**
1. **D-01** (no code) - Dev A, first thing Thursday: project, labels, PR template, run `sync_backlog.ps1`, invite collaborators.
2. **D-02** backend scaffold - Dev D. **Everyone's backend work waits for this.** Open the PR within the first hours; Dev A reviews immediately.
3. **D-04** CI - Dev D, with `--passWithNoTests` so it can merge straight after D-02. From now on every PR gets CI.
4. **D-08** docker-compose (the README can come later) - Dev B. Needed by D-03 and D-07 for a shared database setup.
5. **D-03** schema + migrations - Dev D. **Blocks all Sprint 1 stories and the test database.**
6. **D-06** auth middleware stub + `signTestToken` helper - Dev B. Blocks authenticated endpoints and tests.
7. **D-07** test harness - Dev C (needs D-02 and D-03). Blocks every test.
8. **D-05** frontend shell - Dev A. Independent; can merge any time.
9. **Practice PR** from every member (a small test or README line): branch, PR, CI, review, merge, board card moves.

**While waiting (nobody sits idle):**
- Dev A: D-01, then D-05, which does not depend on the backend.
- Dev B: D-08 docker-compose and the D-06 design (JWT fields, role claim, helper signature) before D-02 lands.
- Dev C: set up local Postgres, read the Sprint 1 acceptance criteria, draft the independent test cases for Notifications/Security (the module Dev C tests), design the harness folders; finish D-07 after D-03.
- Dev D: D-02 first, then D-03. If D-02 is not merged by Thursday afternoon, say so in the chat.

### 5.2 Sprint 1 (Mon 19 - Fri 23)

Foundation items still open must merge by noon Monday.

| Day | Build | Waiting / handoffs |
|---|---|---|
| **Mon 19** | B: S1-01. A: S1-03. C: S1-05. D: S1-07, start S1-08. | Planning in the morning. Anyone still missing a dry-run item says so now. |
| **Tue 20** | Merge targets: S1-03 (noon), S1-01, S1-05, S1-07 (end of day). A starts S1-04. B starts S1-02. | A waits for S1-03 merge before S1-04 can be tested against real accounts. |
| **Wed 21** | Merge targets (end of day): S1-02, S1-04, S1-06, S1-08. | **S1-06** builds on fixtures until S1-04 merges, then re-runs its integration test on real transactions. |
| **Thu 22** | D: S1-09 end-to-end tests (needs S1-01 to S1-06 merged: waits on B, A, C). Code freeze 18:00. | S1-09 cannot finish before Wednesday's merges. Draft the script earlier. |
| **Fri 23** | Bug fixes only in the morning. A: S1-10 video after S1-09 is green; upload to `docs/demo/` by noon. Review + retro in the afternoon. | S1-10 waits on S1-09 and on login (S1-02). |

**Waiting table (Sprint 1):**

| Who waits | For | Why | Mitigation |
|---|---|---|---|
| Everyone | D-02, D-03 (Dev D) | Scaffold and schema | Merge first; see 5.1 |
| B, A, C | D-06 (Dev B) | `req.user` and test tokens | Dev B merges early; `signTestToken` lets others test without login |
| B | S1-01 before S1-02 | Same owner, sequential | Build in order |
| A | S1-03 before S1-04 | Same owner, sequential | Build in order |
| C | S1-05 before S1-06 | Same owner, sequential | Build in order |
| C | S1-04 (Dev A) | Real transaction data for the S1-06 integration test | Compute spent on read from the transactions table; use fixtures until merged |
| D | S1-01 to S1-06 | End-to-end test needs all of them | Draft the script and test skeleton early |
| A | S1-09 (Dev D), S1-02 (Dev B) | Video needs a working login and a green end-to-end test | Rehearse the demo on Thursday |
| Everyone | Dev A's review | Single merger | Review windows at 10:00 and 17:00; Dev D reviews Dev A's PRs |

**Contracts to agree on Monday (so nobody blocks on code):**
- `NotificationService.send({ userId, type, message })` - published by Dev D in S1-08, used by Dev B (S2-01) and Dev C (S2-08).
- `signTestToken(userId, role)` - published by Dev B in D-06.
- Budgets compute spent on read from the `transactions` table - Dev C and Dev A agree; no code coupling.

### 5.3 Sprint 2 (Mon 26 - Fri 30)

Feature work is merged by Wed 28 end of day. Thursday is verification, bug fixes and documentation. Friday is video, tag and freeze only.

| Order | Work | Depends on / handoff |
|---|---|---|
| 1 | **S2-03** RBAC middleware (D) - merge Mon/Tue | Needs D-06. **Must merge before S2-04 wires it.** |
| 2 | **S2-04** Admin categories (B) - Tue/Wed | Needs S2-03 merged; Dev B adds `requireRole('Admin')` to the admin router |
| 3 | **S2-08** warnings (C) - publish `budgetService.checkThreshold(userId, categoryId, date)` on Monday | Needs S1-05, S1-06, S1-08 |
| 4 | **S2-05** edit/delete (A) - wires the `checkThreshold` call after S2-08 merges | Needs S1-04; waits for the S2-08 contract |
| 5 | **S2-09 -> S2-10 -> S2-11** reports (C), sequential | Needs S1-04 data |
| 6 | **S2-12** receipts (D) | Needs S1-04; Dev A mounts `<ReceiptSection/>` on the transaction detail screen after it merges |
| 7 | **S2-01, S2-02** (B), **S2-06, S2-07** (A), **S2-13** (D, stretch) | Independent; S2-01 uses `NotificationService` |
| 8 | **S2-14** NFR verification (D) - runs after Wed 28 | Needs most features merged. **Decide the SR-003 encryption approach on Monday with Dev A**, because it may touch the Account table. |
| 9 | **S2-15** documents (A) - Thu/Fri | Needs deviations and test results |
| 10 | **S2-16** video + tag + freeze (D) - Fri | Needs everything merged and verified |

**Waiting table (Sprint 2):**

| Who waits | For | Mitigation |
|---|---|---|
| B (S2-04 wiring) | D (S2-03) | D merges S2-03 first; B builds the admin endpoints meanwhile |
| A (budget hook in S2-05) | C (S2-08 contract) | C publishes the function signature Monday; A builds edit/delete first and wires last |
| A (receipt UI slot) | D (S2-12) | D merges the component; A adds one mount line |
| C (S2-10, S2-11) | C (S2-09) | Same owner |
| D (S2-14) | all feature owners, Wed 28 | Start SR-003 and the accessibility audit earlier; run performance last |
| A (S2-15) | everyone's deviations | Collect continuously; write the final version Thursday |
| D (S2-16) | A (final merges and S2-15) | Record Friday morning; tag after the last merge |

## 6. Testing: how it works and who waits

### 6.1 Steps for each story

1. **Owner** writes unit + integration tests in the same PR (named `TC-...`, quoting the AC).
2. **Tester prepares in parallel:** from the SRS acceptance criteria, write the black-box test cases for the story *before* it merges (no code needed).
3. **After merge to `main`:** the tester pulls, runs the whole suite, runs their independent tests in `backend/tests/independent/<module>/` (own `test/...` branch and PR), and tries the feature in the running app.
4. **Defects:** open a GitHub issue labelled `bug`, assigned to the owner, with steps to reproduce. The owner fixes on `feature/<module>/<bug>-fix-...`; the tester re-tests after merge.
5. **Pass:** the tester comments "Verified by <name>" on the story issue; only then does the card go to Done.

### 6.2 Who tests what, and when they can start

| Tester | Tests | Can prepare from | Can execute after | Typical window |
|---|---|---|---|---|
| **Dev A** | Auth: S1-01, S1-02, then S2-01, S2-02, S2-04 | Mon 19 | S1-01 merged (Tue), S1-02 merged (Wed) | Wed - Thu; Sprint 2: Tue - Thu |
| **Dev D** | Accounts + Transactions: S1-03, S1-04, then S2-05, S2-06, S2-07 | Mon 19 | S1-03 merged (Tue noon), S1-04 merged (Wed) | Tue - Thu; Sprint 2: Tue - Thu |
| **Dev B** | Budgets + Reports: S1-05, S1-06, then S2-08 to S2-11 | Mon 19 | S1-05 merged (Tue), S1-06 merged (Wed) | Wed - Thu; Sprint 2: Wed - Thu |
| **Dev C** | Notifications + Security/NFRs: S1-07, S1-08, S1-09, then S2-03, S2-12, S2-13, S2-14, S2-16 | Mon 19 | S1-07 merged (Tue), S1-08 merged (Wed) | Wed - Thu; Sprint 2: Wed - Thu |

### 6.3 Testing waits

| Tester | Waits for | Reason | What to do meanwhile |
|---|---|---|---|
| Everyone | D-03 + D-07 | Test database and harness | Write test cases on paper from the SRS |
| Everyone | D-06 | `signTestToken` for authenticated tests | Prepare unauthenticated cases (validation, errors) |
| Dev A | Dev B's merges (S1-01 Tue, S1-02 Wed) | Nothing to run before merge | Prepare registration, login, token and boundary cases |
| Dev D | Dev A's merges (S1-03 Tue noon, S1-04 Wed) | Same | Prepare balance, boundary and "other user's account" cases |
| Dev B | Dev C's merges (S1-05 Tue, S1-06 Wed); real transaction data needs Dev A's S1-04 | Same, plus a transitive wait | Test budget creation first, progress after S1-04 is on `main` |
| Dev C | Dev D's merges (S1-07 Tue, S1-08 Wed); S2-03 RBAC checks need Dev B's S2-04 routes | Same | Test TLS and notification records first; RBAC after S2-04 merges |
| Dev D (end-to-end, S1-09) | S1-01 to S1-06 | Needs the whole flow | Draft the script |
| Dev C (verifying S1-09, S2-14) | Dev D finishing | Test after the owner finishes | Review the test code while waiting |

### 6.4 Testing cut-offs

- **Sprint 1:** code freeze Thu 22 at 18:00. Testers finish verification Thursday. Friday morning is bug-fix only.
- **Sprint 2:** features merged Wed 28 end of day. Thu 29: testers verify, owners fix, Dev D runs the NFR checks, Dev A finalises documents. A full regression (`npm test` plus manual smoke on `main`) runs Thursday evening. Fri 30: documents, video, tag, freeze; no feature merges.
- Anything not verified by the cut-off is recorded in `docs/DEVIATIONS.md` as "not verified".

## 7. Coverage check

All 27 requirement IDs are scheduled: F-001/002/010/020/021/030/050 and SR-001/002 in Sprint 1; the rest in Sprint 2. NF-002 (availability) and NF-005 (10,000 users) cannot be truly verified in a one-week student project; S2-14 documents the design basis and the limitation.

## 8. Open decisions and deviation candidates

- **Dev D load:** 11 pts in the dry run and 20 in Sprint 2. Options: move D-04 (CI) to Dev C for the dry run; move S2-16 (video, tag, freeze) to Dev B in Sprint 2. Decide at Monday's planning.
- **S2-12 Receipts** is built by Dev D but belongs to the Transactions module in the SRS. The tester is Dev C (the "built it, cannot test it" rule). The Test Plan lists F-012 under Dev D as tester, so log this as a deviation or edit the table.
- **S2-03 RBAC** lives in `backend/src/middleware/rbac.js` (Dev D) and is applied to the admin router by Dev B. The SAD lists RBAC under the Auth Service; treat as a wording difference or log it.
- Web client only; the SAD specifies React Native + web.
- Notification provider mocked or in-app; receipts on local disk instead of AWS S3.
- NF-002 and NF-005 documented, not load-verified.
- Stretch stories F-042 and F-051 may slip.
