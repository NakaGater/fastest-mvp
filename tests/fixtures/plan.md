# Implementation Plan — demo

Total tasks: 3

### Task 1: Set up database schema

**Files**
- `src/schema.ts` (create)

**Behavior**
Define `users` and `notes` tables with the expected shape.

**Depends on**
- none

**Verify**
- `npm run typecheck`

### Task 2: Add user repository

**Files**
- `src/user-repo.ts` (create)
- `tests/user-repo.test.ts` (create)

**Behavior**
CRUD functions for users; returns null for missing lookups.

**Depends on**
- Task 1

**Verify**
- `npm test -- user-repo.test.ts`

### Task 3: Add note repository

**Files**
- `src/note-repo.ts` (create)
- `tests/note-repo.test.ts` (create)

**Behavior**
CRUD functions for notes; scoped to the owning user.

**Depends on**
- Task 1

**Verify**
- `npm test -- note-repo.test.ts`
