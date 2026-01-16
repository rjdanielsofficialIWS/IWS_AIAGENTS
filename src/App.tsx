import { MetaPixel } from './components/MetaPixel';
import { MetaPixelTracker } from './components/MetaPixelTracker';
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HomePage } from './components/HomePage';
import { DemoPage } from './components/DemoPage';
import { OnboardingBookingPage } from './components/OnboardingBookingPage';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { AssistantsList } from './components/assistants/AssistantsList';
import { AssistantBuilder } from './components/assistants/AssistantBuilder';
import { WidgetManager } from './components/widgets/WidgetManager';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { Brain, Phone, MessageSquare, User } from 'lucide-react';
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
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 w-full max-w-md mx-4 text-center">
          <Brain className="h-16 w-16 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Premium Membership Required</h2>
          <p className="text-gray-300 mb-8">
            You need an active premium membership to access our premium services.
            Upgrade now to start using our advanced tools and features.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => window.location.href = 'https://calendly.com/infinitewealthsolutions/iws-ai-agents-onbooarding'}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-600 transition-all transform hover:scale-[1.02] hover:shadow-xl hover:shadow-yellow-400/25"
            >
              Book Your Onboarding Call
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="w-full text-gray-400 hover:text-gray-300 transition-colors text-sm"
            >
              Back to main page
            </button>
          </div>
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

  const handleSaveAssistant = (assistant: VapiAssistant) => {
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
      {currentPage === 'dashboard' && <DashboardOverview />}
      {currentPage === 'assistants' && (
        <AssistantsList
          onCreateNew={handleCreateAssistant}
          onEdit={handleEditAssistant}
        />
      )}
      {currentPage === 'widgets' && <WidgetManager />}
      {currentPage === 'phone-numbers' && (
        <div className="text-center py-12">
          <Phone className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">Phone Numbers</h3>
          <p className="text-gray-500">Phone number management coming soon</p>
        </div>
      )}
      {currentPage === 'calls' && (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">Call Logs</h3>
          <p className="text-gray-500">Call management coming soon</p>
        </div>
      )}
      {currentPage === 'webhooks' && (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">Webhooks</h3>
          <p className="text-gray-500">Webhook management coming soon</p>
        </div>
      )}
      {currentPage === 'team' && (
        <div className="text-center py-12">
          <User className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">Team Management</h3>
          <p className="text-gray-500">Team features coming soon</p>
        </div>
      )}
      {currentPage === 'billing' && (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">Billing</h3>
          <p className="text-gray-500">Billing management coming soon</p>
        </div>
      )}
      {currentPage === 'api-keys' && (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">API Keys</h3>
          <p className="text-gray-500">API key management coming soon</p>
        </div>
      )}
      {currentPage === 'settings' && (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <h3 className="text-xl font-semibold mb-2 text-gray-400">Settings</h3>
          <p className="text-gray-500">Settings management coming soon</p>
        </div>
      )}
    </DashboardLayout>
  );
}

function AuthPage({ isSignUp }: { isSignUp: boolean }) {
  const [showSignUp, setShowSignUp] = React.useState(isSignUp);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full animate-pulse delay-1000"></div>
      </div>

      {showSignUp ? (
        <RegisterForm
          onSwitchToLogin={() => setShowSignUp(false)}
          onBack={() => window.location.href = '/'}
        />
      ) : (
        <LoginForm
          onSwitchToRegister={() => setShowSignUp(true)}
          onBack={() => window.location.href = '/'}
        />
      )}
    </div>
  );
}

function AppContent() {
  return (
    <>
      {/* Meta Pixel base load */}
      <MetaPixel />

      {/* Tracks page views on route changes */}
      <MetaPixelTracker />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/onboarding-booking" element={<OnboardingBookingPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/login" element={<AuthPage isSignUp={false} />} />
        <Route path="/register" element={<AuthPage isSignUp={true} />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
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