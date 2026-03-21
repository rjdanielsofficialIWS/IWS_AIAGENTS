import { MediaDistributionPage } from './components/MediaDistributionPage';
import { MetaPixel } from './components/MetaPixel';
import { MetaPixelTracker } from './components/MetaPixelTracker';
import { GA4Tracker } from './components/GA4Tracker';
import { BehaviorTracker } from './components/BehaviorTracker';
import { ClarityLoader } from './components/ClarityLoader';

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HomePage } from './components/HomePage';
import { DynamicDemoPage } from './components/DynamicDemoPage';
import { OnboardingBookingPage } from './components/OnboardingBookingPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { AssistantsList } from './components/assistants/AssistantsList';
import { AssistantBuilder } from './components/assistants/AssistantBuilder';
import { WidgetManager } from './components/widgets/WidgetManager';
import { DemoPagesManager } from './components/demo-pages/DemoPagesManager';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsAndConditionsPage } from './components/TermsAndConditionsPage';
import { PostizCallbackPage } from './components/auth/PostizCallbackPage';

import { Brain } from 'lucide-react';
import { VapiAssistant } from './types/vapi';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.membership_status !== 'premium' && user.membership_status !== 'enterprise') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
        <div className="relative z-10 bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 w-full max-w-md mx-4 text-center">
          <Brain className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Premium Membership Required</h2>
          <p className="text-gray-300 mb-8">
            You need an active premium membership to access our premium services.
          </p>

          <button
            onClick={() =>
              (window.location.href =
                'https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding')
            }
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl"
          >
            Book Your Onboarding Call
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Dashboard() {
  const [currentPage, setCurrentPage] = React.useState('dashboard');
  const [currentAssistant, setCurrentAssistant] = React.useState<VapiAssistant | null>(null);
  const [showAssistantBuilder, setShowAssistantBuilder] = React.useState(false);

  const handleCreateAssistant = () => {
    setCurrentAssistant(null);
    setShowAssistantBuilder(true);
  };

  const handleEditAssistant = (assistant: VapiAssistant) => {
    setCurrentAssistant(assistant);
    setShowAssistantBuilder(true);
  };

  const handleSaveAssistant = () => {
    setShowAssistantBuilder(false);
    setCurrentAssistant(null);
  };

  const handleBackFromBuilder = () => {
    setShowAssistantBuilder(false);
    setCurrentAssistant(null);
  };

  if (showAssistantBuilder) {
    return (
      <DashboardLayout currentPage="assistants" onPageChange={setCurrentPage}>
        <AssistantBuilder
          assistantId={currentAssistant?.id}
          onBack={handleBackFromBuilder}
          onSave={handleSaveAssistant}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {currentPage === 'dashboard' && <DashboardOverview onNavigate={setCurrentPage} />}
      {currentPage === 'assistants' && (
        <AssistantsList onCreateNew={handleCreateAssistant} onEdit={handleEditAssistant} />
      )}
      {currentPage === 'widgets' && <WidgetManager />}
      {currentPage === 'demo-pages' && <DemoPagesManager />}
    </DashboardLayout>
  );
}


function AppContent() {
  return (
    <>
      <MetaPixel />
      <MetaPixelTracker />
      <GA4Tracker />
      <BehaviorTracker />
      <ClarityLoader />

      <Routes>

        <Route path="/" element={<HomePage />} />
        <Route path="/InfiniteMedia" element={<MediaDistributionPage />} />

        <Route path="/onboarding-booking" element={<OnboardingBookingPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />

        <Route path="/login" element={<Navigate to="/InfiniteMedia" replace />} />
        <Route path="/register" element={<Navigate to="/InfiniteMedia" replace />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Postiz OAuth Callback */}
        <Route
          path="/mediamachine/oauth/postiz/callback"
          element={<PostizCallbackPage />}
        />

        {/* Demo pages */}
        <Route path="/demo" element={<DynamicDemoPage />} />
        <Route path="/demo/:slug" element={<DynamicDemoPage />} />
        <Route path="/:slug" element={<DynamicDemoPage />} />

      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;