import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import api from '../services/api';

/**
 * RoleAccess component protects routes based on user roles fetched dynamically.
 * - If user is not logged in: redirects to '/login'.
 * - If user is logged in but does not have the allowed role: redirects to '/' (Home)
 *   and sets a Vietnamese warning toast message.
 */
const RoleAccess = ({ allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState({
    isLoggedIn: false,
    isAuthorized: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/api/profile');
        if (response.data && response.data.success) {
          const userRole = response.data.account?.role;
          const hasRole = userRole && allowedRoles.some(
            role => role.toUpperCase() === userRole.toUpperCase()
          );
          setAuthState({
            isLoggedIn: true,
            isAuthorized: !!hasRole,
          });
        } else {
          setAuthState({
            isLoggedIn: false,
            isAuthorized: false,
          });
        }
      } catch (err) {
        setAuthState({
          isLoggedIn: false,
          isAuthorized: false,
        });
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [allowedRoles]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111',
        color: '#fff',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="spinner-border text-danger mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4>Đang kiểm tra quyền truy cập...</h4>
      </div>
    );
  }

  if (!authState.isLoggedIn) {
    // Không đăng nhập -> Chuyển hướng thẳng về trang đăng nhập
    sessionStorage.setItem('toast_message', 'Vui lòng đăng nhập để tiếp tục!');
    return <Navigate to="/login" replace />;
  }

  if (!authState.isAuthorized) {
    // Đã đăng nhập nhưng không có quyền -> Đẩy thẳng về trang chủ kèm thông báo lỗi tiếng Việt
    sessionStorage.setItem('toast_message', 'Lỗi: Bạn không có quyền truy cập vào trang này!');
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RoleAccess;
