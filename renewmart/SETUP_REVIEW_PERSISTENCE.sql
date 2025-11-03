-- =====================================================
-- QUICK SETUP: Review Status Persistence
-- =====================================================
-- This script creates the land_reviews table for 
-- persisting review approvals across page refreshes
-- 
-- Run this from the project root:
-- psql -U postgres -d renew -f renewmart/SETUP_REVIEW_PERSISTENCE.sql
-- =====================================================

\echo ''
\echo '======================================='
\echo '  Setting up Review Status Persistence'
\echo '======================================='
\echo ''

-- Create land_reviews table
CREATE TABLE IF NOT EXISTS land_reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    land_id UUID NOT NULL REFERENCES lands(land_id) ON DELETE CASCADE,
    reviewer_role VARCHAR(50) NOT NULL,
    reviewer_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    reviewer_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    justification TEXT,
    subtasks_completed INTEGER DEFAULT 0,
    total_subtasks INTEGER DEFAULT 0,
    documents_approved INTEGER DEFAULT 0,
    total_documents INTEGER DEFAULT 0,
    review_data JSONB,
    approved_at TIMESTAMP WITH TIME ZONE,
    published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(land_id, reviewer_role)
);

\echo '✓ Created land_reviews table'

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_land_reviews_land_id ON land_reviews(land_id);
CREATE INDEX IF NOT EXISTS idx_land_reviews_reviewer_role ON land_reviews(reviewer_role);
CREATE INDEX IF NOT EXISTS idx_land_reviews_reviewer_id ON land_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_land_reviews_status ON land_reviews(status);
CREATE INDEX IF NOT EXISTS idx_land_reviews_published ON land_reviews(published);

\echo '✓ Created indexes for performance'

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_land_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_land_reviews_updated_at ON land_reviews;
CREATE TRIGGER trg_update_land_reviews_updated_at
    BEFORE UPDATE ON land_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_land_reviews_updated_at();

\echo '✓ Created updated_at trigger'

-- Add comments
COMMENT ON TABLE land_reviews IS 'Stores review approvals and status for each role for each land project';
COMMENT ON COLUMN land_reviews.reviewer_role IS 'Role: re_sales_advisor, re_analyst, re_governance_lead';
COMMENT ON COLUMN land_reviews.status IS 'Review status: pending, approved, rejected';
COMMENT ON COLUMN land_reviews.published IS 'Whether this role review has been published';

\echo '✓ Added table comments'
\echo ''
\echo '======================================='
\echo '  ✅ Setup Complete!'
\echo '======================================='
\echo ''
\echo 'Review statuses will now persist across page refreshes.'
\echo ''
\echo 'Verify the table:'
\echo '  \d land_reviews'
\echo ''
\echo 'View all reviews:'
\echo '  SELECT * FROM land_reviews;'
\echo ''

