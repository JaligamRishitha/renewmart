import React, { useState } from 'react';
import { documentVersionsAPI, documentAssignmentAPI } from '../services/api';

const DocumentVersionsDebug = () => {
  const [landId, setLandId] = useState('ff8f54a7-7e05-4d49-a71d-19a134eb3e5c');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    const testResults = {};

    // Test 0: Check authentication
    const token = localStorage.getItem('authToken');
    testResults.authToken = token ? 'Present' : 'Missing';
    testResults.authTokenValue = token ? token.substring(0, 20) + '...' : null;

    try {
      // Test 1: Get Status Summary
      console.log('Testing getStatusSummary...');
      testResults.statusSummary = await documentVersionsAPI.getStatusSummary(landId);
      console.log('Status Summary Result:', testResults.statusSummary);
    } catch (error) {
      testResults.statusSummaryError = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      };
      console.error('Status Summary Error:', error);
    }

    try {
      // Test 2: Get Land Assignments
      console.log('Testing getLandAssignments...');
      testResults.assignments = await documentAssignmentAPI.getLandAssignments(landId);
      console.log('Assignments Result:', testResults.assignments);
    } catch (error) {
      testResults.assignmentsError = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      };
      console.error('Assignments Error:', error);
    }

    // Test 3: Try to get documents for each document type
    if (testResults.statusSummary && testResults.statusSummary.length > 0) {
      for (const docType of testResults.statusSummary) {
        try {
          console.log(`Testing getDocumentVersions for ${docType.document_type}...`);
          testResults[`versions_${docType.document_type}`] = await documentVersionsAPI.getDocumentVersions(landId, docType.document_type);
          console.log(`Versions for ${docType.document_type}:`, testResults[`versions_${docType.document_type}`]);
        } catch (error) {
          testResults[`versions_${docType.document_type}_error`] = {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
          };
          console.error(`Versions Error for ${docType.document_type}:`, error);
        }
      }
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Document Versions API Debug</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Land ID:</label>
        <input
          type="text"
          value={landId}
          onChange={(e) => setLandId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg"
          placeholder="Enter Land ID"
        />
      </div>

      <button
        onClick={testAPI}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API Calls'}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Results:</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DocumentVersionsDebug;
