import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { documentsAPI } from '../../../services/api';

const DocumentViewer = ({ 
  documents = [], 
  selectedDocument = null, 
  onDocumentSelect = () => {},
  annotations = [],
  onAddAnnotation = () => {},
  onDeleteAnnotation = () => {},
  landId = null
}) => {
  const [downloading, setDownloading] = useState(null);
  const [documentCategories, setDocumentCategories] = useState([]);
  const [categoryDocuments, setCategoryDocuments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Get category icon based on document type
  const getCategoryIcon = (documentType) => {
    const iconMap = {
      'land_survey': 'Map',
      'title_deed': 'FileText',
      'environmental_clearance': 'Leaf',
      'zoning_certificate': 'Building',
      'tax_receipt': 'Receipt',
      'financial_documents': 'DollarSign',
      'legal_documents': 'Scale',
      'other': 'File'
    };
    return iconMap[documentType] || 'File';
  };

  // Fetch document categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      if (!landId) return;
      
      setLoadingCategories(true);
      try {
        const types = await documentsAPI.getDocumentTypes();
        const categories = types.map(type => ({
          id: type,
          label: type.replace('_', ' ').toUpperCase(),
          icon: getCategoryIcon(type),
          count: 0 // Will be updated when documents are fetched
        }));
        setDocumentCategories(categories);
      } catch (error) {
        console.error('Error fetching document categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [landId]);

  // Calculate document counts from the documents prop
  useEffect(() => {
    if (documents && documents.length > 0 && documentCategories.length > 0) {
      console.log('📊 Calculating document counts:', {
        totalDocuments: documents.length,
        categories: documentCategories.length,
        documents: documents.map(doc => ({ id: doc.document_id, type: doc.document_type }))
      });
      
      const updatedCategories = documentCategories.map(category => {
        const count = documents.filter(doc => doc.document_type === category.id).length;
        console.log(`📊 Category ${category.id}: ${count} documents`);
        return {
          ...category,
          count: count
        };
      });
      setDocumentCategories(updatedCategories);
    }
  }, [documents, documentCategories.length]);

  // Handle category selection
  const handleCategorySelect = async (categoryId) => {
    if (!landId) return;
    
    setSelectedCategory(categoryId);
    setLoadingDocuments(true);
    
    try {
      const documents = await documentsAPI.getDocumentsByType(landId, categoryId);
      setCategoryDocuments(prev => ({
        ...prev,
        [categoryId]: documents
      }));
    } catch (error) {
      console.error('Error fetching documents for category:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Handle document click - open in new tab
  const handleDocumentClick = async (document) => {
    try {
      const response = await documentsAPI.downloadDocument(document.document_id);
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
    }
  };

  // Handle document download
  const handleDownload = async (document) => {
    setDownloading(document.document_id);
    try {
      const response = await documentsAPI.downloadDocument(document.document_id);
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      setDownloading(null);
    }
  };

  // Handle document view
  const handleView = async (document) => {
    try {
      const response = await documentsAPI.downloadDocument(document.document_id);
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('View failed:', error);
    }
  };

  // Handle viewing document versions
  const handleViewVersions = (doc) => {
    // This will be handled by the parent component
    console.log('View versions for document:', doc);
    // For now, we'll just show an alert
    alert(`Viewing versions for ${doc?.file_name} (${doc?.document_type})`);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  return (
    <div className="flex flex-col  bg-card border border-border rounded-lg overflow-hidden">
      {/* Document Categories */}
      <div className="border-b border-border px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center">
          <Icon name="Folder" size={16} className="mr-2 text-primary" />
          Document Categories
        </h3>
        {loadingCategories ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading categories...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {documentCategories?.map((category) => (
              <button
                key={category?.id}
                onClick={() => handleCategorySelect(category?.id)}
                className={`flex items-center space-x-2 p-2 rounded-lg transition-smooth text-left ${
                  selectedCategory === category?.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                <Icon name={category?.icon} size={16} className={selectedCategory === category?.id ? 'text-primary-foreground' : 'text-primary'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {category?.label}
                  </p>
                  <p className="text-xs opacity-75">
                    {category?.count} files
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Document List */}
      <div className="border-b border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center">
          <Icon name="FileText" size={16} className="mr-2 text-primary" />
          {selectedCategory ? `${documentCategories.find(c => c.id === selectedCategory)?.label} Documents` : 'Select a Category'} 
          ({selectedCategory ? categoryDocuments[selectedCategory]?.length || 0 : 0})
        </h3>
        {loadingDocuments ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading documents...</span>
          </div>
        ) : selectedCategory && categoryDocuments[selectedCategory] ? (
          <div className="space-y-2">
            {categoryDocuments[selectedCategory].map((doc) => (
              <div
                key={doc?.document_id}
                onClick={() => handleDocumentClick(doc)}
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-smooth hover:bg-muted border-border"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <Icon 
                    name={doc?.mime_type?.includes('pdf') ? 'FileText' : 'Image'} 
                    size={20} 
                    className="text-primary flex-shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {doc?.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc?.file_size)} • {doc?.document_type?.replace('_', ' ').toUpperCase()}
                      {doc?.version_number && (
                        <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded">
                          v{doc.version_number}
                          {doc?.is_latest_version && ' (Latest)'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e?.stopPropagation();
                      handleViewVersions(doc);
                    }}
                    className="w-8 h-8"
                    title="View Document Versions"
                  >
                    <Icon name="History" size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e?.stopPropagation();
                      handleView(doc);
                    }}
                    className="w-8 h-8"
                    title="View Document"
                  >
                    <Icon name="Eye" size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e?.stopPropagation();
                      handleDownload(doc);
                    }}
                    disabled={downloading === doc?.document_id}
                    className="w-8 h-8"
                    title="Download Document"
                  >
                    <Icon name={downloading === doc?.document_id ? "Loader" : "Download"} size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : selectedCategory ? (
          <div className="text-center py-8">
            <Icon name="FolderOpen" size={48} className="mx-auto text-muted-foreground opacity-50 mb-2" />
            <p className="text-sm text-muted-foreground">No documents found in this category</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <Icon name="Folder" size={48} className="mx-auto text-muted-foreground opacity-50 mb-2" />
            <p className="text-sm text-muted-foreground">Select a category to view documents</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;