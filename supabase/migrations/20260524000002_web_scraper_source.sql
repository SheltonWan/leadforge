-- Migration: 20260524000002_web_scraper_source
-- Adds 'web_scraper' as a valid source_type and collection_method value.
-- PostgreSQL CHECK constraints cannot be altered in-place; we drop and recreate them.

ALTER TABLE lead_sources
  DROP CONSTRAINT IF EXISTS lead_sources_source_type_check;

ALTER TABLE lead_sources
  ADD CONSTRAINT lead_sources_source_type_check
  CHECK (source_type IN ('csv_import','manual','public_source','mock_adapter','web_scraper'));

ALTER TABLE lead_sources
  DROP CONSTRAINT IF EXISTS lead_sources_collection_method_check;

ALTER TABLE lead_sources
  ADD CONSTRAINT lead_sources_collection_method_check
  CHECK (collection_method IN ('manual_copy','csv_import','rss','public_api','web_scraper'));
