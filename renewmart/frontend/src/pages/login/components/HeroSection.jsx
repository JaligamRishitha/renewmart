import React from 'react';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';

const HeroSection = () => {
  const trustSignals = [
    { name: 'NABCEP', description: 'North American Board of Certified Energy Practitioners' },
    { name: 'IREC', description: 'Interstate Renewable Energy Council' },
    { name: 'SSL', description: 'Secure Socket Layer Encryption' },
    { name: 'SOC 2', description: 'System and Organization Controls 2' }
  ];

  const platformStats = [
    { value: '2.5GW+', label: 'Projects Facilitated' },
    { value: '500+', label: 'Active Partners' },
    { value: '£1.2B+', label: 'Transactions Processed' },
    { value: '99.9%', label: 'Platform Uptime' }
  ];

  return (
    <div className="h-full flex flex-col justify-between p-8 lg:p-12">
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="mb-8 text-center">
          {/* Logo and Text on Same Line */}
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Zap" size={24} color="white" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-black leading-tight">
              Renewmart
            </h1>
          </div>
          
        </div>

       

        
      </div>
     
      {/* Background Image Overlay */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1466611653911-95081537e5b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
          alt="Renewable energy solar panels and wind turbines landscape"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-secondary/90"></div>
      </div>
    </div>
  );
};

export default HeroSection;