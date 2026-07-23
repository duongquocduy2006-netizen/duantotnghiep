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
                window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || "Có lỗi xảy ra khi xóa sản phẩm!" }));
            }
        } catch (err) {
            console.error("Lỗi xóa sản phẩm:", err);
            const errMsg = err.response && err.response.data && err.response.data.message
                ? err.response.data.message
                : "Không thể kết nối đến server để xóa sản phẩm.";
            window.dispatchEvent(new CustomEvent('show-toast', { detail: errMsg }));
        } finally {
            cancelDelete();
        }
    };

    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `http://localhost:8080${url}`;
    };

    return (
        <AdminLayout>
            <div className="admin-page-header" style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div className="header-left">
                    <span className="sub-title-neon">⌨ SINGLE PAGE APPLICATION (REST API)</span>
                    <h1 className="cinematic-title" style={{ margin: 0 }}>DANH SÁCH SẢN PHẨM</h1>
                </div>
                <Link to="/admin/products/create" className="btn-cyan-skew">
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
                                    <th style={{ width: '35%' }}>Sản Phẩm</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Phân Loại</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Kho & Giá</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Trạng Thái</th>
                                    <th style={{ textAlign: 'right', whiteSpace: 'nowrap', width: '120px' }}>Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div className="product-item" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div className="table-img-box" style={{ width: '60px', height: '70px', flexShrink: 0 }}>
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
                                                        textTransform: 'uppercase',
                                                        maxWidth: '220px',
                                                        display: 'inline-block'
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
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', whiteSpace: 'nowrap' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#000', fontFamily: 'Oswald', textTransform: 'uppercase' }}>
                                                    {p.categoryName}
                                                </span>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>
                                                    <i className="bi bi-tag-fill"></i> {p.brandName}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start', whiteSpace: 'nowrap' }}>
                                                <span className="product-price-item" style={{ fontWeight: 800, fontSize: '16px', color: '#000', whiteSpace: 'nowrap' }}>
                                                    {p.price != null ? `${p.price.toLocaleString()} ₫` : 'N/A'}
                                                </span>
                                                <span className="variant-badge-modern" style={{
                                                    padding: '4px 10px',
                                                    background: 'rgba(229, 9, 20, 0.06)',
                                                    border: '1px solid rgba(229, 9, 20, 0.15)',
                                                    borderRadius: '20px',
                                                    color: 'var(--accent-red)',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    whiteSpace: 'nowrap',
                                                    marginTop: '4px'
                                                }}>
                                                    <i className="bi bi-box-seam"></i> {p.variantCount} BIẾN THỂ
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            {p.status === 1 ? (
                                                <span className="status-badge-modern" style={{ whiteSpace: 'nowrap' }}>
                                                    <div className="status-dot"></div> ĐANG BÁN
                                                </span>
                                            ) : (
                                                <span className="status-badge-modern inactive" style={{ whiteSpace: 'nowrap' }}>
                                                    <div className="status-dot"></div> TẠM ẨN
                                                </span>
                                            )}
                                        </td>

                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                                <Link to={`/admin/products/detail/${p.id}`} className="btn-icon-action" title="Xem chi tiết">
                                                    <i className="bi bi-eye"></i>
                                                </Link>
                                                <Link to={`/admin/products/edit/${p.id}`} className="btn-icon-action" title="Chỉnh sửa">
                                                    <i className="bi bi-pencil-square"></i>
                                                </Link>
                                                <button className="btn-icon-action" style={{ color: 'var(--accent-red)' }} title="Xóa" onClick={() => triggerDeleteConfirm(p.id, p.productName)}>
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
                .btn-cyan-skew:hover { background: #000; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.2); transform: translateY(-3px); }

                .toolbar { display: flex; gap: 14px; align-items: center; justify-content: space-between; margin-bottom: 24px; background: #ffffff !important; padding: 12px 16px; border: 1px solid #f3e8ff !important; border-radius: 16px !important; box-shadow: 0 4px 20px rgba(139,92,246,0.05) !important; flex-wrap: wrap; }
                .search-box { position: relative; flex: 1; min-width: 220px; max-width: none; }
                .search-input { width: 100%; background: #ffffff !important; border: 1.5px solid #e9d5ff !important; padding: 9px 14px 9px 38px; color: #374151 !important; outline: none; height: 42px; font-weight: 400; border-radius: 24px; font-size: 14px; transition: all 0.25s ease; font-family: 'Inter', sans-serif; box-shadow: 0 2px 8px rgba(139,92,246,0.04) !important; }
                .search-input:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 4px rgba(139,92,246,0.15) !important; }
                .search-input::placeholder { color: #a78bfa !important; }
                .bi-search { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #8b5cf6 !important; font-size: 14px; pointer-events: none; }
                .filter-select { background: #ffffff !important; color: #374151 !important; border: 1.5px solid #e9d5ff !important; padding: 8px 14px; outline: none; cursor: pointer; height: 42px; border-radius: 24px; min-width: 170px; font-weight: 400; font-family: 'Inter'; font-size: 14px; transition: all 0.25s ease; }
                .filter-select:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 4px rgba(139,92,246,0.15) !important; }

                .btn-red-skew { 
                    background: #fff; color: #000; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 0 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; height: 45px; min-width: 150px;
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
        </AdminLayout>
    );
};

export default AdminProducts;
