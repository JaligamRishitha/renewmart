import React from 'react';
import Icon from '../AppIcon';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true 
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full ${sizeClasses[size]} transform overflow-hidden rounded-lg bg-white shadow-xl transition-all max-h-[90vh] flex flex-col`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="rounded-lg p-1 hover:bg-muted transition-colors"
                title="Close"
              >
                <Icon name="X" size={20} className="text-muted-foreground" />
              </button>
            )}
          </div>
          
          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
