-- Just enough rows for the smoke test to have something to read. Loaded into
-- a throwaway CI database, never anywhere else.
--
-- The point is coverage of the shapes the real queries join across: a visible
-- work inside an active project, a hidden work that must stay hidden, a nav
-- link, the About row, and a live shop product with a variant and a zone.

INSERT INTO allWorks
  (fileLocation, name, desc2, desc3, medium, year, visible, orderOfDisplay, carousel, isSelectWork, isAvailable)
VALUES
  ('fixture-one.jpg',   'Fixture One',   'acrylic on paper', '50 x 64 cm', 'Fixed Motion', 2024, 1, 1, 1, 1, 1),
  ('fixture-two.jpg',   'Fixture Two',   'tape on canvas',   '30 x 40 cm', 'Fixed Motion', 2025, 1, 2, 0, 0, 1),
  ('fixture-hidden.jpg','Fixture Hidden','should not appear', '10 x 10 cm', 'Fixed Motion', 2023, 0, 3, 0, 0, 0);

INSERT INTO projects (active, description, title, orderOfDisplay, deleted, isCurrentProject)
VALUES (1, 'A project for the smoke test.', 'Fixture Project', 1, 0, 1);

INSERT INTO worksInProjects (workId, projectId)
SELECT w.workId, p.id FROM allWorks w, projects p
WHERE w.name IN ('Fixture One', 'Fixture Two') AND p.title = 'Fixture Project';

INSERT INTO navLinks (displayedText, linkRedirection, displayedOrder, isChangeable, onclick, isNewTab, visible)
VALUES ('Works', '/select-works', 1, 0, 'getProjectsAndWorks', 0, 1),
       ('About',  '/about',        2, 0, 'openInfo',            0, 1);

INSERT INTO aboutMe (description, pictureLocation)
VALUES ('<p>About text for the smoke test. Write to hello@example.com.</p>', 'fixture-about.jpg');

INSERT INTO shopShippingZones (name, countries, priceStandardCents, priceLargeCents, sortOrder)
VALUES ('Fixture zone', 'FR,BE,DE', 800, 2500, 1);

INSERT INTO shopProducts (name, typeLabel, isUnique, details, description, shippingClass, status, sortOrder, createdAt, updatedAt)
VALUES ('Fixture Print', 'Print', 0, 'giclee | A3 | 2024', 'A print for the smoke test.', 'standard', 'live', 1, NOW(), NOW());

INSERT INTO shopVariants (productId, label, priceCents, stock, sortOrder, active)
SELECT id, 'A3', 4500, 5, 1, 1 FROM shopProducts WHERE name = 'Fixture Print';

INSERT INTO shopSettings (name, value) VALUES ('currency', 'EUR'), ('paused', '0');
