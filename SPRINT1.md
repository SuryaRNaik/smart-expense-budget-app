# Sprint 1 Plan — Smart Expense and Budget Management Application (SEBM)

This document is the single source of truth for Sprint 1 scope, ownership, and process. It is referenced against the approved SRS v3.0, Software Test Plan v1.0, and Software Architecture & Design (SAD) v1.0 in `docs/`.

## Sprint Goal

Deliver a working, tested, CI-verified backend slice for each module's core requirements, with Git/GitHub activity showing continuous, individually attributable progress across the sprint.

## Module Assignments & Scope

| Member | Module | Sprint 1 Core (must finish) | Stretch (if time allows) |
|---|---|---|---|
| Suryatej Vojjala (PES2UG24CS541) | Auth Service | SEBM-F-001 (Registration), SEBM-F-002 (Login + session), SEBM-SR-002 (bcrypt/Argon2 hashing) | SEBM-F-003 (password reset), SEBM-SR-004 (session timeout) |
| Taran S (PES2UG24CS555) | Transaction + Account Service | SEBM-F-030 (create/list accounts), SEBM-F-010 (add transaction + balance update), SEBM-F-011 (edit/delete transaction) | SEBM-F-012 (receipt attach), SEBM-F-031 (transfers) |
| Sujay P Nayak (PES2UG24CS533) | Budget + Report Service | SEBM-F-020 (create budget), SEBM-F-021 (track spend vs budget) | SEBM-F-040 (basic report endpoint), SEBM-F-022 (threshold warning logic) |
| Surya Raju Naik (PES2UG24CS540) | Notifications/Security/NFRs + CI/CD ownership | SEBM-SR-001 (TLS/HTTPS config), SEBM-SR-005 (RBAC skeleton), CI/CD pipeline setup | SEBM-F-050 (notification service skeleton, provider can be mocked) |

Rationale: each member owns one independent vertical slice to avoid cross-blocking in week one. Account Service sits with Taran since Transaction Service depends on it directly per the SAD component diagram.

## Branching

- One branch per module: `feature/auth-service`, `feature/transaction-service`, `feature/account-service`, `feature/budget-report-service`, `feature/notification-security`.
- No direct commits to `main`. All work merges via Pull Request.
- `main` is protected: PR required, CI must pass before merge.

## Commit Convention

```
feat(module): short description (#issueNumber)
test(module): short description (#issueNumber)
fix(module): short description (#issueNumber)
```
Every commit references the GitHub Issue for the requirement it addresses.

## Definition of Done

A feature is not "done" until all of the following are true:

- [ ] Code implements the requirement, tied to its SEBM-F/NF/SR Req ID
- [ ] Unit test(s) written and passing
- [ ] Integration test(s) written and passing, where the feature touches another module (e.g. transaction → account balance)
- [ ] CI pipeline green on the PR
- [ ] PR reviewed/approved by at least one teammate
- [ ] RTM / GitHub Issue status updated

## Testing

- Stack: Jest (unit) + Supertest (integration, against actual Express routes and a test database).
- Structure: `backend/tests/unit/` and `backend/tests/integration/`, mirroring `backend/src/` module folders.
- Every function/endpoint needs normal-case AND boundary/error-case coverage.
- Test names reference the Test Plan's TC IDs (e.g. TC-Reg-01, TC-Exp-01) so there is a direct trace from SRS → Test Plan → code.

## CI/CD

- GitHub Actions workflow: `.github/workflows/ci.yml`.
- Runs `npm ci && npm test` on every push to any `feature/**` branch and every PR into `main`.
- A red build must be fixed before further commits are pushed on top of it.
- Owned by Surya Raju Naik; committed early in the sprint, not at the end.

## Project Tracking

- One GitHub Issue per Req ID (e.g. "SEBM-F-010: Add expense/income transaction"), labeled by module and type (`feature`, `test`, `ci`), assigned to the owning member.
- GitHub Projects board: To Do → In Progress → In Review → Done.
- Commits and PRs reference their Issue number so history and tracker stay in sync.
- Team check-in every 2–3 days — progress must be continuous across the sprint, not concentrated at the end.

## Demo Checklist (Sprint Review)

- [ ] Each core feature demonstrated live (e.g. via Postman) against `main`
- [ ] Unit + integration test files and a coverage report
- [ ] GitHub Insights/contributors graph showing individual contributions
- [ ] GitHub Actions tab showing CI history, not just one last-minute green run
- [ ] RTM updated to reflect Sprint 1 status per Req ID
