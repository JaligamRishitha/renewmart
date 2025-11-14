-- ============================================================================
-- Fix: Resolve ambiguous column reference in get_occupied_document_slots
-- Date: 2025-01-XX
-- Issue: Column reference "doc_slot" is ambiguous (could refer to PL/pgSQL variable or table column)
-- Fix: Qualify all column references with table name
-- ============================================================================

-- Function: Get Occupied Document Slots (Fixed)
CREATE OR REPLACE FUNCTION public.get_occupied_document_slots(
    p_land_id UUID,
    p_document_type TEXT
)
RETURNS TABLE (
    doc_slot TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT documents.doc_slot
    FROM documents
    WHERE documents.land_id = p_land_id 
    AND documents.document_type = p_document_type
    AND documents.subtask_id IS NULL
    AND documents.doc_slot IN ('D1', 'D2');
END;
$$;

