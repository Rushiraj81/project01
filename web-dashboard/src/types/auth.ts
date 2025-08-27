// User roles in the system
export type UserRole = 
  | 'ADMIN'
  | 'NGO_MANAGER'
  | 'MUNICIPAL_STAFF'
  | 'HEALTHCARE_PROVIDER'
  | 'PROFESSIONAL_CAREGIVER'
  | 'FAMILY_CAREGIVER'
  | 'SENIOR_CITIZEN'
  | 'VOLUNTEER';

// System permissions
export type Permission = 
  // Global permissions
  | 'READ_ALL'
  | 'WRITE_ALL'
  | 'DELETE_ALL'
  
  // User management
  | 'MANAGE_USERS'
  | 'MANAGE_ORGANIZATIONS'
  
  // Data access permissions
  | 'READ_ORGANIZATION'
  | 'WRITE_ORGANIZATION'
  | 'READ_DISTRICT'
  | 'READ_ASSIGNED'
  | 'READ_OWN_DATA'
  | 'READ_FAMILY_MEMBER'
  | 'READ_PATIENT_DATA'
  
  // Care management
  | 'WRITE_CARE_NOTES'
  | 'MANAGE_CARE_PLANS'
  | 'WRITE_HEALTH_RECORDS'
  
  // Emergency and alerts
  | 'EMERGENCY_RESPONSE'
  | 'EMERGENCY_ALERT'
  | 'EMERGENCY_COORDINATION'
  
  // Analytics and reporting
  | 'VIEW_ANALYTICS'
  | 'VIEW_ORG_ANALYTICS'
  | 'VIEW_HEALTH_ANALYTICS'
  | 'VIEW_SYSTEM_ANALYTICS'
  | 'VIEW_POPULATION_HEALTH'
  
  // System administration
  | 'CONFIGURE_SYSTEM'
  | 'ACCESS_AUDIT_LOGS'
  
  // Resource management
  | 'MANAGE_CAREGIVERS'
  | 'MANAGE_VOLUNTEERS'
  | 'MANAGE_PROGRAMS'
  | 'MANAGE_RESOURCES'
  
  // Scheduling
  | 'SCHEDULE_VISITS'
  | 'SCHEDULE_MANAGEMENT'
  
  // Personal data management
  | 'UPDATE_PREFERENCES'
  | 'MANAGE_CONSENT'
  | 'UPDATE_STATUS'
  | 'UPDATE_EMERGENCY_CONTACTS'
  
  // Reports and documentation
  | 'WRITE_REPORTS'
  
  // Community features
  | 'VIEW_COMMUNITY_EVENTS'
  | 'READ_ASSIGNED_TASKS'
  | 'UPDATE_VOLUNTEER_STATUS'
  | 'VIEW_HEALTH_SUMMARY';

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  districtId?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  preferences: UserPreferences;
  permissions?: Permission[]; // Explicit permissions override
  createdAt: Date;
  updatedAt: Date;
}

// User preferences
export interface UserPreferences {
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    emergencyOnly: boolean;
  };
  accessibility: {
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
  };
  dashboard: {
    defaultView: string;
    widgets: string[];
    refreshInterval: number;
  };
}

// Authentication context
export interface AuthContext {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  permissions: Permission[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
}

// Login request/response
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Registration request
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  districtId?: string;
  inviteCode?: string;
}

// Password reset
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

// Organization management
export interface Organization {
  id: string;
  name: string;
  type: 'NGO' | 'HEALTHCARE' | 'MUNICIPAL' | 'COMMUNITY';
  description?: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  maxUsers: number;
  allowedRoles: UserRole[];
  features: {
    analytics: boolean;
    reporting: boolean;
    scheduling: boolean;
    messaging: boolean;
    integrations: boolean;
  };
  privacy: {
    dataRetentionDays: number;
    allowDataExport: boolean;
    requireTwoFactor: boolean;
  };
}

// Session management
export interface Session {
  id: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    ipAddress: string;
    location?: string;
  };
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  lastActivity: Date;
}

// Audit logging for security
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
}

// Role-based access control helpers
export interface RolePermissionMapping {
  [key: string]: Permission[];
}

export interface DataAccessScope {
  level: 'GLOBAL' | 'ORGANIZATION' | 'DISTRICT' | 'ASSIGNED' | 'OWN';
  resourceIds?: string[];
}

// Multi-factor authentication
export interface MFASettings {
  enabled: boolean;
  methods: {
    sms: boolean;
    email: boolean;
    authenticatorApp: boolean;
  };
  backupCodes: string[];
  lastUsed?: Date;
}

// Account verification
export interface AccountVerification {
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  verificationDocuments?: string[];
}

// Security settings
export interface SecuritySettings {
  passwordLastChanged: Date;
  requirePasswordChange: boolean;
  allowedIpRanges?: string[];
  sessionTimeoutMinutes: number;
  mfa: MFASettings;
  verification: AccountVerification;
}

// Complete user profile with security
export interface UserProfile extends User {
  security: SecuritySettings;
  sessions: Session[];
  lastAuditLog?: AuditLog;
}

// API Error responses
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

// Common auth error codes
export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMITED: 'RATE_LIMITED',
  MFA_REQUIRED: 'MFA_REQUIRED',
  PASSWORD_EXPIRED: 'PASSWORD_EXPIRED',
  IP_BLOCKED: 'IP_BLOCKED'
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];