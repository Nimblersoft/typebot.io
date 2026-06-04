-- Add optional payment link column to Invoice for DeUna payment link storage
ALTER TABLE "Invoice" ADD COLUMN "paymentLink" TEXT;
