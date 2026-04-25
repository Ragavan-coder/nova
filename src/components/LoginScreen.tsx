import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Factory, Truck, Building2, User, ArrowRight, ShieldCheck, Key, Lock, CheckCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (role: string) => void;
  onBack: () => void;
}

const ROLES = [
  { id: 'Manufacturer', icon: Factory, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { id: 'Distributor', icon: Truck, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { id: 'Hospital', icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { id: 'Patient', icon: User, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
];

const VALID_ACCOUNTS: Record<string, { user: string, pass: string }> = {
  'Manufacturer': { user: 'mfg@nova.com', pass: 'mfg123' },
  'Distributor': { user: 'dist@nova.com', pass: 'dist123' },
  'Hospital': { user: 'hosp@nova.com', pass: 'hosp123' },
  'Patient': { user: 'user@nova.com', pass: 'user123' }
};

export default function LoginScreen({ onLoginSuccess, onBack }: LoginScreenProps) {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    setStep(2);
    setError('');
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const account = VALID_ACCOUNTS[selectedRole];
    if (userId === account.user && password === account.pass) {
      setStep(3);
      setError('');
    } else {
      setError('Invalid Registered User ID or Password.');
    }
  };

  const initializeUserSession = () => {
    console.log("Ready for ECDSA Key Generation and SHA-256 Signing.");
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      setIsVerifying(true);
      setError('');
      setTimeout(() => {
        initializeUserSession();
        onLoginSuccess(selectedRole);
      }, 1500);
    } else {
      setError('Please enter a valid 6-digit OTP.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col relative overflow-hidden items-center justify-center p-6">
      {/* Background elements */}
      <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-md z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-10 cursor-pointer" onClick={onBack}>
          <ShieldCheck className="w-12 h-12 text-blue-500 mb-3" />
          <h1 className="text-2xl font-bold tracking-tight text-white">PROJECT<span className="text-blue-500">NOVA</span></h1>
          <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest font-semibold">Secure Access Portal</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-400"></div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <h2 className="text-xl font-bold text-white mb-6">Select Your Role</h2>
                <div className="grid grid-cols-2 gap-4">
                  {ROLES.map(role => (
                    <button
                      key={role.id}
                      onClick={() => handleRoleSelect(role.id)}
                      className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-800 hover:border-blue-500/50 bg-slate-950/50 hover:bg-slate-800/50 transition-all group"
                    >
                      <div className={`${role.bg} ${role.color} w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <role.icon className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-slate-300 group-hover:text-white">{role.id}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setStep(1)} className="text-slate-500 hover:text-white transition-colors">
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                  <h2 className="text-xl font-bold text-white">Login as {selectedRole}</h2>
                </div>

                <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2 block">Registered User ID</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="email"
                        required
                        placeholder="e.g. mfg@nova.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        value={userId}
                        onChange={e => setUserId(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-2 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="password"
                        required
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

                  <button 
                    type="submit"
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center"
              >
                <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Key className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">2FA Verification</h2>
                <p className="text-slate-400 text-sm mb-6">Enter the 6-digit OTP sent to your registered device.</p>

                <form onSubmit={handleOtpSubmit}>
                  <input 
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 text-center text-2xl tracking-[0.5em] font-mono text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all mb-4"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  />

                  {error && <p className="text-red-400 text-sm font-medium mb-4">{error}</p>}

                  <button 
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify Identity <CheckCircle className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  <button type="button" onClick={() => setStep(2)} className="text-slate-500 text-sm mt-4 hover:text-white" disabled={isVerifying}>
                    Cancel
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
