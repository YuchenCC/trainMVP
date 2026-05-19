# Handoff Document

## Purpose
This handoff summarizes the fixes and enhancements made to the schedule status management feature, including:
1. Fixed: Schedule lockdown not updating status
2. Added: Requirement sub-status sync on schedule lockdown
3. Added: Requirement status sync on schedule release
4. Fixed: Date replacement logic for lockdown/release operations

## Completed Work

### 1. Frontend Fix (`schedules/index.tsx`)
- **Fixed `handleLockdown` function**: Changed from calling PUT `/trains/{trainId}/schedules/{scheduleId}` (only updating date) to calling POST `/trains/{trainId}/schedules/{scheduleId}/status` (proper status change)
- Location: `apps/web/src/pages/trains/schedules/index.tsx:428`

### 2. Backend Enhancements (`train.service.ts`)
- **Added requirement sub-status sync on lockdown**: When schedule status changes to `LOCKED_DOWN`, all onboarded requirements' `subStatus` are updated to `FROZEN`
- **Added requirement status sync on release**: When schedule status changes to `RELEASED`, all onboarded requirements' `status` are updated to `RELEASED`
- **Fixed date replacement logic**: Lockdown and release now always replace the corresponding date (`lockdownDate`, `releaseDate`) instead of only setting when empty
- **Transaction wrapping**: All status-related updates are now wrapped in a database transaction for consistency
- Location: `apps/server/src/modules/trains/services/train.service.ts:1106-1169`

### 3. Status Change Flow Summary

| Schedule Action | Schedule Status Change | Date Update | Requirement Update |
|----------------|-----------------------|-------------|-------------------|
| 封板 | `IN_PROGRESS` → `LOCKED_DOWN` | Set `lockdownDate` to now | `subStatus` → `FROZEN` |
| 投产 | `LOCKED_DOWN` → `RELEASED` | Set `releaseDate` to now | `status` → `RELEASED` |

## Key Decisions
- **Transaction safety**: All related updates (schedule status, dates, requirements) are executed in a single transaction to ensure data consistency
- **Date behavior**: Lockdown/release dates are always set to current time when the action is performed
- **Requirement filtering**: Only requirements with `status: 'ONBOARDED'` are affected by these sync operations

## Relevant Artifacts
- **Frontend Schedule Page**: `apps/web/src/pages/trains/schedules/index.tsx`
- **Backend Service**: `apps/server/src/modules/trains/services/train.service.ts`
- **Backend Routes**: `apps/server/src/modules/trains/routes/schedule.ts`
- **Shared Constants**: `packages/shared/src/constants/index.ts` (ReqSubStatus enum)

## Suggested Skills for Next Session
- `webapp-testing`: To verify the status change flow
- `tdd`: If additional unit tests are needed for the new sync logic
- `diagnose`: If any issues are discovered with the status synchronization

## Context
The release train management system now properly handles schedule status changes:
- Lockdown properly updates both schedule status and requirement sub-statuses
- Release properly updates both schedule status and requirement statuses
- Dates are always synchronized with the actual action time
- All updates are transaction-safe