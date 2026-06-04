-- Fix overageMarkupPct precision: DECIMAL(5,4) max=9.9999 is too small for whole-percent values
-- (e.g. 20 for 20% markup). Change to DECIMAL(5,2) which supports 0-999.99%.
ALTER TABLE "Subscription" ALTER COLUMN "overageMarkupPct" TYPE DECIMAL(5,2);
