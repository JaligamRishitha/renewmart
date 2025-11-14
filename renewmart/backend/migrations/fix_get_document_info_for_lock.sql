-- Fix: Update get_document_info_for_lock function to cast columns to TEXT
-- This fixes the datatype mismatch error where character varying(50) doesn't match TEXT

CREATE OR REPLACE FUNCTION public.get_document_info_for_lock(p_document_id UUID)
RETURNS TABLE (
    document_id UUID,
    land_id UUID,
    land_title TEXT,
    document_type TEXT,
    version_number INTEGER,
    version_status TEXT,
    review_locked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.document_id,
        l.land_id,
        l.title::TEXT as land_title,
        d.document_type::TEXT,
        d.version_number,
        d.version_status::TEXT,
        d.review_locked_at
    FROM documents d
    LEFT JOIN lands l ON d.land_id = l.land_id
    WHERE d.document_id = p_document_id;
END;
$$;

