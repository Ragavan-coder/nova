import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Database, Fingerprint, ArrowRight } from 'lucide-react';

interface LandingScreenProps {
  onLoginClick: () => void;
  onPublicVerifyClick: () => void;
}

export default function LandingScreen({ onLoginClick, onPublicVerifyClick }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/30 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <header className="p-6 md:px-12 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold tracking-tight text-white">PROJECT<span className="text-blue-500">NOVA</span></h1>
        </div>
        <button 
          onClick={onLoginClick}
          className="px-6 py-2 rounded-full border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors font-medium text-sm flex items-center gap-2"
        >
          Portal Access <ArrowRight className="w-4 h-4" />
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-block mb-4 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold tracking-widest uppercase">
            Blockchain Pharmaceutical Supply Chain
          </div>
          <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            Securing the Future of <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Healthcare Supply
            </span>
          </h2>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            High-trust, immutable tracking for medicines from manufacturer to patient. Empowering transparency and fighting counterfeits through Hyperledger Fabric.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mx-auto">
            <button 
              onClick={onLoginClick}
              className="px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] flex items-center justify-center gap-3 w-full sm:w-auto"
            >
              Access Secure Portal <ShieldCheck className="w-5 h-5" />
            </button>
            <button 
              onClick={onPublicVerifyClick}
              className="px-8 py-4 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-lg transition-all flex items-center justify-center gap-3 w-full sm:w-auto"
            >
              Public Verify
            </button>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-6xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm text-left hover:border-blue-500/30 transition-colors"
          >
            <div className="bg-blue-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <Database className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Immutability</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Powered by Hyperledger Fabric. Every transaction is permanently recorded and cryptographically secured, ensuring a single source of truth.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm text-left hover:border-emerald-500/30 transition-colors"
          >
            <div className="bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Anti-Counterfeiting</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Verify provenance instantly. Smart contracts prevent fraudulent entries and ensure every batch is authentic from origin to destination.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-slate-900/50 border border-slate-800 p-8 rounded-3xl backdrop-blur-sm text-left hover:border-blue-500/30 transition-colors"
          >
            <div className="bg-blue-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
              <Fingerprint className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Transparency</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Real-time visibility for authorized stakeholders. Track temperature, location, and chain of custody with role-based access control.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
