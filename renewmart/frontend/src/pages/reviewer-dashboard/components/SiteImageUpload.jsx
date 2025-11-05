import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import { landsAPI } from '../../../services/api';
import toast from 'react-hot-toast';

const SiteImageUpload = ({ landId }) => {
  const [uploading, setUploading] = useState(false);
  const [siteImage, setSiteImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiteImage();
  }, [landId]);

  const fetchSiteImage = async () => {
    try {
      setLoading(true);
      const response = await landsAPI.getSiteImage(landId);
      if (response && response.image_url) {
        // Construct full URL
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const imageUrl = response.image_url.startsWith('/api') 
          ? `${apiBaseUrl}${response.image_url.substring(4)}`
          : response.image_url;
        setSiteImage(imageUrl);
        setImagePreview(imageUrl);
      } else if (response && response.has_image) {
        // If has_image is true but no URL, construct it
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const imageUrl = `${apiBaseUrl}/lands/${landId}/site-image`;
        setSiteImage(imageUrl);
        setImagePreview(imageUrl);
      }
    } catch (error) {
      console.error('Error fetching site image:', error);
      // Not an error if no image exists yet
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.onerror = () => {
        toast.error('Error reading image file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    const fileInput = document.getElementById('site-image-upload');
    const file = fileInput?.files?.[0];
    
    if (!file) {
      toast.error('Please select an image to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      await landsAPI.uploadSiteImage(landId, formData);
      toast.success('Site image uploaded successfully');
      await fetchSiteImage();
    } catch (error) {
      console.error('Error uploading site image:', error);
      toast.error('Failed to upload site image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this site image?')) {
      return;
    }

    try {
      await landsAPI.deleteSiteImage(landId);
      toast.success('Site image removed successfully');
      setSiteImage(null);
      setImagePreview(null);
      // Reset file input
      const fileInput = document.getElementById('site-image-upload');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('Error removing site image:', error);
      toast.error('Failed to remove site image. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">Site Image</h3>
          <p className="text-sm text-muted-foreground">
            Upload a site image for this project. This image will be used when the project is published to the marketplace.
          </p>
        </div>

        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-6">
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Site Image Preview" 
                className="max-w-full h-auto max-h-96 rounded-lg border border-border shadow-sm"
              />
              {(siteImage || imagePreview) && (
                <button
                  onClick={handleRemove}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                  title="Remove image"
                >
                  <Icon name="X" className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="space-y-4">
          <div 
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => document.getElementById('site-image-upload')?.click()}
          >
            <Icon name="Upload" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground mb-2">
              {imagePreview ? 'Replace Site Image' : 'Upload Site Image'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              PNG, JPG, or GIF up to 10MB
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="site-image-upload"
            />
            <Button 
              variant="outline" 
              iconName="Image"
              iconPosition="left"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('site-image-upload')?.click();
              }}
            >
              Choose Image
            </Button>
          </div>

          {imagePreview && (
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setImagePreview(siteImage || null);
                  const fileInput = document.getElementById('site-image-upload');
                  if (fileInput) {
                    fileInput.value = '';
                  }
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="default" 
                onClick={handleUpload}
                loading={uploading}
                iconName="Upload"
                iconPosition="left"
              >
                {siteImage ? 'Update Image' : 'Upload Image'}
              </Button>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Icon name="Info" className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About Site Images</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>This image will be displayed in the marketplace when the project is published</li>
                <li>If no site image is uploaded, the system will use a default image based on the project type</li>
                <li>Only one site image can be uploaded per project</li>
                <li>Recommended size: 1200x800 pixels or similar aspect ratio</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteImageUpload;

