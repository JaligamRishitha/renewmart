import React from 'react';
import Icon from '../../../AppIcon';

const DocumentTypeCard = ({ docType, isSelected, onClick }) => {
  return (
    <button
      onClick={() => onClick(docType)}
      className={`w-full text-left p-3 rounded-lg transition-smooth ${
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted border border-border'
      }`}
    >
      <div className="flex items-start space-x-3">
        <Icon 
          name={docType.icon} 
          size={20} 
          className={isSelected ? 'text-primary-foreground' : 'text-primary'} 
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {docType.name}
          </p>
          <p className="text-xs opacity-75 mt-1">
            {docType.count} version{docType.count !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            {docType.underReview > 0 && (
              <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">
                {docType.underReview} under review
              </span>
            )}
            <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
              v{docType.latestVersion}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

const DocumentTypeSelector = ({ documentTypes, selectedType, onTypeSelect }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-heading font-semibold text-lg text-foreground mb-4">
        Document Types
      </h3>
      <div className="space-y-2">
        {documentTypes.map((docType) => (
          <DocumentTypeCard
            key={docType.id}
            docType={docType}
            isSelected={selectedType?.id === docType.id}
            onClick={onTypeSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default DocumentTypeSelector;
