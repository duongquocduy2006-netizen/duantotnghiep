import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./AdminBanners.css";

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");

    // Custom Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        productId: null,
        productName: "",
        message: ""
    });

    const fetchProducts = async () => {
        try {
            const response = await api.get('/api/products');
            setProducts(response.data || []);
        } catch (err) {
            console.error("Lỗi tải danh sách sản phẩm:", err);
            setError("Không thể tải danh sách sản phẩm từ hệ thống.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/api/categories');
            setCategories(response.data || []);
        } catch (err) {
            console.error("Lỗi tải danh mục:", err);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const filteredProducts = products.filter(p => {
        const matchSearch = !searchTerm || p.productName.toLowerCase().includes(searchTerm.toLowerCase()) || p.productCode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = selectedCategory === "all" || p.categoryName === selectedCategory;
        const matchStatus = selectedStatus === "all" || (selectedStatus === "1" && p.status === 1) || (selectedStatus === "0" && p.status !== 1);
        return matchSearch && matchCategory && matchStatus;
    });

    const triggerDeleteConfirm = (id, name) => {
        setConfirmModal({
            isOpen: true,
            productId: id,
            productName: name,
            message: `Bạn có chắc chắn muốn xóa sản phẩm "${name}" này vĩnh viễn không?`
        });
    };

    const cancelDelete = () => {
        setConfirmModal({
            isOpen: false,
            productId: null,
            productName: "",
            message: ""
        });
    };

    const submitDelete = async () => {
        const { productId } = confirmModal;
        if (!productId) return;

        try {
            const response = await api.delete(`/api/products/${productId}`);
            if (response.data && response.data.status === "success") {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || "Xóa sản phẩm thành công!" }));
                setProducts(products.filter(p => p.id !== productId));
            } else {
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.error || "Có lỗi xảy ra khi xóa sản phẩm!" }));
            }
        } catch (err) {
            console.error("Lỗi xóa sản phẩm:", err);
            const errMsg = err.response && err.response.data && err.response.data.error
                ? err.response.data.error
                : "Không thể kết nối đến server để xóa sản phẩm.";
            window.dispatchEvent(new CustomEvent('show-toast', { detail: errMsg }));
        } finally {
            cancelDelete();
        }
    };

    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    return (
        <AdminLayout>
<<<<<<< HEAD
            <div className="admin-banners-page">
                {/* HEADER */}
                <div className="page-header-wrapper">
                    <div>
                        <div className="header-label">
                            <i className="bi bi-box-seam me-2"></i> REST API SERVICES
                        </div>
                        <h1 className="header-title">DANH SÁCH SẢN PHẨM</h1>
=======
            <div className="admin-page-header" style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div className="header-left">
                    <span className="sub-title-neon">⌨ SINGLE PAGE APPLICATION (REST API)</span>
                    <h1 className="cinematic-title" style={{ margin: 0 }}>DANH SÁCH SẢN PHẨM</h1>
                </div>
                <Link to="/admin/products/create" className="btn-cyan-skew">
                    <i className="bi bi-plus-lg"></i> &nbsp;THÊM MỚI
                </Link>
            </div>

            <div className="toolbar" style={{
                background: '#fff',
                padding: '12px 16px',
                border: '1px solid #e8eaed', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderRadius: '12px',
                marginBottom: '24px',
                display: 'flex',
                gap: '14px',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div className="admin-search-box-wrap" style={{ flex: 1 }}>
                    <i className="bi bi-search admin-search-icon"></i>
                    <input 
                        type="text" 
                        className="admin-search-input" 
                        placeholder="Tìm kiếm sản phẩm theo tên, SKU..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select 
                    className="filter-select" 
                    style={{ width: '200px', background: '#fff', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#555' }}
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="all">Danh mục: Tất cả</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                </select>

                <select 
                    className="filter-select" 
                    style={{ width: '200px', background: '#fff', border: '1px solid #e2e8f0', fontWeight: 'bold', color: '#555' }}
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                >
                    <option value="all">Trạng thái: Tất cả</option>
                    <option value="1">Đang bán</option>
                    <option value="0">Tạm ẩn</option>
                </select>
            </div>

            <div className="table-card">
                {filteredProducts.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                        <i className="bi bi-inbox" style={{ fontSize: '48px' }}></i>
                        <p style={{ marginTop: '10px' }}>Không có sản phẩm nào trong kho hàng.</p>
>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019
                    </div>
                    <Link to="/admin/products/create" className="btn-add-pill">
                        <i className="bi bi-plus-lg"></i> &nbsp;THÊM MỚI
                    </Link>
                </div>

                {/* TOOLBAR */}
                <div className="toolbar-container">
                    <div className="search-input-pill">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm theo tên, SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className="filter-select-pill"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="all">Danh mục: Tất cả</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select-pill"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="all">Trạng thái: Tất cả</option>
                        <option value="1">Đang bán</option>
                        <option value="0">Tạm ẩn</option>
                    </select>
                </div>

                {/* TABLE */}
                <div className="table-main-wrapper" style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#000' }}>
                            <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}>
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px', fontWeight: '800' }}>ĐANG TẢI DANH SÁCH SẢN PHẨM...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                            <i className="bi bi-exclamation-triangle" style={{ fontSize: '40px' }}></i>
                            <p style={{ marginTop: '10px', fontWeight: '800' }}>{error}</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div style={{ padding: '60px 40px', textAlign: 'center', color: '#000' }}>
                            <i className="bi bi-inbox" style={{ fontSize: '48px', color: '#000' }}></i>
                            <p style={{ marginTop: '15px', fontWeight: '800', color: '#888' }}>Không có sản phẩm nào trong kho hàng.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40%' }}>Sản Phẩm</th>
                                    <th>Phân Loại</th>
                                    <th>Kho & Giá</th>
                                    <th>Trạng Thái</th>
                                    <th style={{ textAlign: 'right' }}>Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div className="product-item" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div className="table-img-box" style={{ width: '60px', height: '70px', border: '1.5px solid #000', flexShrink: 0 }}>
                                                    <img
                                                        src={getImageUrl(p.imageUrl)}
                                                        alt={p.productName}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.productName)}&background=fff&color=000&bold=true`;
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                                    <Link to={`/admin/products/detail/${p.id}`} className="caption-link" style={{
                                                        fontSize: '15px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        textTransform: 'uppercase'
                                                    }} title={p.productName}>
                                                        {p.productName}
                                                    </Link>
                                                    <span className="product-sku-code" style={{ fontSize: '12px', color: '#555', fontWeight: 600, marginTop: '4px' }}>
                                                        <i className="bi bi-upc-scan" style={{ color: 'var(--accent-red)', marginRight: '4px' }}></i> SKU: {p.productCode}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#000', fontFamily: 'Oswald', textTransform: 'uppercase' }}>
                                                    {p.categoryName}
                                                </span>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>
                                                    <i className="bi bi-tag-fill"></i> {p.brandName}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                                                <span className="product-price-item" style={{ fontWeight: 800, fontSize: '16px', color: '#000' }}>
                                                    {p.price != null ? `${p.price.toLocaleString()} ₫` : 'N/A'}
                                                </span>
                                                <span className="variant-badge-modern" style={{
                                                    padding: '2px 8px',
                                                    border: '1.5px solid #000',
                                                    borderRadius: '0px',
                                                    color: '#000',
                                                    fontSize: '10px',
                                                    fontWeight: '800',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <i className="bi bi-box-seam"></i> {p.variantCount} BIẾN THỂ
                                                </span>
                                            </div>
                                        </td>

                                        <td>
<<<<<<< HEAD
                                            {p.status === 1 ? (
                                                <span className="status-badge-modern">
                                                    <div className="status-dot"></div> ĐANG BÁN
                                                </span>
                                            ) : (
                                                <span className="status-badge-modern inactive">
                                                    <div className="status-dot"></div> TẠM ẨN
                                                </span>
                                            )}
=======
                                             <span className={`status-badge ${p.status === 1 ? 'status-active' : 'status-cancel'}`} style={{
                                                 padding: '6px 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', border: '1px solid #e2e8f0',
                                                 whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                             }}>
                                                 {p.status === 1 ? 'ĐANG BÁN' : 'TẠM ẨN'}
                                             </span>
>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019
                                        </td>

                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                                <Link to={`/admin/products/detail/${p.id}`} className="btn-icon-action" title="Xem chi tiết">
                                                    <i className="bi bi-eye"></i>
                                                </Link>
                                                <Link to={`/admin/products/edit/${p.id}`} className="btn-icon-action" title="Chỉnh sửa">
                                                    <i className="bi bi-pencil-square"></i>
                                                </Link>
<<<<<<< HEAD
                                                <button className="btn-icon-action" style={{ color: 'var(--accent-red)' }} title="Xóa" onClick={() => handleDelete(p.id, p.productName)}>
=======
                                                <button className="action-btn-icon icon-delete" title="Xóa" onClick={() => triggerDeleteConfirm(p.id, p.productName)}>
>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
<<<<<<< HEAD
        </AdminLayout>
=======

            {/* CUSTOM CONFIRM MODAL */}
            {confirmModal.isOpen && (
                <div className="admin-confirm-overlay">
                    <div className="admin-confirm-box animate__animated animate__zoomIn">
                        <div className="admin-confirm-icon">
                            <i className="bi bi-exclamation-circle"></i>
                        </div>
                        <h4 className="admin-confirm-title">Xác nhận xóa</h4>
                        <p className="admin-confirm-message">{confirmModal.message}</p>
                        <div className="admin-confirm-actions">
                            <button className="admin-btn-confirm-cancel" onClick={cancelDelete}>Hủy bỏ</button>
                            <button className="admin-btn-confirm-ok" onClick={submitDelete}>Đồng ý</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .admin-page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
                .sub-title-neon { display: block; color: #000; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; font-family: 'Oswald'; text-transform: uppercase; }
                .cinematic-title { font-family: 'Oswald', sans-serif; font-size: 40px; font-weight: 800; color: #000; margin: 0; line-height: 1; }
                
                .header-right-actions { display: flex; align-items: center; }
                .btn-cyan-skew { 
                    background: #fff; color: #000; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none;
                }
                .btn-cyan-skew:hover { background: #000; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-3px); }

                .toolbar { display: flex; gap: 14px; align-items: center; justify-content: space-between; margin-bottom: 24px; background: #fff; padding: 12px 16px; border: 1px solid #e8eaed; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); flex-wrap: wrap; max-width: 100%; box-sizing: border-box; }
                .admin-search-box-wrap { position: relative; flex: 1; max-width: 100%; min-width: 220px; box-sizing: border-box; background: transparent !important; border: none !important; padding: 0 !important; display: block !important; }
                .admin-search-input { width: 100%; background: #fff !important; border: 1.5px solid #dadce0; padding: 10px 16px 10px 42px !important; color: #3c4043 !important; outline: none; height: 44px; font-weight: 500; border-radius: 12px !important; font-size: 14px; transition: all 0.2s; font-family: 'Inter', sans-serif; box-sizing: border-box; }
                .admin-search-input:focus { border-color: #e50914 !important; box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.1) !important; }
                .admin-search-input::placeholder { color: #9aa0a6; }
                .admin-search-icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #888 !important; font-size: 16px; pointer-events: none; z-index: 5; }
                .filter-select { background: #fff !important; color: #3c4043 !important; border: 1.5px solid #dadce0 !important; padding: 8px 14px; outline: none; cursor: pointer; height: 40px; border-radius: 24px; min-width: 170px; font-weight: 400; font-family: 'Inter'; font-size: 14px; transition: all 0.2s; }
                .filter-select:focus { border-color: #1a73e8 !important; box-shadow: 0 0 0 3px rgba(26,115,232,0.1) !important; }

                .btn-red-skew { 
                    background: #fff; color: #000; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 0 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; height: 45px; min-width: 150px;
                }
                .btn-red-skew:hover { background: #000; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-2px); }

                /* Compact Brutalist Table */
                .table-card { background: #fff; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-top: 20px; border-radius: 14px; overflow-x: auto; width: 100%; box-sizing: border-box; }
                .compact-table { width: 100%; border-collapse: collapse; min-width: 850px; }
                .compact-table th { background: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; padding: 14px 16px; text-align: left; font-family: 'Oswald'; border-bottom: 1px solid #f1f5f9; font-weight: 700; white-space: nowrap; }
                .compact-table td { padding: 14px 16px; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #1e293b; font-weight: 500; vertical-align: middle; }
                
                .status-badge { font-family: 'Oswald'; font-weight: 800; border: 1px solid #e2e8f0 !important; border-radius: 6px !important; }
                .status-active { background: #4ade80; color: #000; }
                .status-cancel { background: var(--accent-red); color: #fff; }

                /* Action Icon Buttons */
                .action-btn-icon { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; color: #000; width: 35px; height: 35px; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; text-decoration: none; cursor: pointer; font-size: 14px; }
                .action-btn-icon:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: #000; color: #fff; }
                .icon-delete:hover { background: #e50914; color: #fff; box-shadow: 0 4px 12px rgba(229,9,20,0.2); }
                .icon-edit:hover { background: #facc15; color: #000; box-shadow: 0 4px 12px rgba(250,204,21,0.2); }

                /* Admin Confirm Modal (Sleek Premium Theme) */
                .admin-confirm-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                }
                .admin-confirm-box {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 24px;
                    padding: 36px 32px;
                    width: 90%;
                    max-width: 420px;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
                    border-bottom: 4px solid #e50914;
                }
                .admin-confirm-icon {
                    width: 72px;
                    height: 72px;
                    background: #fef2f2;
                    color: #e50914;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    margin: 0 auto 20px;
                    animation: iconPulse 2s infinite;
                }
                .admin-confirm-title {
                    font-family: 'Inter', sans-serif;
                    font-weight: 800;
                    font-size: 20px;
                    color: #0f172a;
                    margin-bottom: 12px;
                }
                .admin-confirm-message {
                    font-size: 14px;
                    color: #475569;
                    line-height: 1.6;
                    margin-bottom: 28px;
                    font-weight: 500;
                }
                .admin-confirm-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                .admin-btn-confirm-cancel {
                    background: #f1f5f9;
                    color: #475569;
                    border: 1px solid #cbd5e1;
                    border-radius: 12px;
                    padding: 12px 24px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    flex: 1;
                }
                .admin-btn-confirm-cancel:hover {
                    background: #e2e8f0;
                    color: #0f172a;
                }
                .admin-btn-confirm-ok {
                    background: #e50914;
                    color: #fff;
                    border: none;
                    border-radius: 12px;
                    padding: 12px 24px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    flex: 1;
                    box-shadow: 0 4px 6px -1px rgba(229, 9, 20, 0.2);
                }
                .admin-btn-confirm-ok:hover {
                    background: #b8070f;
                    box-shadow: 0 10px 15px -3px rgba(229, 9, 20, 0.3);
                    transform: translateY(-1px);
                }
                @keyframes iconPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </AdminLayout >
>>>>>>> 4fcb74ed71d06f30f97a074cd1c3a5a92bba5019
    );
};

export default AdminProducts;
