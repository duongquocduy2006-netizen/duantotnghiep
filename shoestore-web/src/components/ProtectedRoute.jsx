import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import api from '../services/api';

/**
 * ProtectedRoute - Bảo vệ route theo role.
 * Props:
 *   allowedRoles: mảng các role được phép truy cập (vd: ['ADMIN'], ['SHIPPER'])
 */
const ProtectedRoute = ({ allowedRoles }) => {
    const [status, setStatus] = useState('loading'); // 'loading' | 'authorized' | 'unauthorized' | 'unauthenticated'

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await api.get('/api/profile');
                if (res.data && res.data.success && res.data.account) {
                    const userRole = res.data.account.role;
                    if (allowedRoles.includes(userRole)) {
                        setStatus('authorized');
                    } else {
                        setStatus('unauthorized');
                    }
                } else {
                    setStatus('unauthenticated');
                }
            } catch (err) {
                setStatus('unauthenticated');
            }
        };
        checkAuth();
    }, [allowedRoles]);

    if (status === 'loading') {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#0d0d0d',
                color: '#fff'
            }}>
                <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}>
                    <span className="visually-hidden">Đang tải...</span>
                </div>
                <p style={{ marginTop: '16px', fontSize: '14px', color: '#aaa' }}>Đang xác thực quyền truy cập...</p>
            </div>
        );
    }

    // Chưa đăng nhập → chuyển về trang login
    if (status === 'unauthenticated') {
        return <Navigate to="/login" replace />;
    }

    // Đã đăng nhập nhưng không có quyền → chuyển về trang chủ
    if (status === 'unauthorized') {
        return <Navigate to="/" replace />;
    }

    // Đã xác thực và có quyền → render children routes
    return <Outlet />;
};

export default ProtectedRoute;
