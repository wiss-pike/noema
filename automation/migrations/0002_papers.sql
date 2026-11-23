CREATE TABLE weekly_papers (
  week TEXT PRIMARY KEY,
  source_id TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL
);
