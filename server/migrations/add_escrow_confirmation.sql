-- Migration: add_escrow_confirmation
-- Adds milestone tracking, consumer confirmation, dispute, and work-phase
-- timestamp columns to the service_requests (jobs) table.

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS milestone1_released BOOLEAN DEFAULT FALSE;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS milestone1_released_at TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS milestone1_release_type VARCHAR(20) DEFAULT NULL;
-- values: 'consumer_confirmed', 'auto_released', 'dispute_resolved'

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS milestone2_released BOOLEAN DEFAULT FALSE;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS milestone2_released_at TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS milestone2_release_type VARCHAR(20) DEFAULT NULL;

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS arrival_confirmed_by_consumer BOOLEAN DEFAULT FALSE;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS arrival_confirmed_at TIMESTAMP;

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS completion_confirmed_by_consumer BOOLEAN DEFAULT FALSE;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS completion_confirmed_at TIMESTAMP;

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS disputed BOOLEAN DEFAULT FALSE;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS dispute_reason TEXT DEFAULT NULL;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS dispute_raised_at TIMESTAMP;
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS dispute_raised_by VARCHAR(10) DEFAULT NULL;
-- values: 'consumer', 'expert'

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS work_done_at TIMESTAMP;
