-- The site's own visitor counting, in place of Google Analytics (removed with
-- Google Tag Manager). Only ADDS one table; nothing that already exists is
-- changed or removed. Safe to run more than once:
--
--   mysql <database> < database/visits.sql
--
-- Until this has been run, visits simply aren't counted and the admin's
-- Visitors page says it's waiting on this; nothing else is affected.
--
-- One row per address seen on a visit (actions/visit.php). What is NOT here,
-- on purpose: no IP address, no browser details, no cookie or ID from the
-- visitor's browser. "visitor" tells one day's visitors apart without saying
-- who they are: a one-way hash made with a secret that is replaced every day
-- and then thrown away, so it can't be matched to anything, even the same
-- person the next day. Times are the server's local time.

CREATE TABLE IF NOT EXISTS siteVisits (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  visitedAt  DATETIME    NOT NULL,
  day        DATE        NOT NULL,
  path       VARCHAR(120) NOT NULL,                 -- "/about", "/work/12", "/shop/3" (never a query string)
  referrer   VARCHAR(120) NOT NULL DEFAULT '',      -- the other website's name only ("instagram.com"), first page of a visit
  device     VARCHAR(10)  NOT NULL DEFAULT '',      -- 'phone' | 'tablet' | 'computer'
  visitor    CHAR(16)     NOT NULL,
  PRIMARY KEY (id),
  KEY siteVisits_day (day),
  KEY siteVisits_day_path (day, path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
