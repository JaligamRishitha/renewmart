import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { documentsAPI, taskAPI } from '../../services/api';

const TaskDocuments = ({ taskId, onRefresh }) => {
  const [documents, setDocuments] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchSubtasks();
  }, [taskId]);

  const fetchSubtasks = async () => {
    try {
      setLoading(true);
      const subtaskList = await taskAPI.getSubtasks(taskId);
      setSubtasks(subtaskList);
      
      // Fetch documents for each subtask
      const allDocs = {};
      for (const subtask of subtaskList) {
        const docs = await documentsAPI.getSubtaskDocuments(subtask.subtask_id);
        allDocs[subtask.subtask_id] = docs;
      }
      setDocuments(allDocs);
    } catch (error) {
      console.error('Failed to fetch subtasks/documents:', error);
      showToast('Failed to load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubtaskDocuments = async (subtaskId) => {
    try {
      const docs = await documentsAPI.getSubtaskDocuments(subtaskId);
      setDocuments(prev => ({ ...prev, [subtaskId]: docs }));
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleFileUpload = async (e, subtaskId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(subtaskId);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', 'subtask_document');

      await documentsAPI.uploadSubtaskDocument(subtaskId, formData);
      showToast('Document uploaded successfully!', 'success');
      await fetchSubtaskDocuments(subtaskId);
      if (onRefresh) onRefresh();
      e.target.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.detail || 'Failed to upload document', 'error');
    } finally {
      setUploading(null);
    }
  };

  const toggleSubtask = (subtaskId) => {
    setExpandedSubtasks(prev => ({ ...prev, [subtaskId]: !prev[subtaskId] }));
  };

  const handleDownload = async (doc) => {
    try {
      const blob = await documentsAPI.downloadDocument(doc.document_id);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showToast('Failed to download document', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    }
  };

  // Group subtasks by section
  const groupedSubtasks = React.useMemo(() => {
    if (!subtasks || subtasks.length === 0) return [];
    const groups = {};
    subtasks.forEach(subtask => {
      const descParts = subtask.description?.split(' - ') || [];
      const section = descParts[0] || 'General';
      if (!groups[section]) {
        groups[section] = { title: section, items: [] };
      }
      groups[section].items.push(subtask);
    });
    return Object.values(groups);
  }, [subtasks]);

  const getTotalDocCount = () => {
    return Object.values(documents).reduce((sum, docs) => sum + docs.length, 0);
  };

  return (
    <div className="space-y-4">
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <Icon name={toast.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={20} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Icon name="FileText" size={20} className="text-primary" />
              Task Documents
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload documents organized by subtask
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{getTotalDocCount()}</div>
            <div className="text-xs text-muted-foreground">Total Files</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Icon name="Loader2" size={48} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading subtasks...</p>
        </div>
      ) : subtasks.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 border border-border rounded-lg">
          <Icon name="ListX" size={64} className="mx-auto mb-3 opacity-50 text-muted-foreground" />
          <p className="text-foreground font-medium mb-1">No Subtasks Yet</p>
          <p className="text-sm text-muted-foreground">Create subtasks first to upload documents</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedSubtasks.map((section, sectionIdx) => (
            <div key={sectionIdx} className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Section Header */}
              <div className="bg-muted/50 px-4 py-3 border-b border-border">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Icon name="FolderOpen" size={16} className="text-primary" />
                  {section.title}
                  <span className="text-xs text-muted-foreground font-normal ml-auto">
                    ({section.items.length} {section.items.length === 1 ? 'subtask' : 'subtasks'})
                  </span>
                </h4>
              </div>

              {/* Subtasks */}
              <div className="divide-y divide-border">
                {section.items.map((subtask) => {
                  const subtaskDocs = documents[subtask.subtask_id] || [];
                  const isExpanded = expandedSubtasks[subtask.subtask_id];
                  
                  return (
                    <div key={subtask.subtask_id} className="bg-background">
                      {/* Subtask Header */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => toggleSubtask(subtask.subtask_id)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Icon name="FileText" size={18} className="text-primary" />
                          <div className="flex-1">
                            <h5 className="font-medium text-foreground">{subtask.title}</h5>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className={`px-2 py-0.5 rounded ${
                                subtaskDocs.length > 0 ? 'bg-green-500/10 text-green-600' : 'bg-orange-500/10 text-orange-600'
                              }`}>
                                {subtaskDocs.length > 0 ? 'Uploaded' : 'Not Uploaded'}
                              </span>
                              {subtaskDocs.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Icon name="Paperclip" size={12} />
                                  {subtaskDocs.length} {subtaskDocs.length === 1 ? 'file' : 'files'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Icon
                          name={isExpanded ? "ChevronUp" : "ChevronDown"}
                          size={20}
                          className="text-muted-foreground"
                        />
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 bg-muted/20">
                          {/* Upload Button */}
                          <div className="mb-3">
                            <input
                              type="file"
                              id={`upload-${subtask.subtask_id}`}
                              onChange={(e) => handleFileUpload(e, subtask.subtask_id)}
                              disabled={uploading === subtask.subtask_id}
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            />
                            <Button
                              onClick={() => document.getElementById(`upload-${subtask.subtask_id}`).click()}
                              variant="default"
                              size="sm"
                              className="w-full"
                              disabled={uploading === subtask.subtask_id}
                            >
                              <Icon
                                name={uploading === subtask.subtask_id ? "Loader" : "Upload"}
                                size={16}
                                className={uploading === subtask.subtask_id ? "animate-spin" : ""}
                              />
                              {uploading === subtask.subtask_id ? 'Uploading...' : 'Upload Document'}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                              PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                            </p>
                          </div>

                          {/* Documents List */}
                          {subtaskDocs.length > 0 ? (
                            <div className="space-y-2">
                              {subtaskDocs.map((doc) => (
                                <div
                                  key={doc.document_id}
                                  className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Icon name="File" size={16} className="text-primary flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(doc.created_at).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(doc.status)}`}>
                                      {doc.status?.toUpperCase()}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDownload(doc)}
                                      title="Download"
                                    >
                                      <Icon name="Download" size={14} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-muted-foreground">
                              <Icon name="FileX" size={32} className="mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No documents uploaded for this subtask</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskDocuments;

