-- One ACTIVE session per table (prevents duplicate sessions from concurrent creates)
CREATE UNIQUE INDEX IF NOT EXISTS "TableSession_one_active_per_table_idx"
  ON "TableSession" ("tableId")
  WHERE status = 'ACTIVE';
