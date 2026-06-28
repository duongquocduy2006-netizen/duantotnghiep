import React, { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./AdminBanners.css";

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState("");
    const [keyword, setKeyword] = useState("");

    // Modal Details state
    const [selectedOrderCode, setSelectedOrderCode] = useState(null);
    const [orderDetail, setOrderDetail] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch orders with optional filters
    const fetchOrders = async (searchKeyword = "", statusVal = "") => {
        try {
            setLoading(true);
            const params = {};
            if (searchKeyword.trim()) {
                params.keyword = searchKeyword.trim();
            }
            if (statusVal !== "") {
                params.status = parseInt(statusVal);
            }

            const response = await api.get("/api/orders/all", { params });
            if (response.data && response.data.success) {
                setOrders(response.data.orders || []);
            } else {
                setError("Có lỗi xảy ra khi tải danh sách đơn hàng.");
            }
        } catch (err) {
            console.error("Lỗi tải đơn hàng:", err);
            setError("Không thể kết nối đến máy chủ để lấy thông tin đơn hàng.");
        } finally {
            setLoading(false);
        }
    };

    // Debounced search trigger
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchOrders(keyword, statusFilter);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [keyword, statusFilter]);

    // Handle single order status update
    const handleStatusChange = async (orderCode, newStatus) => {
        if (!window.confirm(`Bạn có chắc chắn muốn chuyển đơn hàng ${orderCode} sang trạng thái mới?`)) {
            // Re-fetch to revert the dropdown choice in UI
            fetchOrders(keyword, statusFilter);
            return;
        }

        try {
            const response = await api.post("/api/orders/update-status", {
                orderCode,
                status: newStatus
            });

            if (response.data && response.data.success) {
                alert(response.data.message || "Cập nhật trạng thái đơn hàng thành công!");
                // Update local status state of the updated order
                setOrders(prevOrders =>
                    prevOrders.map(o => o.orderCode === orderCode ? { ...o, status: newStatus } : o)
                );
            }
        } catch (err) {
            console.error("Lỗi cập nhật trạng thái đơn hàng:", err);
            const errMsg = err.response && err.response.data && err.response.data.message
                ? err.response.data.message
                : "Không thể cập nhật trạng thái đơn hàng. Vui lòng kiểm tra lại.";
            alert(errMsg);
            // Re-fetch to sync state with server
            fetchOrders(keyword, statusFilter);
        }
    };

    // Open detail modal and fetch order info
    const openOrderDetail = async (orderCode) => {
        setSelectedOrderCode(orderCode);
        setIsModalOpen(true);
        setModalLoading(true);
        setOrderDetail(null);

        try {
            const response = await api.get(`/api/orders/${orderCode}`);
            if (response.data && response.data.success) {
                setOrderDetail(response.data);
            } else {
                alert("Không thể tải chi tiết đơn hàng.");
                setIsModalOpen(false);
            }
        } catch (err) {
            console.error("Lỗi tải chi tiết đơn hàng:", err);
            alert("Lỗi kết nối khi lấy chi tiết đơn hàng.");
            setIsModalOpen(false);
        } finally {
            setModalLoading(false);
        }
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 1: return { label: "Chờ xác nhận", class: "status-pending" };
            case 2: return { label: "Đang giao hàng", class: "status-shipping" };
            case 3: return { label: "Thành công", class: "status-success" };
            case 4: return { label: "Đã hủy", class: "status-cancel" };
            case 5: return { label: "Đã nhận hàng", class: "status-delivered" };
            default: return { label: "Không xác định", class: "" };
        }
    };

    const formatCurrency = (val) => {
        if (val === undefined || val === null) return "0 ₫";
        return val.toLocaleString("vi-VN") + " ₫";
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        try {
            const date = new Date(dateStr);
            return date.toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <AdminLayout>
            <div className="admin-banners-page">
                {/* HEADER */}
                <div className="page-header-wrapper">
                    <div>
                        <div className="header-label">
                            <i className="bi bi-cart-check me-2"></i> ORDER MANAGEMENT
                        </div>
                        <h1 className="header-title">DANH SÁCH ĐƠN HÀNG</h1>
                    </div>
                    <button className="btn-add-pill" onClick={() => window.print()}>
                        <i className="bi bi-file-earmark-excel"></i> &nbsp;XUẤT BÁO CÁO
                    </button>
                </div>

                {/* TOOLBAR */}
                <div className="toolbar-container">
                    <div className="search-input-pill">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Tìm kiếm Mã đơn, Tên khách hàng..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                        />
                    </div>

                    <select
                        className="filter-select-pill"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">TRẠNG THÁI: TẤT CẢ</option>
                        <option value="1">CHỜ XÁC NHẬN</option>
                        <option value="2">ĐANG GIAO HÀNG</option>
                        <option value="5">ĐÃ NHẬN HÀNG (CHỜ DUYỆT)</option>
                        <option value="3">ĐÃ GIAO THÀNH CÔNG</option>
                        <option value="4">ĐÃ HỦY</option>
                    </select>
                </div>

                {/* TABLE */}
                <div className="table-main-wrapper">
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#000' }}>
                            <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}>
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px', fontWeight: '800' }}>ĐANG TẢI DANH SÁCH ĐƠN HÀNG...</p>
                        </div>
                    ) : error ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                            <i className="bi bi-exclamation-triangle" style={{ fontSize: '40px' }}></i>
                            <p style={{ marginTop: '10px', fontWeight: '800' }}>{error}</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div style={{ padding: '60px 40px', textAlign: 'center', color: '#000' }}>
                            <i className="bi bi-inbox" style={{ fontSize: '48px', color: '#333' }}></i>
                            <p style={{ marginTop: '15px', fontWeight: '800', color: '#888' }}>Không có đơn hàng nào khớp với tìm kiếm.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>MÃ ĐƠN HÀNG</th>
                                    <th>KHÁCH HÀNG / THỜI GIAN</th>
                                    <th>TỔNG THANH TOÁN</th>
                                    <th>TRẠNG THÁI ĐƠN HÀNG</th>
                                    <th>THANH TOÁN</th>
                                    <th style={{ textAlign: 'right' }}>CHI TIẾT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => {
                                    const statusInfo = getStatusInfo(order.status);
                                    return (
                                        <tr key={order.orderCode} style={order.status === 4 ? { background: 'rgba(229, 9, 20, 0.03)' } : {}}>
                                            <td className="id-text">
                                                <span
                                                    onClick={() => openOrderDetail(order.orderCode)}
                                                    className="order-id"
                                                    style={order.status === 4 ? { color: '#000', textDecoration: 'line-through', cursor: 'pointer' } : { cursor: 'pointer' }}
                                                >
                                                    {order.orderCode}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="customer-info">
                                                    <span className="customer-name" style={order.status === 4 ? { color: '#555' } : {}}>
                                                        {order.customerName || "Khách vãng lai"}
                                                    </span>
                                                    <span className="customer-date" style={order.status === 4 ? { color: '#555' } : {}}>
                                                        <i className="bi bi-clock"></i> {formatDate(order.createdAt)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="total-amount" style={{ fontWeight: '800', color: '#000', fontSize: '15px' }}>
                                                {formatCurrency(order.finalAmount)}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1 align-items-center">
                                                    <select
                                                        className={`status-select-badge ${statusInfo.class}`}
                                                        style={{ padding: '8px 30px 8px 12px', fontSize: '12px', margin: 0 }}
                                                        value={order.status}
                                                        disabled={order.status === 3 || order.status === 4 || order.status === 5}
                                                        onChange={(e) => handleStatusChange(order.orderCode, parseInt(e.target.value))}
                                                    >
                                                        <option value="1">Chờ xác nhận</option>
                                                        <option value="2">Đang giao hàng</option>
                                                        {order.status !== 4 && <option value="4">Hủy đơn</option>}
                                                        {order.status === 4 && <option value="4">Đã hủy</option>}
                                                        {order.status === 3 && <option value="3">Thành công</option>}
                                                        {order.status === 5 && <option value="5">Đã nhận hàng (Chờ duyệt)</option>}
                                                    </select>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge-payment ${order.paymentMethod === 'BANK' || order.paymentMethod?.toLowerCase().includes('chuyển khoản') ? 'payment-vnpay' : ''}`} style={order.status === 4 ? { opacity: 0.5 } : {}}>
                                                    {order.paymentMethod === 'BANK' ? 'Chuyển khoản' : (order.paymentMethod || 'COD')}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    onClick={() => openOrderDetail(order.orderCode)}
                                                    className="btn-icon-action"
                                                    title="Xem chi tiết"
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* HIGH-END DETAIL MODAL */}
            {isModalOpen && (
                <div className="modal-backdrop-neon" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-container-neon" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-neon">
                            <h3 className="font-oswald"><i className="bi bi-receipt-cutoff"></i> CHI TIẾT ĐƠN HÀNG: <span style={{ color: 'var(--accent-red)' }}>{selectedOrderCode}</span></h3>
                            <button className="btn-close-neon" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body-neon">
                            {modalLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#000' }}>
                                    <div className="spinner-border text-danger" role="status" style={{ width: '2.5rem', height: '2.5rem' }}></div>
                                    <p style={{ marginTop: '15px', fontSize: '12px', letterSpacing: '1px', fontWeight: '800' }}>ĐANG TẢI CHI TIẾT...</p>
                                </div>
                            ) : orderDetail && orderDetail.order ? (
                                <div>
                                    <div className="order-details-grid">
                                        <div className="detail-panel">
                                            <h4 className="panel-title font-oswald"><i className="bi bi-person-badge"></i> THÔNG TIN NHẬN HÀNG</h4>
                                            <p><b>Họ và tên:</b> {orderDetail.order.receiving_name || "N/A"}</p>
                                            <p><b>Số điện thoại:</b> {orderDetail.order.phone_number || "N/A"}</p>
                                            <p><b>Địa chỉ nhận:</b> {orderDetail.order.street_detail || "N/A"}</p>
                                            <p><b>Phương thức thanh toán:</b> {orderDetail.order.method_name === 'BANK' ? 'Chuyển khoản (PayOS)' : (orderDetail.order.method_name || 'Thanh toán COD')}</p>
                                        </div>
                                        <div className="detail-panel">
                                            <h4 className="panel-title font-oswald"><i className="bi bi-clock-history"></i> THÔNG TIN GIAO DỊCH</h4>
                                            <p><b>Thời gian tạo:</b> {formatDate(orderDetail.order.created_at)}</p>
                                            <p><b>Trạng thái đơn:</b> <span className={`badge-status-neon ${getStatusInfo(orderDetail.order.status).class}`}>{getStatusInfo(orderDetail.order.status).label}</span></p>
                                            {orderDetail.order.external_transaction_id && (
                                                <p><b>Mã giao dịch PayOS:</b> <span style={{ color: '#aaa', fontSize: '12px' }}>{orderDetail.order.external_transaction_id}</span></p>
                                            )}
                                        </div>
                                    </div>

                                    <h4 className="panel-title font-oswald" style={{ marginTop: '25px', marginBottom: '10px' }}><i className="bi bi-bag-check"></i> SẢN PHẨM ĐÃ ĐẶT</h4>
                                    <div className="product-table-wrapper">
                                        <table className="modal-product-table">
                                            <thead>
                                                <tr>
                                                    <th>Sản phẩm</th>
                                                    <th>Giá bán</th>
                                                    <th>Số lượng</th>
                                                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orderDetail.items && orderDetail.items.map((item, index) => {
                                                    const imgUrl = item.image_url
                                                        ? (item.image_url.startsWith('http') ? item.image_url : `http://localhost:8080/images/${item.image_url}`)
                                                        : "https://ui-avatars.com/api/?name=SP&background=121212&color=e50914&bold=true";
                                                    return (
                                                        <tr key={index}>
                                                            <td>
                                                                <div className="modal-prod-info">
                                                                    <img src={imgUrl} alt={item.product_name} className="modal-prod-img" />
                                                                    <div>
                                                                        <div className="modal-prod-name">{item.product_name}</div>
                                                                        <div className="modal-prod-variant">Size: {item.size_name} | Màu: {item.color_name}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>{formatCurrency(item.price)}</td>
                                                            <td>{item.quantity}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.price * item.quantity)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="price-summary-panel">
                                        <div className="summary-row">
                                            <span>Tiền hàng:</span>
                                            <span>{formatCurrency(orderDetail.order.total_amount)}</span>
                                        </div>
                                        <div className="summary-row">
                                            <span>Phí vận chuyển:</span>
                                            <span>{formatCurrency(orderDetail.order.shipping_fee)}</span>
                                        </div>
                                        {orderDetail.order.voucher_id && (
                                            <div className="summary-row" style={{ color: 'var(--accent-red)' }}>
                                                <span>Giảm giá (Voucher):</span>
                                                <span>-{formatCurrency(orderDetail.order.total_amount + orderDetail.order.shipping_fee - orderDetail.order.final_amount)}</span>
                                            </div>
                                        )}
                                        <hr style={{ borderColor: '#ffe3e3', margin: '10px 0' }} />
                                        <div className="summary-row final-row">
                                            <span>TỔNG THANH TOÁN:</span>
                                            <span style={{ color: 'var(--accent-red)', fontWeight: '800' }}>{formatCurrency(orderDetail.order.final_amount)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: '#555', padding: '20px 0' }}>Không thể tìm thấy chi tiết đơn hàng này.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .order-id { font-family: 'Oswald'; color: #000; font-weight: 800; text-decoration: none; transition: 0.2s; font-size: 16px; }
                .order-id:hover { color: var(--accent-red); text-decoration: underline; }
                .customer-name { display: block; font-weight: 800; color: #000; font-size: 15px; }
                .customer-date { font-size: 12px; color: #555; display: flex; align-items: center; gap: 5px; margin-top: 3px; font-weight: 600; }

                /* Status badging */
                .status-select-badge { border-radius: 0px; font-weight: 800; font-family: 'Oswald', sans-serif; text-transform: uppercase; font-size: 13px; border: 1px solid #ddd !important; cursor: pointer; outline: none; background: #fff; }
                .status-pending { color: #cc6600 !important; border-color: #ffd8a8 !important; background: #fff9db; }
                .status-shipping { color: #0066cc !important; border-color: #a5d8ff !important; background: #e7f5ff; }
                .status-success { color: #2b8a3e !important; border-color: #b2f2bb !important; background: #ebfbee; }
                .status-cancel { color: var(--accent-red) !important; border-color: #ffc9c9 !important; background: #fff5f5; }
                .status-delivered { color: #37b24d !important; border-color: #b2f2bb !important; background: #ebfbee; }

                .badge-payment { font-size: 11px; font-weight: 800; padding: 6px 12px; background: #fff; color: #000; border: 1px solid #e2e8f0; border-radius: 0px; text-transform: uppercase; }
                .payment-vnpay { background: #fff5f5 !important; border-color: #ffc9c9 !important; color: var(--accent-red) !important; }

                /* Modern Flat Modal */
                .modal-backdrop-neon {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 2000;
                    padding: 20px; animation: fadeIn 0.2s ease-out;
                }
                .modal-container-neon {
                    background: #fff; border: 1px solid #000; box-shadow: 10px 10px 0px rgba(0,0,0,1);
                    width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; border-radius: 0px;
                    display: flex; flex-direction: column; animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .modal-header-neon {
                    padding: 20px 25px; border-bottom: 1px solid #000; display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 0px;
                }
                .modal-header-neon h3 { margin: 0; font-size: 24px; color: #000; letter-spacing: 1px; display: flex; align-items: center; gap: 10px; font-weight: 800; }
                .btn-close-neon { background: transparent; border: none; color: #000; font-size: 32px; font-weight: 800; cursor: pointer; transition: 0.2s; }
                .btn-close-neon:hover { color: var(--accent-red); }
                .modal-body-neon { padding: 30px; background: #fff; }

                .order-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
                .detail-panel { background: #fff; border: 1px solid #ffe3e3; padding: 20px; border-radius: 0px; }
                .panel-title { margin-top: 0; font-size: 16px; color: #1e293b; font-weight: 700; border-bottom: 1px solid #ffe3e3; padding-bottom: 10px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; }
                .detail-panel p { margin: 10px 0; font-size: 14px; color: #334155; font-weight: 500; }
                .detail-panel b { color: #1e293b; font-weight: 700; margin-right: 5px; }

                .badge-status-neon { font-size: 12px; font-weight: 800; padding: 6px 12px; font-family: 'Oswald'; text-transform: uppercase; border: 1px solid #e2e8f0; border-radius: 0px; }

                /* Modal Product Table */
                .product-table-wrapper { background: #fff; border: 1px solid #ffe3e3; margin-top: 20px; border-radius: 0px; overflow: hidden; }
                .modal-product-table { width: 100%; border-collapse: collapse; }
                .modal-product-table th { background: var(--soft-pink); padding: 14px; border-bottom: 1px solid var(--border-pink); font-size: 12px; color: #555; font-family: 'Oswald'; font-weight: 800; text-transform: uppercase; }
                .modal-product-table td { padding: 14px; border-bottom: 1px solid #fbf2f2; font-size: 14px; color: #1e293b; font-weight: 500; }
                .modal-prod-info { display: flex; align-items: center; gap: 15px; }
                .modal-prod-img { width: 55px; height: 55px; object-fit: cover; border: 1px solid #ffe3e3; border-radius: 0px; }
                .modal-prod-name { font-weight: 800; color: #000; font-size: 14px; line-height: 1.4; text-transform: uppercase; }
                .modal-prod-variant { font-size: 12px; color: #555; margin-top: 4px; font-weight: 700; }

                .price-summary-panel { margin-top: 30px; max-width: 400px; margin-left: auto; display: flex; flex-direction: column; gap: 12px; background: #fff; padding: 25px; border: 1px solid #ffe3e3; border-radius: 0px; }
                .summary-row { display: flex; justify-content: space-between; font-size: 15px; color: #334155; font-weight: 600; }
                .final-row { font-size: 22px; font-family: 'Oswald'; font-weight: 800; color: #1e293b; margin-top: 15px; padding-top: 15px; border-top: 1px solid #ffe3e3; }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </AdminLayout>
    );
};

export default AdminOrders;
