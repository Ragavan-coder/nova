import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';

interface MedicineQRProps {
  batchId: string;
  medicineName?: string;
  id?: string;
}

export const MedicineQR: React.FC<MedicineQRProps> = ({ 
  batchId, 
  medicineName = 'Medicine',
  id
}) => {
  if (!batchId) return <div>No provenance data available.</div>;

  const verificationUrl = `${window.location.origin}/?batchId=${batchId}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center p-6 bg-white rounded-2xl border border-slate-100 shadow-sm w-full mt-4"
    >
      <h3 className="text-sm font-bold mb-4 text-slate-800 uppercase tracking-widest">{medicineName} Provenance QR</h3>
      
      <div id={id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
        <QRCodeSVG 
          value={verificationUrl} 
          size={160}
          level="H" 
          includeMargin={true}
          className="rounded-lg"
        />
      </div>
      
      <div className="text-center w-full">
        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">Batch ID</p>
        <p className="text-xs text-slate-600 font-mono break-all bg-slate-50 p-2 rounded-lg border border-slate-100">
          {batchId}
        </p>
      </div>
    </motion.div>
  );
};
