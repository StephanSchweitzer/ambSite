-- The shop's tables. Only ever ADDS tables: nothing that already exists is
-- changed or removed (the old Shopify-embed table, shopItems, is left alone).
-- Safe to run more than once.
--
--   mysql <database> < database/shop.sql
--
-- Until this has been run, the shop pages say the shop is opening soon and
-- the shop admin page explains what is missing; nothing else is affected.

-- Something for sale. Times are stored in UTC.
CREATE TABLE IF NOT EXISTS shopProducts (
  id            INT NOT NULL AUTO_INCREMENT,
  name          VARCHAR(255) NOT NULL,
  typeLabel     VARCHAR(60)  NOT NULL DEFAULT '',          -- "Original", "Print", "Zine"...
  isUnique      TINYINT      NOT NULL DEFAULT 0,           -- one of a kind: one price, one in stock
  details       VARCHAR(500) NOT NULL DEFAULT '',          -- "acrylic, tape on paper | 50 x 65 cm | 2024"
  description   TEXT,
  workId        INT          DEFAULT NULL,                 -- the portfolio work it is (or is a print of)
  saleMode      VARCHAR(10)  NOT NULL DEFAULT 'buy',       -- 'buy' | 'enquire'
  shippingClass VARCHAR(10)  NOT NULL DEFAULT 'standard',  -- 'standard' | 'large'
  status        VARCHAR(10)  NOT NULL DEFAULT 'draft',     -- 'draft' | 'live' | 'archived'
  sortOrder     INT          NOT NULL DEFAULT 0,
  createdAt     DATETIME     NOT NULL,
  updatedAt     DATETIME     NOT NULL,
  PRIMARY KEY (id),
  KEY shopProducts_status (status, sortOrder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Its pictures: file names in baseImages/, so the site's usual web-sized,
-- thumbnail and zoom copies all work for them.
CREATE TABLE IF NOT EXISTS shopProductImages (
  id           INT NOT NULL AUTO_INCREMENT,
  productId    INT NOT NULL,
  fileLocation VARCHAR(255) NOT NULL,
  sortOrder    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY shopProductImages_product (productId, sortOrder),
  KEY shopProductImages_file (fileLocation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- What can actually be bought: every product has at least one (a print's
-- sizes, or the single price of an original). stock NULL = no limit.
CREATE TABLE IF NOT EXISTS shopVariants (
  id         INT NOT NULL AUTO_INCREMENT,
  productId  INT NOT NULL,
  label      VARCHAR(120) NOT NULL DEFAULT '',
  priceCents INT NOT NULL,
  stock      INT DEFAULT NULL,
  sortOrder  INT NOT NULL DEFAULT 0,
  active     TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY shopVariants_product (productId, active, sortOrder)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Where things are sent and what delivery costs there. countries is a list
-- of two-letter codes ("BE,NL,LU"), or "*" for everywhere not listed in
-- another row.
CREATE TABLE IF NOT EXISTS shopShippingZones (
  id                 INT NOT NULL AUTO_INCREMENT,
  name               VARCHAR(120) NOT NULL,
  countries          TEXT NOT NULL,
  priceStandardCents INT NOT NULL DEFAULT 0,
  priceLargeCents    INT NOT NULL DEFAULT 0,
  sortOrder          INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shopSettings (
  name  VARCHAR(50) NOT NULL,
  value TEXT,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- status: 'pending'    at Stripe's payment page; the stock is held
--         'processing' paid by a slow method (bank debit); money on its way
--         'paid'       to be sent
--         'shipped'
--         'cancelled'  never paid; the stock went back
--         'refunded'
CREATE TABLE IF NOT EXISTS shopOrders (
  id                    INT NOT NULL AUTO_INCREMENT,
  token                 CHAR(32) NOT NULL,                 -- in the customer's confirmation link
  status                VARCHAR(12) NOT NULL DEFAULT 'pending',
  stockHeld             TINYINT NOT NULL DEFAULT 0,        -- 1 while its stock is set aside
  currency              CHAR(3) NOT NULL,
  subtotalCents         INT NOT NULL DEFAULT 0,
  shippingCents         INT NOT NULL DEFAULT 0,
  totalCents            INT NOT NULL DEFAULT 0,
  zoneName              VARCHAR(120) NOT NULL DEFAULT '',
  country               CHAR(2) NOT NULL DEFAULT '',
  stripeSessionId       VARCHAR(255) DEFAULT NULL,
  stripePaymentIntentId VARCHAR(255) DEFAULT NULL,
  liveMode              TINYINT NOT NULL DEFAULT 0,        -- 0 = a Stripe test payment
  customerName          VARCHAR(255) NOT NULL DEFAULT '',
  customerEmail         VARCHAR(255) NOT NULL DEFAULT '',
  customerPhone         VARCHAR(60)  NOT NULL DEFAULT '',
  shipName              VARCHAR(255) NOT NULL DEFAULT '',
  shipLine1             VARCHAR(255) NOT NULL DEFAULT '',
  shipLine2             VARCHAR(255) NOT NULL DEFAULT '',
  shipCity              VARCHAR(255) NOT NULL DEFAULT '',
  shipState             VARCHAR(255) NOT NULL DEFAULT '',
  shipPostalCode        VARCHAR(60)  NOT NULL DEFAULT '',
  shipCountry           CHAR(2) NOT NULL DEFAULT '',
  tracking              VARCHAR(500) NOT NULL DEFAULT '',
  note                  TEXT,
  ipHash                CHAR(32) NOT NULL DEFAULT '',
  createdAt             DATETIME NOT NULL,
  expiresAt             DATETIME NOT NULL,
  paidAt                DATETIME DEFAULT NULL,
  shippedAt             DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY shopOrders_token (token),
  KEY shopOrders_status (status, createdAt),
  KEY shopOrders_session (stripeSessionId),
  KEY shopOrders_intent (stripePaymentIntentId),
  KEY shopOrders_ip (ipHash, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- A copy of what was bought, as it was at the time: later edits to the
-- product never change an order.
CREATE TABLE IF NOT EXISTS shopOrderItems (
  id             INT NOT NULL AUTO_INCREMENT,
  orderId        INT NOT NULL,
  productId      INT NOT NULL,
  variantId      INT NOT NULL,
  productName    VARCHAR(255) NOT NULL,
  variantLabel   VARCHAR(120) NOT NULL DEFAULT '',
  imageLocation  VARCHAR(255) NOT NULL DEFAULT '',
  unitPriceCents INT NOT NULL,
  quantity       INT NOT NULL,
  PRIMARY KEY (id),
  KEY shopOrderItems_order (orderId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
