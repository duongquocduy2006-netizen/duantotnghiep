import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link } from "react-router-dom";
import api from "../../services/api";

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");

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

    const handleDelete = async (id, name) => {
        if (window.confirm(`Xếp có chắc chắn muốn xóa sản phẩm "${name}" này vĩnh viễn không?`)) {
            try {
                const response = await api.delete(`/api/products/${id}`);
                if (response.data && response.data.status === "success") {
                    alert(response.data.message || "Xóa sản phẩm thành công!");
                    // Cập nhật lại danh sách sản phẩm trên giao diện
                    setProducts(products.filter(p => p.id !== id));
                } else {
                    alert(response.data.error || "Có lỗi xảy ra khi xóa sản phẩm!");
                }
            } catch (err) {
                console.error("Lỗi xóa sản phẩm:", err);
                const errMsg = err.response && err.response.data && err.response.data.error
                    ? err.response.data.error
                    : "Không thể kết nối đến server để xóa sản phẩm.";
                alert(errMsg);
            }
        }
    };

    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `http://localhost:8080${url}`;
    };

    if (loading) {
        return (
            <AdminLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#000' }}>
                    <div className="spinner-border text-cyan" role="status" style={{ width: '3rem', height: '3rem', color: '#000' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '14px' }}>ĐANG TẢI DANH SÁCH SẢN PHẨM...</p>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '48px' }}></i>
                    <h3 style={{ marginTop: '20px', fontFamily: 'Oswald' }}>LỖI TẢI DỮ LIỆU</h3>
                    <p style={{ color: '#555', marginTop: '10px' }}>{error}</p>
                    <button className="btn-action btn-primary-glow" onClick={() => window.location.reload()} style={{ marginTop: '20px' }}>
                        THỬ LẠI
                    </button>
                </div>
            </AdminLayout>
        );
    }

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

            <div className="toolbar" style={{
                background: '#fff',
                padding: '15px',
                border: '4px solid #000', boxShadow: '4px 4px 0 #000', borderRadius: '0',
                marginBottom: '25px',
                display: 'flex',
                gap: '15px',
                alignItems: 'stretch'
            }}>
                <div className="search-box" style={{ flex: 1 }}>
                    <i className="bi bi-search"></i>
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Tìm kiếm sản phẩm theo tên, SKU..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select 
                    className="filter-select" 
                    style={{ width: '200px', background: '#fff', border: '3px solid #000', fontWeight: 'bold', color: '#555' }}
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
                    style={{ width: '200px', background: '#fff', border: '3px solid #000', fontWeight: 'bold', color: '#555' }}
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
                    </div>
                ) : (
                    <div className="table-responsive-wrapper">
                        <table className="compact-table">
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
                                            <div className="product-item" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '50px', height: '50px', background: '#fff', overflow: 'hidden', border: '3px solid #000', flexShrink: 0 }}>
                                                    <img
                                                        src={getImageUrl(p.imageUrl)}
                                                        className="product-img"
                                                        alt={p.productName}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.productName)}&background=fff&color=000&bold=true`;
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                                    <span className="product-name" style={{
                                                        fontWeight: 800,
                                                        color: '#000',
                                                        fontSize: '15px',
                                                        fontFamily: 'Oswald',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        textTransform: 'uppercase'
                                                    }} title={p.productName}>{p.productName}</span>
                                                    <span className="product-id" style={{ fontSize: '12px', color: '#555', fontWeight: 600, marginTop: '2px' }}><i className="bi bi-upc-scan"></i> SKU: {p.productCode}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#000', fontFamily: 'Oswald', textTransform: 'uppercase', borderBottom: '2px solid #000' }}>{p.categoryName}</span>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase' }}><i className="bi bi-tag-fill"></i> {p.brandName}</span>
                                            </div>
                                        </td>

                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                <span className="price" style={{ fontWeight: 800, color: '#000', fontFamily: 'Oswald', fontSize: '16px' }}>
                                                    {p.price != null ? `${p.price.toLocaleString()} ₫` : 'N/A'}
                                                </span>
                                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#000', border: '2px solid #000', padding: '2px 6px' }}>
                                                    <i className="bi bi-box-seam"></i> {p.variantCount} BIẾN THỂ
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <span className={`status-badge ${p.status === 1 ? 'status-active' : 'status-cancel'}`} style={{
                                                padding: '4px 8px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', border: '2px solid #000'
                                            }}>
                                                {p.status === 1 ? 'ĐANG BÁN' : 'TẠM ẨN'}
                                            </span>
                                        </td>

                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                                                <Link to={`/admin/products/detail/${p.id}`} className="action-btn-icon" title="Xem chi tiết">
                                                    <i className="bi bi-eye"></i>
                                                </Link>
                                                <Link to={`/admin/products/edit/${p.id}`} className="action-btn-icon icon-edit" title="Chỉnh sửa">
                                                    <i className="bi bi-pencil-square"></i>
                                                </Link>
                                                <button className="action-btn-icon icon-delete" title="Xóa" onClick={() => handleDelete(p.id, p.productName)}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <style>{`
                .admin-page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
                .sub-title-neon { display: block; color: #000; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; font-family: 'Oswald'; text-transform: uppercase; }
                .cinematic-title { font-family: 'Oswald', sans-serif; font-size: 40px; font-weight: 800; color: #000; margin: 0; line-height: 1; }
                
                .header-right-actions { display: flex; align-items: center; }
                .btn-cyan-skew { 
                    background: #fff; color: #000; border: 4px solid #000; box-shadow: 6px 6px 0 #000; padding: 12px 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none;
                }
                .btn-cyan-skew:hover { background: #000; color: #fff; box-shadow: 6px 6px 0 var(--accent-red); transform: translateY(-3px); }

                .toolbar { display: flex; gap: 20px; align-items: stretch; justify-content: space-between; margin-bottom: 30px; background: #fff; padding: 15px 25px; border: 4px solid #000; box-shadow: 4px 4px 0 #000; flex-wrap: wrap; }
                .search-box { position: relative; flex: 1; min-width: 300px; max-width: none; }
                .search-input { width: 100%; background: #fff !important; border: 3px solid #000; padding: 12px 15px 12px 45px; color: #000 !important; outline: none; height: 45px; font-weight: bold; }
                .search-input:focus { border-color: var(--accent-red); box-shadow: 4px 4px 0 var(--accent-red); }
                .bi-search { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #000; font-weight: bold; }
                .filter-select { background: #fff !important; color: #000 !important; border: 3px solid #000 !important; padding: 8px 15px; outline: none; cursor: pointer; height: 45px; min-width: 200px; font-weight: bold; font-family: 'Poppins'; }
                .filter-select:focus { border-color: var(--accent-red) !important; }

                .btn-red-skew { 
                    background: #fff; color: #000; border: 3px solid #000; padding: 0 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; height: 45px; min-width: 150px;
                }
                .btn-red-skew:hover { background: #000; color: #fff; box-shadow: 4px 4px 0 var(--accent-red); transform: translateY(-2px); }

                /* Compact Brutalist Table */
                .table-card { background: #fff; border: 4px solid #000; box-shadow: 6px 6px 0 #000; margin-top: 20px; overflow: hidden; }
                .table-responsive-wrapper { width: 100%; }
                .compact-table { width: 100%; border-collapse: collapse; }
                .compact-table th { background: #f4f4f4; color: #000; font-size: 13px; text-transform: uppercase; padding: 15px 20px; text-align: left; font-family: 'Oswald'; border-bottom: 4px solid #000; font-weight: 800; white-space: nowrap; }
                .compact-table td { padding: 15px 20px; border-bottom: 2px solid #000; font-size: 14px; color: #000; font-weight: 600; vertical-align: middle; }
                
                .status-badge { font-family: 'Oswald'; font-weight: 800; border: 2px solid #000 !important; border-radius: 0 !important; }
                .status-active { background: #4ade80; color: #000; }
                .status-cancel { background: var(--accent-red); color: #fff; }

                /* Action Icon Buttons */
                .action-btn-icon { background: #fff; border: 3px solid #000; color: #000; width: 35px; height: 35px; display: inline-flex; align-items: center; justify-content: center; transition: 0.2s; text-decoration: none; cursor: pointer; font-size: 14px; }
                .action-btn-icon:hover { transform: translateY(-2px); box-shadow: 2px 2px 0 var(--accent-red); background: #000; color: #fff; }
                .icon-delete:hover { background: #e50914; color: #fff; box-shadow: 2px 2px 0 #000; }
                .icon-edit:hover { background: #facc15; color: #000; box-shadow: 2px 2px 0 #000; }
            `}</style>
        </AdminLayout >
    );
};

export default AdminProducts;
