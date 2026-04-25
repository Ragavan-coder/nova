import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, LayoutDashboard, QrCode, PlusCircle, LogOut,
  Factory, Truck, Building2, User, ArrowRight, Bell
} from 'lucide-react';
import VerificationScreen from './components/VerificationScreen';
import DashboardScreen from './components/DashboardScreen';
import ManufacturerForm from './components/RoleForms/ManufacturerForm';
import DistributorForm from './components/RoleForms/DistributorForm';
import HospitalForm from './components/RoleForms/HospitalForm';
import PatientForm from './components/RoleForms/PatientForm';
import LandingScreen from './components/LandingScreen';
import LoginScreen from './components/LoginScreen';
import TermsModal from './components/TermsModal';
import { useBlockchainStore } from './lib/store';

// Role metadata
const ROLE_META: Record<string, { icon: any; color: string; action: string; step: number }> = {
  Manufacturer: { icon: Factory,   color: 'blue',   action: 'Mint Batch',        step: 0 },
  Distributor:  { icon: Truck,     color: 'cyan',   action: 'Log Shipment',       step: 1 },
  Hospital:     { icon: Building2, color: 'purple', action: 'Accept Delivery',    step: 2 },
  Patient:      { icon: User,      color: 'emerald',action: 'Scan & Verify',      step: 3 },
};

// Workflow pipeline shown at top of app
function WorkflowBar({ userRole }: { userRole: string }) {
  const steps = [
    { label: 'Manufacturer', icon: Factory,   key: 'Manufacturer' },
    { label: 'Distributor',  icon: Truck,     key: 'Distributor'  },
    { label: 'Hospital',     icon: Building2, key: 'Hospital'     },
    { label: 'Patient',      icon: User,      key: 'Patient'      },
  ];
  const currentStep = ROLE_META[userRole]?.step ?? -1;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl px-5 py-3 flex items-center gap-1 shadow-sm overflow-x-auto mb-6">
      {steps.map((s, i) => {
        const isActive  = s.key === userRole;
        const isDone    = i < currentStep;
        const isPending = i > currentStep;
        return (
          <div key={s.key} className="flex items-center gap-1 shrink-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all
              ${isActive  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'  : ''}
              ${isDone    ? 'bg-emerald-100 text-emerald-700'                  : ''}
              ${isPending ? 'bg-slate-100 text-slate-400'                      : ''}
            `}>
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
              {isDone    && <span className="text-emerald-600">✓</span>}
              {isActive  && <span className="text-blue-200 animate-pulse">●</span>}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className={`w-4 h-4 mx-0.5 shrink-0 ${isDone ? 'text-emerald-400' : 'text-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [isPublicView, setIsPublicView] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('batchId')) {
      setTermsAccepted(true);
      setAuthState('app');
      setUserRole('Patient');
      setActiveTab('verify');
      setIsPublicView(true);
    }
  }, []);

  const [termsAccepted, setTermsAccepted] = useState(
    () => localStorage.getItem('nova_terms_accepted') === 'true'
  );
  const [authState, setAuthState] = useState<'landing' | 'login' | 'app'>('landing');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'action' | 'verify'>('dashboard');
  const [userRole, setUserRole] = useState('');

  const store = useBlockchainStore();
  const meta = ROLE_META[userRole];

  const handleAcceptTerms = () => {
    localStorage.setItem('nova_terms_accepted', 'true');
    setTermsAccepted(true);
  };
  const handleLogout = () => { setAuthState('landing'); setUserRole(''); setActiveTab('dashboard'); };

  if (authState === 'landing') {
    return (
      <>
        {!termsAccepted && <TermsModal onAccept={handleAcceptTerms} />}
        <LandingScreen 
          onLoginClick={() => termsAccepted && setAuthState('login')} 
          onPublicVerifyClick={() => {
            if (termsAccepted) {
              setAuthState('app');
              setUserRole('Patient');
              setActiveTab('verify');
              setIsPublicView(true);
            }
          }}
        />
      </>
    );
  }
  if (authState === 'login') {
    return (
      <LoginScreen
        onBack={() => setAuthState('landing')}
        onLoginSuccess={(role) => { setUserRole(role); setAuthState('app'); setActiveTab('dashboard'); }}
      />
    );
  }

  // ── Color map ────────────────────────────────────────
  const colorMap: Record<string, string> = {
    blue:    'bg-blue-600 text-white shadow-blue-200',
    cyan:    'bg-cyan-600 text-white shadow-cyan-200',
    purple:  'bg-purple-600 text-white shadow-purple-200',
    emerald: 'bg-emerald-600 text-white shadow-emerald-200',
  };
  const activeColor = meta ? colorMap[meta.color] : 'bg-blue-600 text-white';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      {/* ── Top Header ─────────────────────────────── */}
      {!isPublicView && (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-900 p-2 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-800 leading-none">
                PROJECT<span className="text-blue-600 font-black">NOVA</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">
                {userRole} · Hyperledger Fabric
              </p>
            </div>
          </div>

          {/* Navigation — role-gated */}
          <nav className="flex bg-slate-50 rounded-full p-1 border border-slate-200 shadow-sm overflow-x-auto gap-1">
            {/* Dashboard — everyone */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2
                ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            {/* Role action — Manufacturer/Distributor/Hospital/Patient */}
            {userRole && (
              <button
                onClick={() => setActiveTab('action')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2
                  ${activeTab === 'action' ? `${activeColor} shadow-md` : 'text-slate-500 hover:text-slate-800'}`}
              >
                {meta && <meta.icon className="w-4 h-4" />}
                <span className="hidden sm:inline">{meta?.action}</span>
              </button>
            )}

            {/* Verify tab — ONLY for Patient */}
            {userRole === 'Patient' && (
              <button
                onClick={() => setActiveTab('verify')}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2
                  ${activeTab === 'verify' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Verify QR</span>
              </button>
            )}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              {store.stats.alerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
              <Bell className="w-5 h-5 text-slate-400" />
            </div>
            <button onClick={handleLogout} title="Logout" className="text-slate-400 hover:text-slate-700 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-400 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
              {userRole.charAt(0)}
            </div>
          </div>
        </header>
      )}

      {/* ── Main ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col px-6 pt-6 pb-10 max-w-7xl w-full mx-auto">
        
        {isPublicView && (
          <div className="max-w-md mx-auto mb-8 mt-4 flex flex-col items-center justify-center text-center">
            <div className="bg-slate-900 p-4 rounded-2xl mb-4 shadow-lg shadow-slate-900/20 border border-slate-800">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800 leading-none mb-2">
              PROJECT<span className="text-blue-600">NOVA</span>
            </h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Public Verification Portal</p>
          </div>
        )}

        {/* Workflow pipeline bar */}
        {!isPublicView && <WorkflowBar userRole={userRole} />}

        {/* Role badge + step description */}
        {!isPublicView && userRole && (
          <div className="flex items-center gap-3 mb-5">
            <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${activeColor}`}>
              {meta && <meta.icon className="w-3.5 h-3.5" />}
              {userRole}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {userRole === 'Manufacturer' && 'Step 1 of 4 · CREATE batch · No verify access'}
              {userRole === 'Distributor'  && 'Step 2 of 4 · TRANSFER batch · No verify access'}
              {userRole === 'Hospital'     && 'Step 3 of 4 · APPROVE batch · No verify access'}
              {userRole === 'Patient'      && 'Step 4 of 4 · VERIFY & view supply chain history'}
            </p>
          </div>
        )}

        {/* Content panels */}
        {activeTab === 'dashboard' && <DashboardScreen store={store} />}

        {/* Verify — PATIENT ONLY */}
        {activeTab === 'verify' && userRole === 'Patient' && <VerificationScreen store={store} />}

        {/* Access denied for non-patient trying to reach verify */}
        {activeTab === 'verify' && userRole !== 'Patient' && (
          <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
            <p className="text-slate-500 max-w-sm">Verification is restricted to the <strong>Patient (End User)</strong> role only. Your role is <strong>{userRole}</strong>.</p>
          </div>
        )}

        {/* Role-specific action forms */}
        {activeTab === 'action' && userRole === 'Manufacturer' && (
          <ManufacturerForm store={store} onSuccess={() => setActiveTab('dashboard')} />
        )}
        {activeTab === 'action' && userRole === 'Distributor' && (
          <DistributorForm store={store} onSuccess={() => setActiveTab('dashboard')} />
        )}
        {activeTab === 'action' && userRole === 'Hospital' && (
          <HospitalForm store={store} onSuccess={() => setActiveTab('dashboard')} />
        )}
        {activeTab === 'action' && userRole === 'Patient' && (
          <PatientForm store={store} onSuccess={() => setActiveTab('dashboard')} />
        )}
      </main>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-slate-100 px-6 py-3 flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-slate-400 bg-white">
        <div className="flex gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Node: HYP-AF-01
          </span>
          <span className="hidden sm:inline">Block Height: #492,019</span>
          <span className="hidden md:inline">Network Latency: 24ms</span>
        </div>
        <div className="flex gap-4">
          <span className="hidden sm:inline hover:text-blue-600 cursor-pointer">Docs</span>
          <span>© 2026 PROJECT NOVA</span>
        </div>
      </footer>
    </div>
  );
}
