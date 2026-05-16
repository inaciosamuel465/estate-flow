import React, { useState } from 'react';
import MasterLogin from './pages/master/MasterLogin';
import MasterLayout from './pages/master/MasterLayout';
import MasterDashboard from './pages/master/MasterDashboard';
import CompaniesList from './pages/master/CompaniesList';
import SubscriptionsPage from './pages/master/SubscriptionsPage';
import MasterPlansConfig from './pages/master/MasterPlansConfig';
import MasterBilling from './pages/master/MasterBilling';
import MasterSettings from './pages/master/MasterSettings';
import RequestsList from './pages/RequestsList';

const MasterApp: React.FC = () => {
  const [masterUser, setMasterUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem('master_session');
      if (stored) return JSON.parse(stored).user;
    } catch { /* ignore */ }
    return null;
  });

  const [currentSection, setCurrentSection] = useState<string>('dashboard');

  if (!masterUser) {
    return <MasterLogin onLoginSuccess={(user) => setMasterUser(user)} onBack={() => window.location.href = '/'} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('master_session');
    setMasterUser(null);
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard': return <MasterDashboard />;
      case 'companies': return <CompaniesList />;
      case 'subscriptions': return <SubscriptionsPage />;
      case 'plans': return <MasterPlansConfig />;
      case 'billing': return <MasterBilling />;
      case 'settings': return <MasterSettings />;
      case 'requests': return <RequestsList />;
      default: return <MasterDashboard />;
    }
  };

  return (
    <MasterLayout
      user={masterUser}
      currentSection={currentSection}
      onNavigate={setCurrentSection}
      onLogout={handleLogout}
    >
      {renderSection()}
    </MasterLayout>
  );
};

export default MasterApp;
