import React from 'react';
import Icon from '../../../AppIcon';
import ReviewerActions from './ReviewerActions';


const DocumentVersionList = ({ 
  selectedDocumentType, 
  documents, 
  userRole, 
  onMarkForReview, 
  onCompleteReview, 
  onArchive 
}) => {
  if (!selectedDocumentType) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
          Select a Document Type
        </h3>
        <p className="text-muted-foreground">
          Choose a document type from the left sidebar to view its versions
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-semibold text-lg text-foreground">
            {selectedDocumentType.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {documents.length} version{documents.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      {/* Version Status Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {documents.filter(d => d.isLatest).length}
          </div>
          <div className="text-sm text-green-600">Latest</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {documents.filter(d => d.status === 'under_review').length}
          </div>
          <div className="text-sm text-yellow-600">Under Review</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">
            {documents.filter(d => d.status === 'archived').length}
          </div>
          <div className="text-sm text-gray-600">Archived</div>
        </div>
      </div>

      {/* Document List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className={`p-4 rounded-lg border hover:shadow-md transition-all ${
              doc.isLatest ? 'border-primary bg-primary/5' : 'border-border bg-card'
            }`}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${getStatusColor(doc.status)}`}>
                    <Icon name={getStatusIcon(doc.status)} size={20} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-foreground text-sm">
                        Version {doc.version}
                      </span>
                      {doc.isLatest && (
                        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(doc.status)}`}>
                      {doc.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* File Info */}
              <div className="flex-1 mb-3">
                <h3 className="font-medium text-foreground mb-2 text-sm truncate" title={doc.fileName}>
                  {doc.fileName}
                </h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Size:</span>
                    <span>{doc.fileSize}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Uploaded:</span>
                    <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>By:</span>
                    <span className="truncate">{doc.uploadedBy}</span>
                  </div>
                </div>

                {doc.status === 'under_review' && doc.reviewedBy && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <div className="flex items-center space-x-1 mb-1">
                      <Icon name="Clock" size={12} className="text-yellow-600" />
                      <span className="font-medium text-yellow-800">Under Review</span>
                    </div>
                    <div className="text-yellow-700">
                      <p className="truncate">By {doc.reviewedBy}</p>
                      <p>Since {new Date(doc.reviewStartedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                {doc.status === 'archived' && doc.archivedAt && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                    <div className="flex items-center space-x-1 mb-1">
                      <Icon name="Archive" size={12} className="text-gray-600" />
                      <span className="font-medium text-gray-800">Archived</span>
                    </div>
                    <div className="text-gray-700">
                      <p>On {new Date(doc.archivedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center space-x-1">
                  {userRole === 'reviewer' && (
                    <ReviewerActions
                      document={doc}
                      onMarkForReview={onMarkForReview}
                      onCompleteReview={onCompleteReview}
                      onArchive={onArchive}
                    />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {userRole === 'admin' && doc.status === 'active' && !doc.isLatest && (
                    <button
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                      onClick={() => onArchive(doc.id)}
                    >
                      <Icon name="Archive" size={16} />
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentVersionList;
