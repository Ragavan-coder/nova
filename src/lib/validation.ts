/**
 * Project NOVA — Central Input Validation & Sanitization Library
 * All inputs are validated before submission to the blockchain.
 */

// ── Blocklists ────────────────────────────────────────────────────────────────

const BLOCKED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.bat', '.sh', '.cmd', '.msi', '.dmg', '.apk',
  '.zip', '.rar', '.tar', '.gz', '.7z',
  '.js', '.ts', '.py', '.php', '.rb', '.go',
  '.mp4', '.mp3', '.avi', '.mov', '.mkv',
];

// XSS patterns
const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,          // onerror=, onclick=, etc.
  /<iframe/gi,
  /<img[^>]+src\s*=/gi,
  /eval\s*\(/gi,
  /document\.(cookie|write|location)/gi,
  /window\.(location|open)/gi,
  /alert\s*\(/gi,
];

// SQL injection patterns
const SQL_PATTERNS = [
  /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\btruncate\b|\balter\b|\bcreate\b)/gi,
  /--\s/g,
  /;\s*(drop|delete|update|insert)/gi,
  /'\s*(or|and)\s*'?\d/gi,
  /union\s+(all\s+)?select/gi,
  /exec\s*\(/gi,
];

// ── Types ─────────────────────────────────────────────────────────────────────

export type ValidationError = {
  field: string;
  message: string;
  severity: 'error' | 'warning';
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

// ── Core checkers ─────────────────────────────────────────────────────────────

export function hasFileExtension(value: string): boolean {
  const lower = value.toLowerCase();
  return BLOCKED_EXTENSIONS.some(ext => lower.includes(ext));
}

export function hasXSS(value: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

export function hasSQLInjection(value: string): boolean {
  return SQL_PATTERNS.some(pattern => pattern.test(value));
}

export function isSuspicious(value: string): boolean {
  return hasXSS(value) || hasSQLInjection(value);
}

export function isAlphanumeric(value: string): boolean {
  return /^[a-zA-Z0-9\-_]+$/.test(value);
}

export function isValidDate(value: string): boolean {
  if (!value) return false;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!iso) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export function isFutureDate(value: string): boolean {
  return isValidDate(value) && new Date(value) > new Date();
}

// ── Sanitizer ─────────────────────────────────────────────────────────────────

export function sanitize(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

// ── Field-level validator ─────────────────────────────────────────────────────

export interface FieldRule {
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  alphanumeric?: boolean;
  isDate?: boolean;
  isFutureDate?: boolean;
  noFileExtensions?: boolean;
  noScripts?: boolean;
  /** custom regex that must match */
  pattern?: RegExp;
  patternMessage?: string;
}

export function validateField(field: string, value: string, rules: FieldRule): ValidationError[] {
  const errors: ValidationError[] = [];
  const v = (value || '').trim();

  // ── File uploads blocked ─────────────
  if (hasFileExtension(v)) {
    errors.push({ field, message: 'File uploads are not allowed ❌', severity: 'error' });
    return errors; // no further checks needed
  }

  // ── Suspicious data blocked ───────────
  if (isSuspicious(v)) {
    errors.push({ field, message: 'Suspicious data detected ❌', severity: 'error' });
    return errors;
  }

  // ── Required ──────────────────────────
  if (rules.required && !v) {
    errors.push({ field, message: 'This field is required ❌', severity: 'error' });
    return errors;
  }
  if (!v) return errors; // empty + not required = ok

  // ── Length ────────────────────────────
  if (rules.minLength && v.length < rules.minLength)
    errors.push({ field, message: `Minimum ${rules.minLength} characters required ❌`, severity: 'error' });

  if (rules.maxLength && v.length > rules.maxLength)
    errors.push({ field, message: `Maximum ${rules.maxLength} characters allowed ❌`, severity: 'error' });

  // ── Alphanumeric ─────────────────────
  if (rules.alphanumeric && !isAlphanumeric(v))
    errors.push({ field, message: 'Only letters, numbers, hyphens, and underscores allowed ❌', severity: 'error' });

  // ── Date format ───────────────────────
  if (rules.isDate && !isValidDate(v))
    errors.push({ field, message: 'Invalid date format. Use YYYY-MM-DD ❌', severity: 'error' });

  if (rules.isFutureDate && isValidDate(v) && !isFutureDate(v))
    errors.push({ field, message: 'Date must be in the future ❌', severity: 'error' });

  // ── Custom pattern ────────────────────
  if (rules.pattern && !rules.pattern.test(v))
    errors.push({ field, message: rules.patternMessage || 'Invalid input format ❌', severity: 'error' });

  return errors;
}

// ── Batch-validate a whole form ───────────────────────────────────────────────

export function validateForm(
  formData: Record<string, string>,
  schema: Record<string, FieldRule>
): ValidationResult {
  const errors: ValidationError[] = [];
  for (const [field, rules] of Object.entries(schema)) {
    const fieldErrors = validateField(field, formData[field] || '', rules);
    errors.push(...fieldErrors);
  }
  return { valid: errors.length === 0, errors };
}

// ── Pre-built schemas for each role ──────────────────────────────────────────

export const MANUFACTURER_SCHEMA: Record<string, FieldRule> = {
  companyName:   { required: true, maxLength: 100, noScripts: true },
  licenseNumber: { required: true, maxLength: 50,  alphanumeric: true },
  gmpCertId:     { required: true, maxLength: 50,  alphanumeric: true },
  location:      { required: true, maxLength: 100 },
  vaccineName:   { required: true, maxLength: 100 },
  type:          { required: true, maxLength: 60 },
  batchNumber:   { required: true, maxLength: 30,  alphanumeric: true, minLength: 2 },
  mfgDate:       { required: true, isDate: true },
  expDate:       { required: true, isDate: true, isFutureDate: true },
  doseCount:     { required: true, maxLength: 10 },
  tempMin:       { required: true, maxLength: 10 },
  tempMax:       { required: true, maxLength: 10 },
};

export const DISTRIBUTOR_SCHEMA: Record<string, FieldRule> = {
  distributorName: { required: true, maxLength: 100 },
  licenseNumber:   { required: true, maxLength: 50, alphanumeric: true },
  gstId:           { required: true, maxLength: 30, alphanumeric: true },
  location:        { required: true, maxLength: 100 },
  lotId:           { required: true, maxLength: 30, alphanumeric: true },
  vehicleId:       { required: true, maxLength: 50, alphanumeric: true },
  sensorId:        { required: true, maxLength: 50, alphanumeric: true },
};

export const HOSPITAL_SCHEMA: Record<string, FieldRule> = {
  facilityName:    { required: true, maxLength: 100 },
  registrationNo:  { required: true, maxLength: 50, alphanumeric: true },
  type:            { required: true, maxLength: 60 },
  location:        { required: true, maxLength: 100 },
  lotId:           { required: true, maxLength: 30, alphanumeric: true },
  storageUnitId:   { required: true, maxLength: 50, alphanumeric: true },
  currentTemp:     { required: true, maxLength: 10 },
  clinicianId:     { required: true, maxLength: 50, alphanumeric: true },
};

export const PATIENT_SCHEMA: Record<string, FieldRule> = {
  patientId: { required: true, maxLength: 50, alphanumeric: true },
  ageGender: { required: true, maxLength: 30 },
  vaccineName: { required: true, maxLength: 100 },
  lotId: { required: true, maxLength: 30, alphanumeric: true },
  adminDate: { required: true },
  doseNumber: { required: true, maxLength: 10 },
  clinicianId: { required: true, maxLength: 50, alphanumeric: true },
  adminSite: { required: true, maxLength: 100 },
  nextDoseDate: { required: false },
};
