# Independent Tests

This directory is designated for independent black-box verification test suites created by team members cross-testing other members' modules according to the project's cross-testing rotation (SPRINT_PLAN.md Section 6.1):
- Dev A tests Auth (Dev B)
- Dev B tests Budgets & Reports (Dev C)
- Dev C tests Notifications & Security/NFRs (Dev D)
- Dev D tests Accounts & Transactions (Dev A)

Per working agreements, independent testers create their black-box test cases on separate `test/<module>/<issue-number>-<short-name>` branches and run them against `backend/tests/independent/<module>/`.
