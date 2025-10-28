// Test component to verify the document versions page
import React from 'react';
import { Link } from 'react-router-dom';

const DocumentVersionsTest = () => {
  const testLandId = 'ff8f54a7-7e05-4d49-a71d-19a134eb3e5c';
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Document Versions Test</h1>
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Test Links</h2>
          <div className="space-y-2">
            <Link 
              to={`/admin/document-versions/${testLandId}`}
              className="block p-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
            >
              Admin Document Versions Page
            </Link>
            <Link 
              to={`/document-versions/${testLandId}`}
              className="block p-2 bg-green-100 text-green-800 rounded hover:bg-green-200"
            >
              Regular Document Versions Page
            </Link>
          </div>
        </div>
        
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Expected Features</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>40/60 split layout (Document Types / Document Versions)</li>
            <li>Document types show version counts and under-review status</li>
            <li>Documents marked as under_review by reviewers are visible</li>
            <li>Latest versions highlighted</li>
            <li>Archived versions shown separately</li>
            <li>Reviewer actions for claiming/completing reviews</li>
          </ul>
        </div>
        
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">API Endpoints</h2>
          <div className="text-sm space-y-1">
            <div>GET /api/document-versions/land/{testLandId}/status-summary</div>
            <div>GET /api/document-versions/land/{testLandId}/document-type/{type}</div>
            <div>POST /api/reviewer/documents/{docId}/claim</div>
            <div>POST /api/reviewer/documents/{docId}/complete</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentVersionsTest;
