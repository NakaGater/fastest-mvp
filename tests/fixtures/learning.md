---
title: "Prisma relation defaults surprise new users"
tags: [tool:prisma, framework:nextjs, area:db]
scope: project
confidence: high
created_at: 2026-04-01
last_seen: 2026-04-15
hits: 2
---

# Prisma relation defaults surprise new users

## Situation
Setting up a Prisma schema with a required relation and expecting it
to cascade on delete.

## What we learned
Prisma defaults the referential action to `NoAction`. You must set
`onDelete: Cascade` explicitly in the relation decorator to get cascade
behavior — the migration silently succeeds without it.

## What to do next time
When adding a required relation, set `onDelete` and `onUpdate` on the
relation decorator. Add a regression test that deletes a parent row and
asserts children are gone.
