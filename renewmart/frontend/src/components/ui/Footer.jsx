import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full mt-auto pt-8 pb-6 border-t border-border">
      <div className="max-w-9xl mx-auto px-4 lg:px-6">
        <div className="flex flex-col items-center justify-center space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Renewmart. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

