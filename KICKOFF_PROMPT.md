# Kickoff Prompt

Paste the block below into your first Claude Code session opened in this directory. It tells Claude how to start building Phase 0 of `ROADMAP.md`.

---

```
Read CLAUDE.md, ROADMAP.md, and FOLDER_STRUCTURE.md in full before doing anything.
Then execute Phase 0 of ROADMAP.md strictly in order.

After each task:
- run `pnpm typecheck && pnpm lint`
- commit with a Conventional Commit message
- tick the checkbox in ROADMAP.md
- report what you did in one sentence before starting the next task

Stop and ask me before:
- adding any dependency not listed in CLAUDE.md
- modifying the Prisma schema beyond what DATA_MODEL.md specifies
- doing anything in the Supabase or Vercel project (those steps are mine)

When all of Phase 0 is checked off, stop and wait for me to verify
before starting Phase 1.
```

---

## After Phase 0 finishes
Use this for Phase 1 (and the same template for later phases — just change the number):

```
Phase 0 is verified. Execute Phase 1 of ROADMAP.md, same rules as before.
Stop and wait for verification when Phase 1 is complete.
```
