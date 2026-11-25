-- Lets each project keep its own order of works.
--
-- Only ADDS one empty column; nothing that already exists is changed or
-- removed. Run it once:
--
--   mysql <database> < database/projectWorkOrder.sql
--
-- (Running it a second time stops with "Duplicate column name 'sortOrder'",
-- which is harmless: the column is already there.)
--
-- Until it has been run, works inside a project keep following each
-- painting's own "Display order", and the Projects admin page says that
-- arranging works is waiting on this. Once it has run, every project still
-- shows its works exactly as before (an empty sortOrder falls back to the
-- old order) until Ambar arranges that project.

ALTER TABLE worksInProjects
  ADD COLUMN sortOrder INT DEFAULT NULL AFTER projectId;
