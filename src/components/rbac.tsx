"use client";

import { ReactNode } from "react";

type UserRole = "admin" | "member" | "viewer";

interface RoleBasedProps {
  role: UserRole;
  requiredRole: UserRole | UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleBasedAccess({
  role,
  requiredRole,
  children,
  fallback = null,
}: RoleBasedProps) {
  const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
  };

  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const hasAccess = requiredRoles.some(
    (req) => roleHierarchy[role] >= roleHierarchy[req]
  );

  return hasAccess ? children : fallback;
}

interface RoleGuardProps {
  role: UserRole;
  children: ReactNode;
}

export function AdminOnly({ role, children }: RoleGuardProps) {
  return (
    <RoleBasedAccess role={role} requiredRole="admin">
      {children}
    </RoleBasedAccess>
  );
}

export function MemberOrAbove({ role, children }: RoleGuardProps) {
  return (
    <RoleBasedAccess role={role} requiredRole="member">
      {children}
    </RoleBasedAccess>
  );
}
