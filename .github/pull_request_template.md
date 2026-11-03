## Summary

This PR fixes a security flaw in the notification endpoints by enforcing authentication and requiring ownership checks before a user can read or create notifications for another account. It protects the reset-password notification flow from unauthorized cross-user access and restores the expected backend auth contract for protected routes. This change is limited to notification authorization hardening and the corresponding regression coverage; it does not implement the admin-category feature described in Issue #29 / F-013.

## Story / Requirement

- Story ID: Notification access hardening / auth regression fix
- Owner: TBD
- Independent tester: Pending
- Req ID(s): This PR is not a full implementation of Issue #29 / F-013; it addresses the notification authorization regression and related security checks.
- Sprint: S2-04
- Dependencies: Existing auth/RBAC contract, notification service, admin category API

## Implementation Notes

- Added authentication enforcement to all notification endpoints.
- Restricted access so authenticated users can only access notifications for their own user ID, unless they are an admin.
- Updated route expectations in the scaffold test to reflect the secure authenticated behavior.
- Kept the change scoped to notification/auth hardening and regression coverage.
- This PR does not implement the admin-category management functionality described by Issue #29 / F-013. If the branch is intended to satisfy that issue, the requirement reference and implementation scope must be corrected or a separate PR must be created for the admin-category work.

## Testing

- `cd backend; npm test -- --runTestsByPath tests/integration/notifications.test.js`
- `cd backend; npm test -- --runTestsByPath tests/integration/scaffold.test.js`
- `cd backend; npm test -- --runTestsByPath tests/integration/auth/passwordReset.test.js`

## TC IDs

- TC-Auth-02
- TC-Notif-01
- TC-RBAC-01 to TC-RBAC-13

## Verification

- CI status: Local targeted validation passes; GitHub Actions not yet green for the PR branch
- Verified by: Local backend Jest validation
- Review status: In progress; independent verification not yet completed

## RTM Status

- RTM updated only for the notification authorization/security fix covered by this branch.
- Issue #29 / F-013 is not fully satisfied by this PR as written, because the admin-category implementation is not included here.

## Checklist

- [x] Implemented per SRS v4.0 and SAD v1.1
- [x] Unit and integration tests written and passing
- [x] PR raised from the owner’s own branch
- [ ] Reviewed and approved
- [ ] CI green
- [ ] Independent verification completed
- [x] RTM updated
