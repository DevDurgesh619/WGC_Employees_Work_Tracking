-- DATA_MODEL.md invariants that Prisma can't express in schema.prisma:
--   work_logs:    a row must reference a task OR carry a free-text title
--   time_entries: at most one running timer per user (ended_at IS NULL)

ALTER TABLE "work_logs"
  ADD CONSTRAINT "work_logs_task_or_freetext_chk"
  CHECK ("task_id" IS NOT NULL OR "free_text_task" IS NOT NULL);

CREATE UNIQUE INDEX "time_entries_active_per_user_uniq"
  ON "time_entries" ("user_id")
  WHERE "ended_at" IS NULL;
