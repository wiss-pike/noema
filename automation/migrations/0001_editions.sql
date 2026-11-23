CREATE TABLE editions (
  date TEXT PRIMARY KEY NOT NULL,
  body TEXT NOT NULL CHECK (json_valid(body))
);
