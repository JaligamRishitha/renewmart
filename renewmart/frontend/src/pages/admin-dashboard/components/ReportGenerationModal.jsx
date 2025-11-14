import React, { useState } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import { landsAPI } from "../../../services/api";

const ReportGenerationModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async (format) => {
    try {
      setLoading(true);
      setError(null);

      let blob;
      let filename;

      if (format === "excel") {
        blob = await landsAPI.downloadExcelReport();
        filename = `lands_report_${new Date().toISOString().split("T")[0]}.xlsx`;
      } else if (format === "pdf") {
        blob = await landsAPI.downloadPdfReport();
        filename = `lands_report_${new Date().toISOString().split("T")[0]}.pdf`;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error(`Error downloading ${format} report:`, err);
      setError(`Failed to download ${format.toUpperCase()} report. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Generate Report
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={loading}
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-muted-foreground mb-6">
            Select a format to download the complete report of all lands:
          </p>

          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg">
              <div className="flex items-center">
                <Icon name="AlertTriangle" size={16} className="text-error mr-2" />
                <p className="text-sm text-error">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {/* Excel Option */}
            <button
              onClick={() => handleDownload("excel")}
              disabled={loading}
              className="w-full flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Icon name="FileSpreadsheet" size={20} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Excel Report</p>
                  <p className="text-sm text-muted-foreground">
                    Download as .xlsx file
                  </p>
                </div>
              </div>
              {loading && (
                <Icon name="Loader2" size={20} className="animate-spin text-primary" />
              )}
            </button>

            {/* PDF Option */}
            <button
              onClick={() => handleDownload("pdf")}
              disabled={loading}
              className="w-full flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <Icon name="FileText" size={20} className="text-red-600 dark:text-red-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">PDF Report</p>
                  <p className="text-sm text-muted-foreground">
                    Download as .pdf file
                  </p>
                </div>
              </div>
              {loading && (
                <Icon name="Loader2" size={20} className="animate-spin text-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerationModal;

