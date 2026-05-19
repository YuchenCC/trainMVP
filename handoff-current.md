# Handoff Document

## Purpose
This handoff summarizes the implementation of "班次封板后不允许再纳版，除非是经过紧急变更的需求" (Lockdown onboarding restriction - only emergency-approved requirements can be onboarded after schedule lockdown).

## Completed Work

### 1. Backend Changes (`train.service.ts`)
- **onboardRequirements**: Added lockdown validation - checks if schedule status is LOCKED_DOWN, and if so, only allows requirements with approved EmergencyChange records
- **precheckOnboard**: Added `blockedByLockdown` flag and `lockdownBlockedCount` summary field

### 2. Shared Type Updates (`train.ts`)
- `PrecheckOnboardResultItem`: Added `blockedByLockdown?: boolean`
- `PrecheckOnboardResponse.summary`: Added `lockdownBlockedCount?` and `isLockedDown?`

### 3. Frontend Changes (`schedule-detail.tsx`)
- Added `status` field to `ScheduleDetail` interface
- `OnboardTab`: Added `scheduleStatus` prop and `isLockedDown` check
- Added warning Alert for locked-down schedules
- Updated precheck modal to show lockdown block warnings

### 4. Verification
- ✅ All 229 unit tests passed
- ✅ TypeScript compilation successful

## Pending Tasks
- [None] - Current feature is complete and tested

## Key Decisions
- Lockdown check uses `EmergencyChange.status === 'APPROVED'` as gate
- Non-emergency requirements are silently skipped during onboarding (consistent with existing behavior for non-READY requirements)
- Frontend shows clear warnings but allows user to proceed (backend enforces the restriction)

## Relevant Artifacts
- **Project Spec**: `/Users/laiyang/Library/Application Support/TRAE SOLO CN/ModularData/ai-agent/work-mode-projects/69fab7e1a29c125df6f0f954/AGENTS.md`
- **Backend Service**: `apps/server/src/modules/trains/services/train.service.ts`
- **Frontend Page**: `apps/web/src/pages/trains/schedule-detail.tsx`
- **Shared Types**: `packages/shared/src/types/train.ts`
- **Database Schema**: `apps/server/prisma/schema.prisma` (EmergencyChange model)

## Suggested Skills for Next Session
- `frontend-design`: If UI adjustments are needed for the lockdown warning
- `tdd`: If additional unit tests are required
- `diagnose`: If any bugs are discovered in the lockdown logic
- `figma`: If design changes are needed

## Context
The release train management system MVP is in active development. Key features implemented include:
- Train and schedule management
- Requirement onboarding with dependency checks
- Emergency change approval workflow (two-stage: TEST_MGR → PROJECT_MGR)
- Schedule status management (PLANNING/IN_PROGRESS/LOCKED_DOWN/RELEASED)
- Risk prompting with requirement codes and names

Current state: Ready for testing and review.