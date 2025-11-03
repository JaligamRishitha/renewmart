// Document Version API Service
const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || '/api';


class DocumentVersionService {
  // Get document status summary for a land
  async getDocumentStatusSummary(landId) {
    try {
      const response = await fetch(`${API_BASE_URL}/document-versions/land/${landId}/status-summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching document status summary:', error);
      throw error;
    }
  }

  // Get all versions of a specific document type for a land
  async getDocumentVersions(landId, documentType) {
    try {
      const response = await fetch(`${API_BASE_URL}/document-versions/land/${landId}/document-type/${documentType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching document versions:', error);
      throw error;
    }
  }

  // Lock a document for review
  async lockDocumentForReview(documentId, reason = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/document-versions/${documentId}/lock-for-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error locking document for review:', error);
      throw error;
    }
  }

  // Unlock a document from review
  async unlockDocument(documentId, reason = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/document-versions/${documentId}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error unlocking document:', error);
      throw error;
    }
  }

  // Archive a document version
  async archiveDocument(documentId, reason = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/document-versions/${documentId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error archiving document:', error);
      throw error;
    }
  }

  // Get document audit trail
  async getDocumentAuditTrail(landId, documentType = null, actionType = null, limit = 50, offset = 0) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (documentType) params.append('document_type', documentType);
      if (actionType) params.append('action_type', actionType);

      const response = await fetch(`${API_BASE_URL}/document-versions/land/${landId}/audit-trail?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching document audit trail:', error);
      throw error;
    }
  }

  // Upload new document version
  async uploadDocumentVersion(landId, documentType, file, versionNotes = null) {
    try {
      const formData = new FormData();
      formData.append('land_id', landId);
      formData.append('document_type', documentType);
      formData.append('file', file);
      if (versionNotes) formData.append('version_notes', versionNotes);

      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading document version:', error);
      throw error;
    }
  }

  // Get document download URL
  async getDocumentDownloadUrl(documentId) {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting document download URL:', error);
      throw error;
    }
  }

  // Reviewer-specific endpoints
  async getAssignedDocuments() {
    try {
      const response = await fetch(`${API_BASE_URL}/reviewer/documents/assigned`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching assigned documents:', error);
      throw error;
    }
  }

  async getAvailableDocumentsForReview() {
    try {
      const response = await fetch(`${API_BASE_URL}/reviewer/documents/available`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching available documents:', error);
      throw error;
    }
  }

  async claimDocumentForReview(documentId, reason = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/reviewer/documents/${documentId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error claiming document for review:', error);
      throw error;
    }
  }

  async completeDocumentReview(documentId, reviewResult, comments = null) {
    try {
      const response = await fetch(`${API_BASE_URL}/reviewer/documents/${documentId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          review_result: reviewResult,
          comments 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error completing document review:', error);
      throw error;
    }
  }
}

export default new DocumentVersionService();
