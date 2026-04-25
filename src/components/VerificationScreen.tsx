import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShieldCheck, AlertTriangle, CheckCircle, PackageSearch, Thermometer, MapPin, ShieldAlert, FileText, Activity, Database, Truck } from 'lucide-react';
import { useBlockchainStore } from '../lib/store';
import { VaccineBatch } from '../lib/types';

import { API_BASE } from '../lib/api';

export default function VerificationScreen({ store }: { store: ReturnType<typeof useBlockchainStore> }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedBatch, setSearchedBatch] = useState<VaccineBatch | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlBatchId = params.get('batchId');
    if (urlBatchId && !hasSearched) {
      setSearchQuery(urlBatchId);
      setTimeout(() => {
        const btn = document.getElementById('verify-search-btn');
        if (btn) btn.click();
      }, 300);
    }
  }, [hasSearched]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    let result = store.verifyBatch(searchQuery.trim());
    
    // Fallback for mobile devices scanning QR codes (won't have local storage data)
    if (!result) {
      try {
        const res = await fetch(`${API_BASE}/api/batch/${searchQuery.trim()}`);
        const data = await res.json();
        if (data.success && data.batch) {
          result = data.batch;
        }
      } catch (err) {
        console.error('Failed to fetch batch from server', err);
      }
    }

    if (!result) {
      if (store.incrementFailedAttempts()) {
        store.resetFailedAttempts();
        try {
          await fetch(`${API_BASE}/api/tamper-alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              batchId: searchQuery.trim() || 'UNKNOWN_BATCH',
              medicineName: 'Unknown',
              reason: 'Multiple brute-force verification attempts detected.',
              location: 'Public Verification Portal'
            })
          });
        } catch (e) {}
      }
    }
    
    setSearchedBatch(result);
    setHasSearched(true);
    setIsSearching(false);

    if (result && result.currentStatus === 'TAMPERED') {
      try {
        await fetch(`${API_BASE}/api/tamper-alert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId: result.batchId,
            medicineName: result.name,
            reason: 'Compromised batch detected during verification search.',
            location: 'Public Verification Portal'
          })
        });
      } catch (err) {
        console.error('Failed to trigger tamper alert', err);
      }
    }
  };

  const handleDownloadCertificate = () => {
    if (!searchedBatch) return;
    
    const certEvent = searchedBatch.events[searchedBatch.events.length - 1];
    const cert = certEvent.certificate;
    
    let content = `====================================================\n`;
    content += `         PROJECT NOVA IMMUTABLE CERTIFICATE         \n`;
    content += `====================================================\n\n`;
    content += `MEDICINE: ${searchedBatch.name}\n`;
    content += `BATCH ID: ${searchedBatch.batchId}\n`;
    content += `MANUFACTURER: ${searchedBatch.manufacturer}\n`;
    content += `EXPIRY DATE: ${new Date(searchedBatch.expiryDate).toLocaleDateString()}\n`;
    content += `STATUS: ${searchedBatch.currentStatus}\n\n`;
    
    if (searchedBatch.masterTransactionId) {
      content += `MASTER TRANSACTION ID (SHA-256): \n${searchedBatch.masterTransactionId}\n\n`;
    }
    
    if (cert) {
      content += `--- DIGITAL SIGNATURE (HYPERLEDGER FABRIC CA) ---\n`;
      content += `CERTIFICATE ID: ${cert.certId}\n`;
      content += `ISSUED BY: ${cert.issuedBy}\n`;
      content += `COMMON NAME: ${cert.commonName}\n`;
      content += `ALGORITHM: ${cert.signatureAlgo}\n`;
      content += `PUBLIC KEY: ${cert.publicKey}\n`;
      content += `VALID UNTIL: ${new Date(cert.validUntil).toLocaleDateString()}\n`;
      content += `SIGNATURE VALID: ${cert.signatureValid ? 'YES' : 'NO'}\n`;
    }
    
    content += `\n====================================================\n`;
    content += `This document is cryptographically verifiable on the \n`;
    content += `Project NOVA Blockchain Network.\n`;
    content += `====================================================\n`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate_${searchedBatch.batchId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col flex-1 h-full px-2 sm:px-0">
      {/* Search Bar */}
      {!searchedBatch && (
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 mb-6 sm:mb-8 max-w-3xl mx-auto w-full">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1 sm:mb-2 mt-1 sm:mt-2">Verify Vaccine Authenticity</h2>
          <p className="text-slate-500 text-sm sm:text-base mb-5 sm:mb-8">Enter the Batch ID to verify its journey on the blockchain ledger.</p>
          
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="e.g., BCH-2023-A01"
                className="w-full pl-12 pr-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-800 bg-slate-50 font-mono text-base sm:text-lg shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              id="verify-search-btn"
              type="submit"
              disabled={isSearching}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl sm:rounded-2xl font-bold transition-colors shadow-sm text-base sm:text-lg flex items-center justify-center min-w-[120px] sm:min-w-[140px]"
            >
              {isSearching ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Verify"
              )}
            </button>
          </form>
          
        </div>
      )}

      {hasSearched && !searchedBatch && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-red-200 flex items-center gap-3 sm:gap-4 max-w-3xl mx-auto w-full"
        >
          <div className="p-2 sm:p-3 bg-red-100 rounded-xl sm:rounded-2xl shrink-0">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-red-800 font-bold text-base sm:text-xl uppercase tracking-tight">Invalid / Not Found</h3>
            <p className="text-red-600 font-medium mt-1 text-sm">The requested Batch ID does not exist on the blockchain.</p>
          </div>
        </motion.div>
      )}

      {searchedBatch && (
        <motion.div 
          key="batch-details"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:gap-5 flex-1"
        >
          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <button onClick={() => {setSearchedBatch(null); setSearchQuery('');}} className="text-blue-600 hover:text-blue-800 uppercase text-[10px] sm:text-xs font-bold tracking-widest flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 rounded-xl transition-colors">
               Back to Search
            </button>
          </div>

          {/* Main Content Grid - stacks on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
            {/* Verification Result Card */}
            <div className="col-span-1 md:col-span-8 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start mb-4 sm:mb-8 gap-3 sm:gap-4">
                <div>
                  {searchedBatch.currentStatus === 'SAFE' ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified on Blockchain
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 border border-red-200">
                      <ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> Alert: Tampered
                    </span>
                  )}
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mt-3 sm:mt-4 text-slate-900">{searchedBatch.name}</h2>
                  <p className="text-slate-500 mt-1 text-sm">Manufacturer: <span className="text-slate-900 font-semibold">{searchedBatch.manufacturer}</span></p>
                </div>
                <div className="sm:text-right bg-slate-50 p-3 sm:p-4 border border-slate-100 rounded-xl sm:rounded-2xl w-full sm:w-auto">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Batch ID</p>
                  <p className="text-base sm:text-xl font-mono text-blue-600 font-bold mt-1">#{searchedBatch.batchId}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mt-2 sm:mt-4">
                <div className="bg-slate-50 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100">
                  <p className="text-[10px] sm:text-xs text-slate-500 uppercase mb-1 font-bold tracking-wider">Expiry Date</p>
                  <p className="text-base sm:text-lg font-semibold text-slate-800">{new Date(searchedBatch.expiryDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100">
                  <p className="text-[10px] sm:text-xs text-slate-500 uppercase mb-1 font-bold tracking-wider">Current Temp</p>
                  {(() => {
                    const temp = searchedBatch.events[searchedBatch.events.length - 1].temperature;
                    const isSafe = temp >= 2 && temp <= 8;
                    return (
                      <p className={`text-base sm:text-lg font-semibold flex items-baseline gap-1 ${isSafe ? 'text-green-600' : 'text-red-600'}`}>
                        {temp.toFixed(1)}°C 
                        {isSafe ? <span className="text-[10px] text-slate-400 font-normal ml-1">(Optimal)</span> : <span className="text-[9px] sm:text-[10px] uppercase font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-2 tracking-wider">Breach</span>}
                      </p>
                    );
                  })()}
                </div>
                <div className="bg-slate-50 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100">
                  <p className="text-[10px] sm:text-xs text-slate-500 uppercase mb-1 font-bold tracking-wider">Last Location</p>
                  <p className="text-base sm:text-lg font-semibold text-slate-800 truncate" title={searchedBatch.events[searchedBatch.events.length - 1].location}>
                    {searchedBatch.events[searchedBatch.events.length - 1].location}
                  </p>
                </div>
              </div>

              {/* Hash + Download Certificate */}
              <div className="mt-6 sm:mt-auto pt-5 sm:pt-8 border-t border-slate-100 flex flex-col gap-4">
                <div className="flex items-center gap-3 sm:gap-4 w-full">
                  <div className="bg-blue-50 p-2 sm:p-3 rounded-xl border border-blue-100 shrink-0">
                    <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                  </div>
                  <div className="overflow-hidden flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Blockchain Immutable Hash</p>
                    <p className="text-xs sm:text-sm font-mono text-slate-600 truncate" title={searchedBatch.events[searchedBatch.events.length - 1].txId}>
                      {searchedBatch.events[searchedBatch.events.length - 1].txId}
                    </p>
                  </div>
                </div>
                <button onClick={handleDownloadCertificate} className="px-5 sm:px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 active:bg-emerald-800 transition-colors w-full flex justify-center items-center gap-2 shadow-sm">
                  <FileText className="w-4 h-4" /> ⬇ Download Certificate
                </button>
              </div>
            </div>

            {/* Alert Panel or Safe Status Panel */}
            {searchedBatch.currentStatus === 'TAMPERED' ? (
              <div className="col-span-1 md:col-span-4 bg-red-50 border border-red-100 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col shadow-sm">
                <div className="flex items-center gap-3 text-red-600 mb-4 sm:mb-6">
                  <div className="bg-red-100 p-2 rounded-xl">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight uppercase tracking-wide">Tamper Alert</h3>
                </div>
                <p className="text-red-700 text-sm font-medium mb-4 sm:mb-5 leading-relaxed">
                  Batch #{searchedBatch.batchId} flagged for attention. The integrity of this vaccine is compromised.
                </p>
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-red-200 shadow-sm mt-auto">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Breach Type</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-red-600 text-white px-2.5 py-1 rounded-md">Critical</span>
                  </div>
                  {(() => {
                    const badEvent = searchedBatch.events.find(e => e.temperature < 2 || e.temperature > 8);
                    return (
                      <>
                        <p className="text-sm font-bold text-slate-800 mt-1">Temperature Out of Range ({badEvent?.temperature.toFixed(1)}°C)</p>
                        <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> Detected at {badEvent?.location}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="col-span-1 md:col-span-4 bg-blue-600 border border-blue-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col justify-between items-center text-center shadow-md relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full opacity-20 blur-2xl"></div>
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500 rounded-full opacity-20 blur-2xl"></div>
                <div className="relative z-10 w-full">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border-4 border-blue-400 shadow-inner">
                    <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <h3 className="font-bold text-xl sm:text-2xl text-white mb-2">Shipment Safe</h3>
                  <p className="text-blue-100 text-sm font-medium">Transit parameters are within optimal range (2°C–8°C).</p>
                </div>
                <div className="w-full bg-blue-700/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-blue-500 shadow-sm mt-4 sm:mt-6 relative z-10">
                  <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest text-left mb-1">Next Expected Scan</p>
                  <p className="text-sm font-semibold text-white text-left">Destination Hospital Hub</p>
                </div>
              </div>
            )}
          </div>

          {/* Ledger Timeline */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 md:px-10 border border-slate-100 shadow-sm overflow-hidden mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-10 gap-3 sm:gap-4">
              <h3 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Immutable Supply Chain Timeline
              </h3>
              <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] text-green-700 font-mono tracking-wide uppercase font-bold">Real-time Node Sync</span>
              </div>
            </div>
            
            {/* Mobile vertical timeline */}
            <div className="block sm:hidden">
              {searchedBatch.events.map((event, index) => {
                const isAnomaly = event.temperature < 2 || event.temperature > 8;
                return (
                  <div key={event.txId} className="flex gap-3 mb-4 last:mb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full border-[3px] shadow-sm flex items-center justify-center text-[10px] font-bold shrink-0 ${isAnomaly ? 'bg-red-500 text-white border-red-200' : 'bg-blue-600 text-white border-blue-200'}`}>
                        0{index + 1}
                      </div>
                      {index < searchedBatch.events.length - 1 && (
                        <div className={`w-0.5 flex-1 mt-1 ${isAnomaly ? 'bg-red-200' : 'bg-blue-200'}`}></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`text-sm font-bold ${isAnomaly ? 'text-red-600' : 'text-slate-800'}`}>{event.type.charAt(0) + event.type.slice(1).toLowerCase()}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{event.location}</p>
                      <div className="flex items-center gap-3 mt-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                        <p className={`text-xs font-bold ${isAnomaly ? 'text-red-600' : 'text-green-600'}`}>{event.temperature.toFixed(1)}°C</p>
                        <p className="text-[9px] font-mono text-slate-400 truncate flex-1" title={event.txId}>{event.txId}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop horizontal timeline */}
            <div className="hidden sm:block relative overflow-x-auto pb-6 custom-scrollbar">
              <div className="min-w-[600px] flex items-center relative py-2">
                <div className="absolute h-1 bg-slate-100 top-1/2 left-10 right-[150px] -translate-y-1/2 z-0 rounded-full"></div>
                <div className="flex-1 flex justify-between relative z-10 px-4">
                  {searchedBatch.events.map((event, index) => {
                    const isAnomaly = event.temperature < 2 || event.temperature > 8;
                    const prevIsAnomaly = index > 0 && (searchedBatch.events[index-1].temperature < 2 || searchedBatch.events[index-1].temperature > 8);
                    return (
                      <div key={event.txId} className="flex flex-col items-center w-32 relative">
                        {index > 0 && (
                          <div className={`absolute h-1 top-5 right-[50%] w-full -translate-y-1/2 -z-10 ${isAnomaly || prevIsAnomaly ? 'bg-red-200' : 'bg-blue-600'}`}></div>
                        )}
                        <div className={`w-10 h-10 rounded-full border-4 shadow-sm flex items-center justify-center text-xs font-bold shrink-0 ${isAnomaly ? 'bg-red-500 text-white border-red-100' : 'bg-blue-600 text-white border-blue-100'}`}>
                          0{index + 1}
                        </div>
                        <p className={`text-xs font-bold mt-4 text-center ${isAnomaly ? 'text-red-600' : 'text-slate-800'}`}>{event.type.charAt(0) + event.type.slice(1).toLowerCase()}</p>
                        <p className="text-[10px] text-slate-500 text-center font-medium mt-1 leading-tight">{event.location}</p>
                        <div className="flex flex-col items-center mt-3 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 shadow-sm w-full">
                          <p className={`text-xs font-bold ${isAnomaly ? 'text-red-600' : 'text-green-600'}`}>{event.temperature.toFixed(1)}°C</p>
                          <p className="text-[9px] font-mono text-slate-400 mt-1 truncate w-[80px] text-center" title={event.txId}>{event.txId}</p>
                        </div>
                      </div>
                    );
                  })}
                  {searchedBatch.events[searchedBatch.events.length - 1].type !== 'DELIVERED' && (
                    <div className="flex flex-col items-center w-32 opacity-50 relative">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border-4 border-white shadow-sm flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                        0{searchedBatch.events.length + 1}
                      </div>
                      <p className="text-xs font-bold mt-4 text-center text-slate-400 uppercase tracking-widest">Pending</p>
                      <p className="text-[10px] text-slate-400 text-center font-medium mt-1">Next Expected Scan</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
        </motion.div>
      )}
    </div>
  );
}
