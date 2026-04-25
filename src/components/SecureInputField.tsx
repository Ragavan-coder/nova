import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { validateField, hasFileExtension, isSuspicious, FieldRule, sanitize } from '../lib/validation';

interface SecureInputFieldProps {
  label: string;
  field: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  rules?: FieldRule;
  formData: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  /** Errors pushed from parent-level form validation */
  externalError?: string;
}

export function SecureInputField({
  label, field, type = 'text', placeholder = '',
  required = true, maxLength = 200, rules = {},
  formData, setFormData, externalError
}: SecureInputFieldProps) {
  const [touched, setTouched] = useState(false);
  const [localError, setLocalError] = useState('');

  const isNum = type === 'number';
  const value = (formData as any)[field] ?? '';

  const validate = (val: string) => {
    if (hasFileExtension(val)) {
      setLocalError('File uploads are not allowed ❌');
      return;
    }
    if (isSuspicious(val)) {
      setLocalError('Suspicious data detected ❌');
      return;
    }
    const errs = validateField(field, val, { required, maxLength, ...rules });
    setLocalError(errs.length > 0 ? errs[0].message : '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // Immediately block any file extension typed/pasted
    if (hasFileExtension(val)) {
      setLocalError('File uploads are not allowed ❌');
      return; // don't update state
    }
    if (isSuspicious(val)) {
      setLocalError('Suspicious data detected ❌');
      return;
    }

    // Number fields: strip non-numeric
    if (isNum) val = val.replace(/[^0-9.]/g, '');

    // Max length hard-limit
    if (val.length > maxLength) val = val.slice(0, maxLength);

    setFormData((p: any) => ({ ...p, [field]: val }));
    if (touched) validate(val);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (hasFileExtension(pasted) || isSuspicious(pasted)) {
      e.preventDefault();
      setLocalError(hasFileExtension(pasted) ? 'File uploads are not allowed ❌' : 'Suspicious data detected ❌');
    }
  };

  const handleBlur = () => {
    setTouched(true);
    validate(value);
  };

  const displayError = externalError || (touched ? localError : '');
  const hasError = !!displayError;
  const isSafe = touched && !hasError && value;

  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1 flex items-center gap-1">
        {label}
        {required && <span className="text-red-400">*</span>}
        {isSafe && <span className="text-emerald-500 text-[9px]">✓</span>}
      </label>

      <div className="relative">
        <input
          type={type === 'number' ? 'text' : type}
          inputMode={isNum ? 'decimal' : undefined}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          onBlur={handleBlur}
          maxLength={maxLength}
          autoComplete="off"
          spellCheck="false"
          // Prevent browser file picker for drag-and-drop
          onDrop={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
          className={`w-full px-4 py-3 rounded-xl border outline-none text-slate-800 shadow-inner text-sm transition-all
            ${hasError
              ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
              : isSafe
              ? 'border-emerald-400 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-200'
              : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
        />
        {hasError && (
          <ShieldAlert className="absolute right-3 top-3.5 w-4 h-4 text-red-500 pointer-events-none" />
        )}
      </div>

      {/* Character count */}
      {touched && value.length > maxLength * 0.8 && !hasError && (
        <p className="text-[9px] text-slate-400 text-right">{value.length}/{maxLength}</p>
      )}

      {/* Error message */}
      {hasError && (
        <div className="flex items-center gap-1.5 mt-1">
          <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
          <p className="text-[11px] font-bold text-red-600">{displayError}</p>
        </div>
      )}
    </div>
  );
}

export default SecureInputField;
