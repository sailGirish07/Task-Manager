import React, { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import { hasPermission } from "../utils/permissionUtils";

function PrivateRoute({ allowedRoles = [], requiredPermissions = [] }) {
  const { user, loading } = useContext(UserContext);
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if allowedRoles is provided
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  // Check permission-based access if requiredPermissions is provided
  if (requiredPermissions.length > 0) {
    const hasRequiredPermission = requiredPermissions.some(permission => hasPermission(user, permission));
    if (!hasRequiredPermission) {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}

export default PrivateRoute;
