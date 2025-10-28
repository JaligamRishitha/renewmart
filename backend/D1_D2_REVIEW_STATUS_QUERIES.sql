-- =====================================================
-- DATABASE QUERIES FOR D1/D2 INDEPENDENT REVIEW STATUS
-- =====================================================

-- 1. GET REVIEW STATUS PER DOCUMENT SLOT
-- =====================================================
-- This query gets the review status for each document slot independently

SELECT 
    d.document_type,
    d.doc_slot,
    COUNT(*) as total_documents,
    COUNT(CASE WHEN d.version_status = 'under_review' OR d.status = 'under_review' THEN 1 END) as under_review_count,
    COUNT(CASE WHEN d.version_status = 'active' AND d.status != 'under_review' THEN 1 END) as active_count,
    CASE 
        WHEN COUNT(CASE WHEN d.version_status = 'under_review' OR d.status = 'under_review' THEN 1 END) > 0 
        THEN 'under_review'
        ELSE 'active'
    END as slot_status
FROM documents d
WHERE d.land_id = 'YOUR_LAND_ID_HERE'
  AND d.document_type IN ('ownership-documents', 'government-nocs')
  AND d.doc_slot IN ('D1', 'D2')
  AND d.subtask_id IS NULL
GROUP BY d.document_type, d.doc_slot
ORDER BY d.document_type, d.doc_slot;

-- =====================================================
-- 2. GET DOCUMENT TYPES WITH SLOT-BASED STATUS
-- =====================================================
-- This query shows document types with their D1/D2 status indicators

WITH slot_status AS (
    SELECT 
        d.document_type,
        d.doc_slot,
        CASE 
            WHEN COUNT(CASE WHEN d.version_status = 'under_review' OR d.status = 'under_review' THEN 1 END) > 0 
            THEN 'under_review'
            ELSE 'active'
        END as slot_status
    FROM documents d
    WHERE d.land_id = 'YOUR_LAND_ID_HERE'
      AND d.document_type IN ('ownership-documents', 'government-nocs')
      AND d.doc_slot IN ('D1', 'D2')
      AND d.subtask_id IS NULL
    GROUP BY d.document_type, d.doc_slot
)
SELECT 
    document_type,
    COUNT(*) as total_slots,
    STRING_AGG(
        CASE 
            WHEN slot_status = 'under_review' THEN doc_slot || ': under review'
            ELSE doc_slot || ': active'
        END, 
        ', '
    ) as slot_statuses,
    CASE 
        WHEN COUNT(CASE WHEN slot_status = 'under_review' THEN 1 END) > 0 
        THEN 'has_review'
        ELSE 'all_active'
    END as overall_status
FROM slot_status
GROUP BY document_type
ORDER BY document_type;

-- =====================================================
-- 3. MARK DOCUMENT FOR REVIEW BY SLOT
-- =====================================================
-- This query marks all documents in a specific slot for review

UPDATE documents 
SET version_status = 'under_review',
    review_locked_at = NOW(),
    review_locked_by = 'YOUR_USER_ID_HERE'
WHERE land_id = 'YOUR_LAND_ID_HERE'
  AND document_type = 'YOUR_DOCUMENT_TYPE_HERE'
  AND doc_slot = 'YOUR_DOC_SLOT_HERE'  -- 'D1' or 'D2'
  AND subtask_id IS NULL;

-- =====================================================
-- 4. UNLOCK DOCUMENT SLOT FROM REVIEW
-- =====================================================
-- This query unlocks all documents in a specific slot from review

UPDATE documents 
SET version_status = 'active',
    review_locked_at = NULL,
    review_locked_by = NULL
WHERE land_id = 'YOUR_LAND_ID_HERE'
  AND document_type = 'YOUR_DOCUMENT_TYPE_HERE'
  AND doc_slot = 'YOUR_DOC_SLOT_HERE'  -- 'D1' or 'D2'
  AND subtask_id IS NULL;

-- =====================================================
-- 5. GET DOCUMENT LIST WITH SLOT STATUS INDICATORS
-- =====================================================
-- This query shows documents with slot-specific status indicators

WITH slot_review_status AS (
    SELECT 
        document_type,
        doc_slot,
        CASE 
            WHEN COUNT(CASE WHEN version_status = 'under_review' OR status = 'under_review' THEN 1 END) > 0 
            THEN 'under_review'
            ELSE 'active'
        END as slot_status
    FROM documents
    WHERE land_id = 'YOUR_LAND_ID_HERE'
      AND document_type IN ('ownership-documents', 'government-nocs')
      AND doc_slot IN ('D1', 'D2')
      AND subtask_id IS NULL
    GROUP BY document_type, doc_slot
)
SELECT 
    d.document_id,
    d.document_type,
    d.doc_slot,
    d.file_name,
    d.version_number,
    d.created_at,
    d.version_status,
    d.status,
    CASE 
        WHEN srs.slot_status = 'under_review' THEN d.doc_slot || ': under review'
        ELSE d.doc_slot || ': active'
    END as slot_status_indicator,
    u.first_name || ' ' || u.last_name as uploader_name
FROM documents d
LEFT JOIN slot_review_status srs ON d.document_type = srs.document_type AND d.doc_slot = srs.doc_slot
LEFT JOIN "user" u ON d.uploaded_by = u.user_id
WHERE d.land_id = 'YOUR_LAND_ID_HERE'
  AND d.document_type IN ('ownership-documents', 'government-nocs')
  AND d.doc_slot IN ('D1', 'D2')
  AND d.subtask_id IS NULL
ORDER BY d.document_type, d.doc_slot, d.version_number DESC;

-- =====================================================
-- 6. CHECK IF DOCUMENT TYPE HAS MULTIPLE SLOTS
-- =====================================================
-- This query checks if a document type should show slot indicators

SELECT 
    document_type,
    COUNT(DISTINCT doc_slot) as slot_count,
    CASE 
        WHEN COUNT(DISTINCT doc_slot) > 1 THEN true
        ELSE false
    END as show_slot_indicators,
    ARRAY_AGG(DISTINCT doc_slot ORDER BY doc_slot) as available_slots
FROM documents
WHERE land_id = 'YOUR_LAND_ID_HERE'
  AND document_type IN ('ownership-documents', 'government-nocs')
  AND doc_slot IN ('D1', 'D2')
  AND subtask_id IS NULL
GROUP BY document_type
ORDER BY document_type;

-- =====================================================
-- 7. GET REVIEW SUMMARY FOR DOCUMENT TYPE
-- =====================================================
-- This query provides a summary for the document list display

WITH slot_summary AS (
    SELECT 
        document_type,
        doc_slot,
        COUNT(*) as total_docs,
        COUNT(CASE WHEN version_status = 'under_review' OR status = 'under_review' THEN 1 END) as under_review_docs,
        CASE 
            WHEN COUNT(CASE WHEN version_status = 'under_review' OR status = 'under_review' THEN 1 END) > 0 
            THEN 'under_review'
            ELSE 'active'
        END as slot_status
    FROM documents
    WHERE land_id = 'YOUR_LAND_ID_HERE'
      AND document_type IN ('ownership-documents', 'government-nocs')
      AND doc_slot IN ('D1', 'D2')
      AND subtask_id IS NULL
    GROUP BY document_type, doc_slot
)
SELECT 
    document_type,
    COUNT(*) as total_slots,
    COUNT(CASE WHEN slot_status = 'under_review' THEN 1 END) as slots_under_review,
    STRING_AGG(
        CASE 
            WHEN slot_status = 'under_review' THEN doc_slot || ': under review'
            ELSE doc_slot || ': active'
        END, 
        ', '
    ) as status_summary,
    CASE 
        WHEN COUNT(CASE WHEN slot_status = 'under_review' THEN 1 END) > 0 
        THEN true
        ELSE false
    END as has_review_status
FROM slot_summary
GROUP BY document_type
ORDER BY document_type;

-- =====================================================
-- 8. USAGE EXAMPLES
-- =====================================================

-- Example 1: Get all document types with their slot status
-- Replace 'YOUR_LAND_ID_HERE' with actual land ID
SELECT 
    document_type,
    COUNT(DISTINCT doc_slot) as slot_count,
    STRING_AGG(
        CASE 
            WHEN COUNT(CASE WHEN version_status = 'under_review' OR status = 'under_review' THEN 1 END) > 0 
            THEN doc_slot || ': under review'
            ELSE doc_slot || ': active'
        END, 
        ', '
    ) as slot_statuses
FROM documents
WHERE land_id = 'ff8f54a7-7e05-4d49-a71d-19a134eb3e5c'
  AND document_type IN ('ownership-documents', 'government-nocs')
  AND doc_slot IN ('D1', 'D2')
  AND subtask_id IS NULL
GROUP BY document_type;

-- Example 2: Mark D1 slot for review
UPDATE documents 
SET version_status = 'under_review',
    review_locked_at = NOW(),
    review_locked_by = 'user-uuid-here'
WHERE land_id = 'ff8f54a7-7e05-4d49-a71d-19a134eb3e5c'
  AND document_type = 'ownership-documents'
  AND doc_slot = 'D1'
  AND subtask_id IS NULL;

-- Example 3: Check current status
SELECT 
    document_type,
    doc_slot,
    COUNT(*) as total_docs,
    COUNT(CASE WHEN version_status = 'under_review' THEN 1 END) as under_review_docs
FROM documents
WHERE land_id = 'ff8f54a7-7e05-4d49-a71d-19a134eb3e5c'
  AND document_type = 'ownership-documents'
  AND doc_slot IN ('D1', 'D2')
  AND subtask_id IS NULL
GROUP BY document_type, doc_slot
ORDER BY doc_slot;
