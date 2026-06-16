import React, { useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import './AdminSettings.css';

const AdminSettings = () => {
    const [settings, setSettings] = useState({
        storeName: 'ShoeStore Premium',
        seoDescription: 'Chuyên cung cấp giày chính hãng, uy tín số 1 Việt Nam.',
        email: 'contact@shoestore.com',
        hotline: '1900 1000',
        address: 'Tòa nhà FPT Polytechnic, Cần Thơ',
        facebook: '',
        instagram: '',
        maintenanceMode: false,
        emailNotifications: true,
        allowRegistration: true
    });

    const handleSave = () => {
        console.log('Saving settings:', settings);
        alert('Cài đặt đã được lưu!');
    };

    return (
        <AdminLayout>
            <div className="admin-settings-page">
                <div className="page-header" style={{ marginTop: '20px' }}>
                    <div>
                        <span className="sub-title"><i className="bi bi-gear-fill"></i> SYSTEM CONFIG</span>
                        <h1 className="page-title font-oswald">CÀI ĐẶT HỆ THỐNG</h1>
                    </div>
                    <button className="btn-neon" onClick={handleSave}>
                        <i className="bi bi-save"></i> LƯU THAY ĐỔI
                    </button>
                </div>

                <div className="settings-grid">
                    <div className="left-col">
                        <div className="card-box">
                            <h3 className="card-title"><i className="bi bi-shop"></i> THÔNG TIN CỬA HÀNG</h3>
                            <div className="form-group">
                                <label className="form-label">Logo thương hiệu</label>
                                <div className="logo-upload-area">
                                    <div className="current-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '20px' }}>S</div>
                                    <div>
                                        <button type="button" className="btn-upload">Tải ảnh lên</button>
                                        <p style={{ fontSize: '11px', color: '#555', marginTop: '5px' }}>Hỗ trợ PNG, JPG (Max 2MB)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Tên cửa hàng</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={settings.storeName}
                                    onChange={(e) => setSettings({...settings, storeName: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Mô tả ngắn (SEO)</label>
                                <textarea 
                                    className="form-control" 
                                    value={settings.seoDescription}
                                    onChange={(e) => setSettings({...settings, seoDescription: e.target.value})}
                                ></textarea>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label className="form-label">Email liên hệ</label>
                                    <input 
                                        type="email" 
                                        className="form-control" 
                                        value={settings.email}
                                        onChange={(e) => setSettings({...settings, email: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hotline</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        value={settings.hotline}
                                        onChange={(e) => setSettings({...settings, hotline: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Địa chỉ</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={settings.address}
                                    onChange={(e) => setSettings({...settings, address: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="card-box">
                            <h3 className="card-title"><i className="bi bi-share"></i> MẠNG XÃ HỘI</h3>
                            <div className="form-group">
                                <label className="form-label"><i className="bi bi-facebook" style={{ color: '#1877f2' }}></i> Facebook URL</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="https://facebook.com/..." 
                                    value={settings.facebook}
                                    onChange={(e) => setSettings({...settings, facebook: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label"><i className="bi bi-instagram" style={{ color: '#e4405f' }}></i> Instagram URL</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="https://instagram.com/..." 
                                    value={settings.instagram}
                                    onChange={(e) => setSettings({...settings, instagram: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="right-col">
                        <div className="card-box">
                            <h3 className="card-title"><i className="bi bi-shield-lock"></i> ĐỔI MẬT KHẨU ADMIN</h3>
                            <div className="form-group">
                                <label className="form-label">Mật khẩu hiện tại</label>
                                <input type="password" class="form-control" placeholder="••••••" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mật khẩu mới</label>
                                <input type="password" class="form-control" placeholder="••••••" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Xác nhận mật khẩu mới</label>
                                <input type="password" class="form-control" placeholder="••••••" />
                            </div>
                        </div>

                        <div className="card-box">
                            <h3 className="card-title"><i className="bi bi-sliders"></i> CẤU HÌNH</h3>
                            
                            <div className="switch-group">
                                <div>
                                    <span className="switch-label">Chế độ bảo trì</span>
                                    <span className="switch-desc">Chỉ Admin mới có thể truy cập web</span>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.maintenanceMode}
                                        onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="switch-group">
                                <div>
                                    <span className="switch-label">Gửi Email thông báo</span>
                                    <span className="switch-desc">Nhận email khi có đơn hàng mới</span>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.emailNotifications}
                                        onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="switch-group">
                                <div>
                                    <span className="switch-label">Cho phép đăng ký</span>
                                    <span className="switch-desc">Khách hàng mới có thể tạo tài khoản</span>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.allowRegistration}
                                        onChange={(e) => setSettings({...settings, allowRegistration: e.target.checked})}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminSettings;
