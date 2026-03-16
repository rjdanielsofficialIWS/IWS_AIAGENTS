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
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { AssistantsList } from './components/assistants/AssistantsList';
import { AssistantBuilder } from './components/assistants/AssistantBuilder';
import { WidgetManager } from './components/widgets/WidgetManager';
import { DemoPagesManager } from './components/demo-pages/DemoPagesManager';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsAndConditionsPage } from './components/TermsAndConditionsPage';
import { PostizCallbackPage } from './components/auth/PostizCallbackPage';

import { Brain, Phone, MessageSquare, User, Zap, Video, Share2, Sparkles, CalendarDays, Mic } from 'lucide-react';
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
      {currentPage === 'dashboard' && <DashboardOverview />}
      {currentPage === 'assistants' && (
        <AssistantsList onCreateNew={handleCreateAssistant} onEdit={handleEditAssistant} />
      )}
      {currentPage === 'widgets' && <WidgetManager />}
      {currentPage === 'demo-pages' && <DemoPagesManager />}
    </DashboardLayout>
  );
}

const AUTH_FEATURES = [
  {
    icon: <Video className="h-4 w-4" />,
    title: 'AI Video Generation',
    desc: 'Turn any image into cinematic AI video in seconds with Kling v3 Pro',
  },
  {
    icon: <Share2 className="h-4 w-4" />,
    title: 'Multi-Platform Publishing',
    desc: 'Auto-schedule and publish to Instagram, TikTok, LinkedIn, YouTube & more',
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: 'AI Caption Generator',
    desc: 'Scroll-stopping captions engineered for every platform and audience',
  },
  {
    icon: <CalendarDays className="h-4 w-4" />,
    title: 'AI Content Strategist',
    desc: '30-day content calendars, hook libraries, and full platform strategies',
  },
  {
    icon: <Mic className="h-4 w-4" />,
    title: 'AI Voice Agents',
    desc: '24/7 automated conversations that qualify leads and close clients',
  },
];

function AuthPage({ isSignUp }: { isSignUp: boolean }) {
  const [showSignUp, setShowSignUp] = React.useState(isSignUp);

  React.useEffect(() => {
    document.title = showSignUp
      ? 'Create Account | MediaMachine — AI Social Media Automation Platform'
      : 'Sign In | MediaMachine — AI Social Media Automation Platform';
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute('content',
        'MediaMachine by Infinite Wealth Solutions AI — AI video generation, multi-platform publishing, AI caption generator, content strategy, and voice agents all in one platform. Grow your brand faster with AI.'
      );
    }
  }, [showSignUp]);

  return (
    <div className="min-h-screen flex bg-black text-white">
      {/* ─── Left marketing panel (desktop only) ─── */}
      <div className="hidden lg:flex lg:w-[56%] flex-col p-12 xl:p-16 relative overflow-hidden bg-gradient-to-br from-[#090d12] via-[#0b0f14] to-black">
        {/* Background glow orbs */}
        <div className="auth-float absolute top-16 left-4 w-80 h-80 bg-yellow-400/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="auth-float-delayed absolute bottom-24 right-0 w-[28rem] h-[28rem] bg-amber-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        <div className="auth-glow-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-400/[0.03] rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <button
          onClick={() => (window.location.href = '/')}
          className="auth-fade-in-up flex items-center gap-3 w-fit hover:opacity-80 transition-opacity"
          style={{ animationDelay: '0ms' }}
          aria-label="MediaMachine home"
        >
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-400/20">
              <Zap className="h-5 w-5 text-black" />
            </div>
            <span className="absolute inset-0 rounded-xl bg-yellow-400/30 animate-ping opacity-0 group-hover:opacity-100" style={{ animationDuration: '2s' }} />
          </div>
          <div className="text-left">
            <div className="text-white font-extrabold text-xl leading-none tracking-tight">MediaMachine</div>
            <div className="text-yellow-400/60 text-[11px] mt-0.5">by Infinite Wealth Solutions AI</div>
          </div>
        </button>

        {/* Main headline */}
        <div className="flex-1 flex flex-col justify-center mt-10 mb-8">
          <div
            className="auth-fade-in-up inline-flex items-center gap-2 w-fit bg-yellow-400/10 border border-yellow-400/20 rounded-full px-3 py-1 mb-5"
            style={{ animationDelay: '80ms' }}
          >
            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-yellow-400 text-[11px] font-semibold tracking-wide uppercase">AI-Powered Content Engine</span>
          </div>

          <h1
            className="auth-fade-in-up text-[2.6rem] xl:text-5xl font-black leading-[1.1] tracking-tight mb-4"
            style={{ animationDelay: '140ms' }}
          >
            Turn Content Into<br />
            <span className="auth-shimmer-text">Paying Clients</span>
          </h1>

          <p
            className="auth-fade-in-up text-gray-400 text-base xl:text-lg leading-relaxed mb-8 max-w-md"
            style={{ animationDelay: '200ms' }}
          >
            The all-in-one AI platform that creates, optimizes, and publishes content
            across every platform — so you can focus on running your business.
          </p>

          {/* Feature cards */}
          <div className="space-y-2.5">
            {AUTH_FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="auth-fade-in-up auth-feature-card flex items-start gap-3.5 p-2.5 rounded-xl border border-transparent"
                style={{ animationDelay: `${260 + i * 55}ms` }}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/15 flex items-center justify-center text-yellow-400 mt-0.5">
                  {f.icon}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm leading-snug">{f.title}</div>
                  <div className="text-gray-500 text-xs leading-relaxed mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats footer */}
        <div
          className="auth-fade-in-up grid grid-cols-3 gap-3 border-t border-gray-800/50 pt-6"
          style={{ animationDelay: '560ms' }}
        >
          {[
            { value: '10+', label: 'Social Platforms' },
            { value: '30-Day', label: 'Content Calendars' },
            { value: '5-in-1', label: 'AI Toolset' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-yellow-400 font-black text-xl tracking-tight">{s.value}</div>
              <div className="text-gray-600 text-[11px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right form panel ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-br from-gray-900 via-[#0d0d0d] to-black min-h-screen">
        {/* Mobile branding */}
        <div className="lg:hidden mb-8 text-center auth-fade-in-up">
          <button onClick={() => (window.location.href = '/')} className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-black" />
            </div>
            <span className="text-white font-bold text-lg">MediaMachine</span>
          </button>
          <div className="text-gray-600 text-[11px] mt-1">by Infinite Wealth Solutions AI</div>
        </div>

        {showSignUp ? (
          <RegisterForm onSwitchToLogin={() => setShowSignUp(false)} onBack={() => (window.location.href = '/')} />
        ) : (
          <LoginForm onSwitchToRegister={() => setShowSignUp(true)} onBack={() => (window.location.href = '/')} />
        )}

        <p className="mt-5 text-gray-700 text-xs text-center max-w-xs">
          By continuing, you agree to our{' '}
          <a href="/terms-and-conditions" className="text-gray-500 hover:text-gray-400 underline underline-offset-2 transition-colors">Terms</a>
          {' & '}
          <a href="/privacy-policy" className="text-gray-500 hover:text-gray-400 underline underline-offset-2 transition-colors">Privacy Policy</a>
        </p>
      </div>
    </div>
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
        <Route path="/MediaMachine" element={<MediaDistributionPage />} />

        <Route path="/onboarding-booking" element={<OnboardingBookingPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />

        <Route path="/login" element={<AuthPage isSignUp={false} />} />
        <Route path="/register" element={<AuthPage isSignUp={true} />} />

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