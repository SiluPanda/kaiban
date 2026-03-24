CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX idx_tasks_title_trgm ON tasks USING gin (title gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX idx_tasks_description_trgm ON tasks USING gin (description gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX idx_comments_body_trgm ON comments USING gin (body gin_trgm_ops);
