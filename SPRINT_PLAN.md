# SEBM Sprint Plan (Dry Run + Sprint 1 + Sprint 2)

Supersedes `SPRINT1.md`. Source of truth for scope, ownership, estimates and process. Requirement IDs refer to SRS v4.0; design references to SAD v1.1; test case IDs to Test Plan v1.1.

## 1. Calendar

| Period | Dates | Purpose |
|---|---|---|
| Backlog creation | by Mon 12 Oct | Project created and linked, FR/NFR backlog written, points assigned, stories assigned |
| Dry run | 12-16 Oct | Foundation work + practice of the full PR / review / merge / CI cycle |
| Backlog refinement | Mon 19 Oct (morning) | Last day entries may change; Sprint 1 planning |
| **Sprint 1** | 19-23 Oct | Working end-to-end core flow; 1-minute demo video uploaded to the repo |
| **Sprint 2** | 26-30 Oct | Remaining features, NFR verification, documentation, 2-minute demo video, **freeze** |

## 2. Roles

| Member | Role | Owns |
|---|---|---|
| **Taran S** | Scrum Master, Team Lead, repo owner (reviews and merges all PRs), QA Lead | Accounts + Transactions modules, frontend shell, documentation and deviation log |
| **Suryatej Vojjala** | Auth and Security Developer | Auth Service (F-001/002/003), session and RBAC (SR-004/005), local dev setup, admin category management |
| **Sujay P Nayak** | Budget and Reports Developer, RTM owner | Budget Service (F-020/021/022), Report Service (F-040/041/042), test harness, keeps RTM status current |
| **Surya Raju Naik** | DevOps and Notifications Developer | DB schema/migrations, backend scaffold, CI/CD, TLS, Notification Service (F-050/051), receipts (F-012), NFR verification, demo integration tests |

Every member owns their module end to end (API, tests, and the UI screens for it) so that each person's contribution is visible in commits and PRs.

## 3. Working agreements

- **One issue = one branch = one PR.** Branch name: `feature/<issue-number>-<short-name>` (e.g. `feature/14-add-transaction`), cut from `main`.
- **Assignee raises the PR**, with `Closes #<issue>` in the description and the TC IDs tested. **Repo owner (Taran) reviews and merges.** No direct commits to `main`.
- **CI must be green** before merge. A red build is fixed before anything else is merged.
- **Commit format:** `feat(module): description (#issue)` / `test(...)` / `fix(...)` / `docs(...)`.
- **Definition of Done:** implemented per SRS/SAD, unit + integration tests passing, PR reviewed, CI green, RTM status updated, issue moved to Done.
- **Scrum events:** daily 10-minute stand-up (what I did, what I will do, blockers); Sprint Planning (Mon 19 and Mon 26 Oct); Sprint Review/demo (Fri 23 and Fri 30 Oct); short retro after each review.
- **Dependency rule:** Auth middleware stub lands in the dry run so nobody is blocked; Accounts before Transactions; Transactions before Budget tracking and Reports (use seed data until merged).
- **Deviations:** anything that differs from the submitted SRS/SAD/Test Plan is logged in `docs/DEVIATIONS.md` the moment it is decided, to be explained in the final demo.

## 4. Backlog

Points use the Fibonacci scale (1, 2, 3, 5, 8). Capacity is an estimate to be re-checked after the dry run.

### Dry run (12-16 Oct) - 25 pts

| ID | Story | Req | Owner | Pts |
|---|---|---|---|---|
| D-01 | Create GitHub Project, labels, issue/PR templates; write and estimate backlog | - | Taran | 3 |
| D-02 | Backend scaffold per SAD (Express, PostgreSQL connection, env config, health endpoint, module folders) | - | Surya Raju | 3 |
| D-03 | DB schema + migrations per ER diagram, seed predefined categories | - | Surya Raju | 5 |
| D-04 | GitHub Actions CI: install, build, test on every push and PR | - | Surya Raju | 3 |
| D-05 | Frontend shell: React app, routing, API client, layout | - | Taran | 3 |
| D-06 | Auth middleware stub (verify JWT, set `req.user`) so other modules are unblocked | F-002 | Suryatej | 3 |
| D-07 | Test harness: Jest + Supertest + test database config | - | Sujay | 3 |
| D-08 | README dev setup + docker-compose for PostgreSQL | - | Suryatej | 2 |

Dry-run exit check: every member has raised at least one PR, had it reviewed and merged by Taran, and seen CI run on it.

### Sprint 1 (19-23 Oct) - 42 pts

Goal: a working core flow - register, log in, create an account, add a transaction, set a budget, see spending against it, and see a notification record.

| ID | Story | Req | Owner | Pts | Priority |
|---|---|---|---|---|---|
| S1-01 | Registration with validation and salted hashing (API + UI) | F-001, SR-002 | Suryatej | 5 | High |
| S1-02 | Login, JWT session, session persistence (API + UI) | F-002 | Suryatej | 5 | High |
| S1-03 | Create and list accounts with balances (API + UI) | F-030 | Taran | 3 | High |
| S1-04 | Add expense/income transaction with atomic balance update (API + UI) | F-010 | Taran | 8 | High |
| S1-05 | Create category-wise / overall monthly budget (API + UI) | F-020 | Sujay | 5 | High |
| S1-06 | Budget progress: spent vs limit, updates after transactions (API + UI) | F-021 | Sujay | 5 | High |
| S1-07 | HTTPS/TLS configuration and secure headers | SR-001 | Surya Raju | 2 | High |
| S1-08 | Notification service skeleton: notification records, in-app list, mock provider | F-050 | Surya Raju | 5 | Medium |
| S1-09 | End-to-end integration tests for the core flow + demo script | - | Surya Raju | 3 | High |
| S1-10 | Record and upload the 1-minute Sprint 1 demo video | - | Taran | 1 | High |

Per person: Suryatej 10, Taran 12, Sujay 10, Surya Raju 10.

### Sprint 2 (26-30 Oct) - 63 pts (55 core + 8 stretch)

| ID | Story | Req | Owner | Pts | Priority |
|---|---|---|---|---|---|
| S2-01 | Password reset via time-limited link/OTP | F-003 | Suryatej | 5 | High |
| S2-02 | Automatic session timeout | SR-004 | Suryatej | 3 | Medium |
| S2-03 | RBAC: admin endpoints reject non-admin users | SR-005 | Suryatej | 3 | High |
| S2-04 | Admin: manage predefined categories (minimal) | supports F-013 | Suryatej | 3 | Medium |
| S2-05 | Edit/delete transaction, reversing and reapplying balance | F-011 | Taran | 5 | High |
| S2-06 | Custom categories | F-013 | Taran | 3 | Medium |
| S2-07 | Atomic transfer between accounts | F-031 | Taran | 5 | Medium |
| S2-08 | Threshold and limit-exceeded warnings (triggers F-050) | F-022 | Sujay | 3 | Medium |
| S2-09 | Weekly/monthly report with charts | F-040 | Sujay | 5 | High |
| S2-10 | Export report to PDF/CSV | F-041 | Sujay | 5 | Medium |
| S2-11 | Period-over-period comparison **(stretch)** | F-042 | Sujay | 3 | Low |
| S2-12 | Receipt photo attach and view | F-012 | Surya Raju | 5 | Medium |
| S2-13 | Bill payment reminders **(stretch)** | F-051 | Surya Raju | 5 | Low |
| S2-14 | NFR verification: response-time check, encryption at rest, accessibility audit; document NF-002 / NF-005 | NF-001, NF-003/SR-003, NF-004, NF-002, NF-005 | Surya Raju | 5 | High |
| S2-15 | Update SRS/SAD/Test Plan, finalize `docs/DEVIATIONS.md`, set RTM statuses | - | Taran | 3 | High |
| S2-16 | Record and upload 2-minute demo video; tag release and freeze development | - | Surya Raju | 2 | High |

Per person: Suryatej 14, Taran 16, Sujay 16 (13 core), Surya Raju 17 (12 core).

### Coverage check

All 27 requirement IDs are scheduled: F-001/002/010/020/021/030/050 and SR-001/002 in Sprint 1; the rest in Sprint 2. NF-002 (availability) and NF-005 (10,000 users) cannot be genuinely verified in a one-week student project; S2-14 documents the design basis and the limitation.

## 5. Deviation candidates (decide, then log)

- Web client only; the SAD specifies React Native + web.
- Notification provider mocked or logged rather than real push/email/SMS.
- Receipts stored on local disk or a stub instead of AWS S3 / Firebase.
- NF-002 and NF-005 documented, not load-verified.
- Any stretch story (F-042, F-051) not completed.
