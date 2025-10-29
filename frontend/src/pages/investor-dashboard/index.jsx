import React from 'react';
import Header from '../../components/ui/Header';
import NotificationIndicator from '../../components/ui/NotificationIndicator';
import QuickActions from '../../components/ui/QuickActions';
import InvestorDashboard from '../investor-portal/components/InvestorDashboard';

const InvestorDashboardPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header userRole="investor" />
      <div className="pt-16">
      
        <main className="max-w-9xl mx-auto px-4 lg:px-6 py-6">
          <InvestorDashboard />
        </main>
      </div>
      <NotificationIndicator
        notifications={[]}
        position="top-right"
        maxVisible={3}
        autoHide={true}
        hideDelay={5000}
      />
      <QuickActions
        userRole="investor"
        currentContext="investor-dashboard"
        onActionComplete={() => {}}
        position="bottom-right"
      />
    </div>
  );
};

export default InvestorDashboardPage;

