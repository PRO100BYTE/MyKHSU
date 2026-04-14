# CLAUDE.md

## Operating Guidelines for Claude-like Agents
This repository contains an Expo-based React Native app. Keep all edits focused, safe, and easy to review.

Primary objective: deliver user-visible improvements with minimal risk, preserve existing behavior unless explicitly requested, and keep diffs small and maintainable.

## Project Snapshot
- Platform: React Native 0.81 + Expo 54.
- Entry files: App.js, index.js.
- UI components: components/.
- Domain/business helpers: utils/.
- Reusable logic: hooks/.

Critical user-facing flows:
- schedule browsing and filters,
- navigation between key screens,
- settings persistence,
- network-backed content loading with graceful fallback.

## How to Approach Tasks
- Start from user impact: what screen/flow changes for a real user.
- Read related files before editing to avoid hidden coupling.
- Prefer small, incremental diffs over broad rewrites.
- Preserve naming, style, and existing structure unless requested otherwise.

Execution sequence:
1. Identify the exact user-visible behavior to change.
2. Locate the narrowest safe edit point.
3. Confirm dependencies and affected imports/exports.
4. Implement atomically with explicit error handling.
5. Perform minimal validation and manual sanity checks.
6. Report what changed, why, and what to verify.

## Coding Rules
- Keep components focused on rendering and interaction.
- Keep side effects and asynchronous logic controlled and error-safe.
- Reuse existing utility helpers when possible.
- Introduce new constants in a centralized place when reused.
- Avoid introducing global mutable state unless already established.

Additional coding constraints:
- Avoid deep conditional nesting; prefer early returns.
- Avoid magic literals repeated across files.
- Keep helper functions pure when possible.
- Do not move large blocks of code across files unless the task explicitly requires refactoring.

## Reliability and Error Handling
- Network code should fail gracefully with clear fallback behavior.
- Storage-related changes must remain backward-compatible.
- Notification and background-task changes should be conservative and platform-aware.
- Never assume optional data exists; guard against null/undefined values.

Required safeguards:
- Every new async branch must include a predictable error path.
- Loading, empty, and error UI states must stay coherent.
- Any behavior that depends on remote data must remain stable in offline conditions.

## Asset and UI Safety
- Do not overwrite branding assets unless explicitly asked.
- Respect existing icon/theme variants and folder conventions.
- Keep visual changes consistent with current app style.

When touching assets:
- Keep file naming clear and deterministic.
- Keep path conventions unchanged.
- Ensure existing references are not broken.

## Verification Checklist
- App can start with npm run start.
- No obvious syntax/import errors in touched files.
- Changed flow is manually sanity-checked.
- Response includes: changed files, behavior impact, residual risks.

Extended verification guidance:
- If schedule logic changed: verify day/week mode switches and selected group/course behavior.
- If settings changed: verify values persist after app restart.
- If network/cache changed: verify behavior with network on/off.
- If notifications changed: verify no duplicate scheduling and safe fallback on permission issues.

## Out-of-Scope Unless Requested
- Renaming files or public exports.
- Introducing new heavy dependencies.
- Reformatting unrelated files.
- Broad architecture rewrites.

## Preferred Final Response Style
- Brief summary first.
- Then explicit file list.
- Then manual test recommendations.

Recommended completion note should also include:
- why the selected approach is safest for current architecture,
- what residual risks remain,
- what exact manual steps should be run by a reviewer.
