import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Permission, UserRole } from '@/types/auth';

interface RoleBasedAccessProps {
  children: React.ReactNode;
  requiredPermissions?: Permission[];
  requiredRoles?: UserRole[];
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, user must have ALL permissions/roles, if false, ANY will suffice
}

// Define role hierarchy and permissions
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'READ_ALL',
    'WRITE_ALL',
    'DELETE_ALL',
    'MANAGE_USERS',
    'MANAGE_ORGANIZATIONS',
    'VIEW_SYSTEM_ANALYTICS',
    'CONFIGURE_SYSTEM',
    'ACCESS_AUDIT_LOGS'
  ],
  NGO_MANAGER: [
    'READ_ORGANIZATION',
    'WRITE_ORGANIZATION',
    'MANAGE_CAREGIVERS',
    'MANAGE_VOLUNTEERS',
    'VIEW_ORG_ANALYTICS',
    'SCHEDULE_VISITS',
    'MANAGE_PROGRAMS'
  ],
  MUNICIPAL_STAFF: [
    'READ_DISTRICT',
    'WRITE_REPORTS',
    'VIEW_ANALYTICS',
    'MANAGE_RESOURCES',
    'VIEW_POPULATION_HEALTH',
    'EMERGENCY_COORDINATION'
  ],
  HEALTHCARE_PROVIDER: [
    'READ_PATIENT_DATA',
    'WRITE_HEALTH_RECORDS',
    'VIEW_HEALTH_ANALYTICS',
    'MANAGE_CARE_PLANS',
    'EMERGENCY_RESPONSE'
  ],
  PROFESSIONAL_CAREGIVER: [
    'READ_ASSIGNED',
    'WRITE_CARE_NOTES',
    'UPDATE_STATUS',
    'EMERGENCY_RESPONSE',
    'SCHEDULE_MANAGEMENT'
  ],
  FAMILY_CAREGIVER: [
    'READ_FAMILY_MEMBER',
    'WRITE_CARE_NOTES',
    'UPDATE_EMERGENCY_CONTACTS',
    'VIEW_HEALTH_SUMMARY'
  ],
  SENIOR_CITIZEN: [
    'READ_OWN_DATA',
    'UPDATE_PREFERENCES',
    'MANAGE_CONSENT',
    'EMERGENCY_ALERT'
  ],
  VOLUNTEER: [
    'READ_ASSIGNED_TASKS',
    'UPDATE_VOLUNTEER_STATUS',
    'VIEW_COMMUNITY_EVENTS'
  ]
};

const RoleBasedAccess: React.FC<RoleBasedAccessProps> = ({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  fallback = null,
  requireAll = false
}) => {
  const { user, permissions } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Check role-based access
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requireAll
      ? requiredRoles.every(role => user.role === role)
      : requiredRoles.some(role => user.role === role);
    
    if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  if (requiredPermissions.length > 0) {
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    const hasRequiredPermissions = requireAll
      ? requiredPermissions.every(permission => userPermissions.includes(permission))
      : requiredPermissions.some(permission => userPermissions.includes(permission));
    
    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

// Higher-order component for route protection
export const withRoleBasedAccess = <P extends object>(
  Component: React.ComponentType<P>,
  accessConfig: Omit<RoleBasedAccessProps, 'children'>
) => {
  return (props: P) => (
    <RoleBasedAccess {...accessConfig}>
      <Component {...props} />
    </RoleBasedAccess>
  );
};

// Hook for checking permissions in components
export const usePermissions = () => {
  const { user } = useAuth();
  
  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  };

  const hasRole = (role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const isAdmin = (): boolean => hasRole('ADMIN');
  const isNGOManager = (): boolean => hasRole('NGO_MANAGER');
  const isMunicipalStaff = (): boolean => hasRole('MUNICIPAL_STAFF');
  const isHealthcareProvider = (): boolean => hasRole('HEALTHCARE_PROVIDER');
  const isProfessionalCaregiver = (): boolean => hasRole('PROFESSIONAL_CAREGIVER');
  const isFamilyCaregiver = (): boolean => hasRole('FAMILY_CAREGIVER');
  const isSeniorCitizen = (): boolean => hasRole('SENIOR_CITIZEN');
  const isVolunteer = (): boolean => hasRole('VOLUNTEER');

  return {
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    hasAnyRole,
    isAdmin,
    isNGOManager,
    isMunicipalStaff,
    isHealthcareProvider,
    isProfessionalCaregiver,
    isFamilyCaregiver,
    isSeniorCitizen,
    isVolunteer,
    userPermissions: user ? ROLE_PERMISSIONS[user.role] || [] : []
  };
};

// Component for conditional rendering based on data access scope
interface DataScopeAccessProps {
  children: React.ReactNode;
  dataType: 'GLOBAL' | 'ORGANIZATION' | 'DISTRICT' | 'ASSIGNED' | 'OWN';
  resourceOwnerId?: string;
  organizationId?: string;
  districtId?: string;
  fallback?: React.ReactNode;
}

export const DataScopeAccess: React.FC<DataScopeAccessProps> = ({
  children,
  dataType,
  resourceOwnerId,
  organizationId,
  districtId,
  fallback = null
}) => {
  const { user } = useAuth();
  const { hasRole } = usePermissions();

  if (!user) {
    return <>{fallback}</>;
  }

  switch (dataType) {
    case 'GLOBAL':
      // Only admins can access global data
      if (!hasRole('ADMIN')) {
        return <>{fallback}</>;
      }
      break;

    case 'ORGANIZATION':
      // NGO managers and municipal staff can access organization data
      if (!hasRole('NGO_MANAGER') && !hasRole('ADMIN')) {
        return <>{fallback}</>;
      }
      // Check if user belongs to the organization
      if (organizationId && user.organizationId !== organizationId && !hasRole('ADMIN')) {
        return <>{fallback}</>;
      }
      break;

    case 'DISTRICT':
      // Municipal staff can access district data
      if (!hasRole('MUNICIPAL_STAFF') && !hasRole('ADMIN')) {
        return <>{fallback}</>;
      }
      // Check if user belongs to the district
      if (districtId && user.districtId !== districtId && !hasRole('ADMIN')) {
        return <>{fallback}</>;
      }
      break;

    case 'ASSIGNED':
      // Professional caregivers can access assigned seniors' data
      if (!hasRole('PROFESSIONAL_CAREGIVER') && !hasRole('NGO_MANAGER') && !hasRole('ADMIN')) {
        return <>{fallback}</>;
      }
      // Additional check for assignment would go here
      break;

    case 'OWN':
      // Users can only access their own data unless they have elevated permissions
      if (resourceOwnerId !== user.id && !hasRole('ADMIN') && !hasRole('NGO_MANAGER')) {
        return <>{fallback}</>;
      }
      break;

    default:
      return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Permission constants for easy reference
export const PERMISSIONS = {
  // Global permissions
  READ_ALL: 'READ_ALL' as const,
  WRITE_ALL: 'WRITE_ALL' as const,
  DELETE_ALL: 'DELETE_ALL' as const,
  
  // User management
  MANAGE_USERS: 'MANAGE_USERS' as const,
  MANAGE_ORGANIZATIONS: 'MANAGE_ORGANIZATIONS' as const,
  
  // Data access
  READ_ORGANIZATION: 'READ_ORGANIZATION' as const,
  WRITE_ORGANIZATION: 'WRITE_ORGANIZATION' as const,
  READ_DISTRICT: 'READ_DISTRICT' as const,
  READ_ASSIGNED: 'READ_ASSIGNED' as const,
  READ_OWN_DATA: 'READ_OWN_DATA' as const,
  READ_FAMILY_MEMBER: 'READ_FAMILY_MEMBER' as const,
  READ_PATIENT_DATA: 'READ_PATIENT_DATA' as const,
  
  // Care management
  WRITE_CARE_NOTES: 'WRITE_CARE_NOTES' as const,
  MANAGE_CARE_PLANS: 'MANAGE_CARE_PLANS' as const,
  WRITE_HEALTH_RECORDS: 'WRITE_HEALTH_RECORDS' as const,
  
  // Emergency and alerts
  EMERGENCY_RESPONSE: 'EMERGENCY_RESPONSE' as const,
  EMERGENCY_ALERT: 'EMERGENCY_ALERT' as const,
  EMERGENCY_COORDINATION: 'EMERGENCY_COORDINATION' as const,
  
  // Analytics and reporting
  VIEW_ANALYTICS: 'VIEW_ANALYTICS' as const,
  VIEW_ORG_ANALYTICS: 'VIEW_ORG_ANALYTICS' as const,
  VIEW_HEALTH_ANALYTICS: 'VIEW_HEALTH_ANALYTICS' as const,
  VIEW_SYSTEM_ANALYTICS: 'VIEW_SYSTEM_ANALYTICS' as const,
  VIEW_POPULATION_HEALTH: 'VIEW_POPULATION_HEALTH' as const,
  
  // System administration
  CONFIGURE_SYSTEM: 'CONFIGURE_SYSTEM' as const,
  ACCESS_AUDIT_LOGS: 'ACCESS_AUDIT_LOGS' as const,
  
  // Resource management
  MANAGE_CAREGIVERS: 'MANAGE_CAREGIVERS' as const,
  MANAGE_VOLUNTEERS: 'MANAGE_VOLUNTEERS' as const,
  MANAGE_PROGRAMS: 'MANAGE_PROGRAMS' as const,
  MANAGE_RESOURCES: 'MANAGE_RESOURCES' as const,
  
  // Scheduling
  SCHEDULE_VISITS: 'SCHEDULE_VISITS' as const,
  SCHEDULE_MANAGEMENT: 'SCHEDULE_MANAGEMENT' as const,
  
  // Personal data management
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES' as const,
  MANAGE_CONSENT: 'MANAGE_CONSENT' as const,
  UPDATE_STATUS: 'UPDATE_STATUS' as const,
  UPDATE_EMERGENCY_CONTACTS: 'UPDATE_EMERGENCY_CONTACTS' as const,
  
  // Reports and documentation
  WRITE_REPORTS: 'WRITE_REPORTS' as const,
  
  // Community features
  VIEW_COMMUNITY_EVENTS: 'VIEW_COMMUNITY_EVENTS' as const,
  READ_ASSIGNED_TASKS: 'READ_ASSIGNED_TASKS' as const,
  UPDATE_VOLUNTEER_STATUS: 'UPDATE_VOLUNTEER_STATUS' as const,
  VIEW_HEALTH_SUMMARY: 'VIEW_HEALTH_SUMMARY' as const
} as const;

// Role constants for easy reference
export const ROLES = {
  ADMIN: 'ADMIN' as const,
  NGO_MANAGER: 'NGO_MANAGER' as const,
  MUNICIPAL_STAFF: 'MUNICIPAL_STAFF' as const,
  HEALTHCARE_PROVIDER: 'HEALTHCARE_PROVIDER' as const,
  PROFESSIONAL_CAREGIVER: 'PROFESSIONAL_CAREGIVER' as const,
  FAMILY_CAREGIVER: 'FAMILY_CAREGIVER' as const,
  SENIOR_CITIZEN: 'SENIOR_CITIZEN' as const,
  VOLUNTEER: 'VOLUNTEER' as const
} as const;

export default RoleBasedAccess;