import React, { useState, useEffect, useMemo } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link } from "react-router-dom";
import api from "../../services/api";

const QUICK_CANCEL_REASONS = [
    "Khách yêu cầu hủy",
    "Hết hàng",
    "Sai thông tin nhận hàng",
    "Không liên lạc được",
    "Trùng đơn hàng"
];

const AdminOrders = () => {
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState("");
    const [keyword, setKeyword] = useState("");

    // Computed orders filtered by status locally
    const orders = useMemo(() => {
        if (statusFilter === "") return allOrders;
        return allOrders.filter(o => o.status === parseInt(statusFilter));
    }, [allOrders, statusFilter]);

    // Computed unique statuses present in allOrders (matching current keyword)
    const availableStatuses = useMemo(() => {
        const statuses = new Set();
        allOrders.forEach(order => {
            if (order.status !== undefined && order.status !== null) {
                statuses.add(order.status);
            }
        });
        return Array.from(statuses);
    }, [allOrders]);

    // Modal Details state
    const [selectedOrderCode, setSelectedOrderCode] = useState(null);
    const [orderDetail, setOrderDetail] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Custom confirm modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        orderCode: null,
        newStatus: null,
        message: "",
        cancelReason: ""
    });

    // Fetch orders with optional keyword
    const fetchOrders = async (searchKeyword = "") => {
        try {
            setLoading(true);
            const params = {};
            if (searchKeyword.trim()) {
                params.keyword = searchKeyword.trim();
            }

            const response = await api.get("/api/orders/all", { params });
            if (response.data && response.data.success) {
                setAllOrders(response.data.orders || []);
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
            fetchOrders(keyword);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [keyword]);

    // Handle single order status update (Open custom confirm modal)
    const handleStatusChange = (orderCode, newStatus) => {
        setConfirmModal({
            isOpen: true,
            orderCode,
            newStatus,
            message: `Bạn có chắc chắn muốn chuyển đơn hàng ${orderCode} sang trạng thái mới?`
        });
    };

    const submitStatusChange = async () => {
        const { orderCode, newStatus, cancelReason } = confirmModal;
        setConfirmModal({ isOpen: false, orderCode: null, newStatus: null, message: "", cancelReason: "" });

        try {
            const payload = { orderCode, status: newStatus };
            if (newStatus === 4 && cancelReason && cancelReason.trim()) {
                payload.cancelReason = cancelReason.trim();
            }

            const response = await api.post("/api/orders/update-status", payload);

            if (response.data && response.data.success) {
                // Update local status state of the updated order
                setAllOrders(prevOrders =>
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
            fetchOrders(keyword);
        }
    };

    const cancelStatusChange = () => {
        setConfirmModal({ isOpen: false, orderCode: null, newStatus: null, message: "", cancelReason: "" });
        // Re-fetch to revert the dropdown choice in UI
        fetchOrders(keyword);
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

    const handleDeleteOrderItem = async (orderCode, variantId, productName) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}" khỏi đơn hàng này?`)) {
            try {
                const response = await api.post('/api/orders/delete-item', {
                    orderCode,
                    variantId
                });
                if (response.data && response.data.success) {
                    // Show success alert/toast
                    window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Xóa sản phẩm khỏi đơn hàng thành công!' }));
                    // Refresh the modal data
                    openOrderDetail(orderCode);
                    // Also refresh the orders list in the background
                    fetchOrders(keyword);
                } else {
                    window.dispatchEvent(new CustomEvent('show-toast', { detail: response.data.message || 'Lỗi: Không thể xóa sản phẩm.' }));
                }
            } catch (err) {
                console.error("Lỗi xóa sản phẩm khỏi đơn:", err);
                const errMsg = err.response && err.response.data && err.response.data.message
                    ? err.response.data.message
                    : "Không thể kết nối đến server để xóa sản phẩm.";
                window.dispatchEvent(new CustomEvent('show-toast', { detail: errMsg }));
            }
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
            <div className="admin-page-header">
                <div className="header-left">
                    <span className="sub-title-neon"><i className="bi bi-cart-check"></i> ORDER MANAGEMENT</span>
                    <h1 className="cinematic-title">DANH SÁCH ĐƠN HÀNG</h1>
                </div>
                <div className="header-right-actions">
                    <button className="btn-red-skew" onClick={() => window.print()}>
                        <i className="bi bi-file-earmark-excel"></i> &nbsp;XUẤT BÁO CÁO
                    </button>
                </div>
            </div>

            <div className="toolbar">
                <div className="admin-search-box-wrap">
                    <i className="bi bi-search admin-search-icon"></i>
                    <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Tìm kiếm Mã đơn, Tên khách hàng..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>

                <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">Trạng thái: Tất cả</option>
                    {(availableStatuses.includes(1) || statusFilter === "1") && <option value="1">Chờ xác nhận</option>}
                    {(availableStatuses.includes(2) || statusFilter === "2") && <option value="2">Đang giao hàng</option>}
                    {(availableStatuses.includes(5) || statusFilter === "5") && <option value="5">Đã nhận hàng (Chờ duyệt)</option>}
                    {(availableStatuses.includes(3) || statusFilter === "3") && <option value="3">Đã giao thành công</option>}
                    {(availableStatuses.includes(4) || statusFilter === "4") && <option value="4">Đã hủy</option>}
                </select>
            </div>

            <div className="table-card">
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: '#000' }}>
                        <div className="spinner-border text-cyan" role="status" style={{ width: '3rem', height: '3rem', color: 'var(--accent-cyan)' }}>
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p style={{ marginTop: '20px', letterSpacing: '1px', fontSize: '13px' }}>ĐANG TẢI DANH SÁCH ĐƠN HÀNG...</p>
                    </div>
                ) : error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)' }}>
                        <i className="bi bi-exclamation-triangle" style={{ fontSize: '40px' }}></i>
                        <p style={{ marginTop: '10px' }}>{error}</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div style={{ padding: '60px 40px', textAlign: 'center', color: '#000' }}>
                        <i className="bi bi-inbox" style={{ fontSize: '48px', color: '#333' }}></i>
                        <p style={{ marginTop: '15px' }}>Không có đơn hàng nào khớp với tìm kiếm.</p>
                    </div>
                ) : (
                    <table>
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
                                        <td>
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
                                        <td className="total-amount" style={order.status === 4 ? { color: '#555' } : {}}>
                                            {formatCurrency(order.finalAmount)}
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1 align-items-center">
                                                <select
                                                    className={`filter-select status-select-badge ${statusInfo.class}`}
                                                    style={{ padding: '5px 30px 5px 10px', fontSize: '12px', margin: 0 }}
                                                    value={order.status}
                                                    disabled={order.status === 3 || order.status === 4}
                                                    onChange={(e) => handleStatusChange(order.orderCode, parseInt(e.target.value))}
                                                >
                                                    {order.status === 1 && <option value="1">Chờ xác nhận</option>}
                                                    {(order.status === 1 || order.status === 2) && <option value="2">Đang giao hàng</option>}
                                                    {order.status === 5 && <option value="5">Đã nhận hàng (Chờ duyệt)</option>}
                                                    {order.status === 5 && <option value="3">Xác nhận thành công</option>}
                                                    {order.status === 3 && <option value="3">Thành công</option>}
                                                    {order.status !== 3 && order.status !== 4 && <option value="4">Hủy đơn</option>}
                                                    {order.status === 4 && <option value="4">Đã hủy</option>}
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
                                                className="admin-btn-view-details"
                                                title="Xem chi tiết"
                                            >
                                                <i className="bi bi-eye"></i>
                                                <span>Xem</span>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* HIGH-END DETAIL MODAL */}
            {isModalOpen && (
                <div className="modal-backdrop-neon" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-container-neon" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-neon">
                            <h3 className="font-oswald"><i className="bi bi-receipt-cutoff"></i> CHI TIẾT ĐƠN HÀNG: <span style={{ color: 'var(--accent-cyan)' }}>{selectedOrderCode}</span></h3>
                            <button className="btn-close-neon" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body-neon">
                            {modalLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: '#000' }}>
                                    <div className="spinner-border text-cyan" role="status" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--accent-cyan)' }}></div>
                                    <p style={{ marginTop: '15px', fontSize: '12px', letterSpacing: '1px' }}>ĐANG TẢI CHI TIẾT...</p>
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
                                            {Number(orderDetail.order.status) === 4 && orderDetail.order.cancel_reason && (
                                                <p style={{ color: '#dc2626', marginTop: '6px' }}><b>Lý do hủy:</b> <span style={{ color: '#fecaca', background: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{orderDetail.order.cancel_reason}</span></p>
                                            )}
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
                                                    {Number(orderDetail.order.status) === 1 && <th style={{ width: '60px', textAlign: 'center' }}>Thao tác</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orderDetail.items && orderDetail.items.map((item, index) => {
                                                    const imgUrl = item.image_url
                                                        ? (item.image_url.startsWith('http') ? item.image_url : `http://localhost:8080/images/${item.image_url}`)
                                                        : "https://ui-avatars.com/api/?name=SP&background=121212&color=00f2ff&bold=true";
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
                                                            {Number(orderDetail.order.status) === 1 && (
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <button 
                                                                        type="button"
                                                                        className="btn btn-sm btn-link text-danger p-0"
                                                                        onClick={() => handleDeleteOrderItem(orderDetail.order.order_code, item.product_variant_id, item.product_name)}
                                                                        title="Xóa sản phẩm"
                                                                        style={{ fontSize: '16px' }}
                                                                    >
                                                                        <i className="bi bi-trash"></i>
                                                                    </button>
                                                                </td>
                                                            )}
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
                                        <hr style={{ borderColor: '#222', margin: '10px 0' }} />
                                        <div className="summary-row final-row">
                                            <span>TỔNG THANH TOÁN:</span>
                                            <span className="cyan-glow-text">{formatCurrency(orderDetail.order.final_amount)}</span>
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
            {/* CUSTOM CONFIRM MODAL */}
            {confirmModal.isOpen && (
                <div className="admin-confirm-overlay">
                    <div className="admin-confirm-box animate__animated animate__zoomIn">
                        <div className="admin-confirm-icon" style={confirmModal.newStatus === 4 ? {color:'#e50914'} : {}}>
                            <i className={confirmModal.newStatus === 4 ? "bi bi-x-circle" : "bi bi-exclamation-circle"}></i>
                        </div>
                        <h4 className="admin-confirm-title">
                            {confirmModal.newStatus === 4 ? "❗ Xác nhận hủy đơn hàng" : "Xác nhận thay đổi"}
                        </h4>
                        <p className="admin-confirm-message">{confirmModal.message}</p>

                        {/* Textarea lý do hủy - chỉ hiển khi status = 4 (Hủy) */}
                        {confirmModal.newStatus === 4 && (
                            <div style={{ marginTop: '12px', textAlign: 'left' }}>
                                <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>
                                    Lý do hủy <span style={{color:'#e50914'}}>*</span>
                                </label>

                                {/* Gợi ý lý do hủy nhanh */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                    {QUICK_CANCEL_REASONS.map((reason, idx) => {
                                        const isSelected = confirmModal.cancelReason === reason;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                className={`admin-quick-reason-btn ${isSelected ? 'active' : ''}`}
                                                onClick={() => setConfirmModal(prev => ({ 
                                                    ...prev, 
                                                    cancelReason: isSelected ? "" : reason 
                                                }))}
                                            >
                                                {reason}
                                            </button>
                                        );
                                    })}
                                </div>

                                <textarea
                                    value={confirmModal.cancelReason}
                                    onChange={e => setConfirmModal(prev => ({ ...prev, cancelReason: e.target.value }))}
                                    placeholder="Nhập lý do hủy đơn hàng... (ví dụ: khách yêu cầu hủy, hết hàng, địa chỉ không hợp lệ...)"
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        border: '1.5px solid #e5e7eb',
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        fontSize: '13px',
                                        fontFamily: 'Inter, sans-serif',
                                        resize: 'vertical',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        color: '#1e293b',
                                        lineHeight: '1.5'
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#e50914'}
                                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                />
                                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', marginBottom: 0 }}>
                                    Lý do sẽ được hiển thị cho khách hàng.
                                </p>
                            </div>
                        )}

                        <div className="admin-confirm-actions">
                            <button className="admin-btn-confirm-cancel" onClick={cancelStatusChange}>Hủy bỏ</button>
                            <button
                                className="admin-btn-confirm-ok"
                                onClick={submitStatusChange}
                                style={confirmModal.newStatus === 4 ? {background:'#e50914', borderColor:'#e50914'} : {}}
                                disabled={confirmModal.newStatus === 4 && (!confirmModal.cancelReason || !confirmModal.cancelReason.trim())}
                            >
                                {confirmModal.newStatus === 4 ? '⚠️ Xác nhận hủy' : 'Đồng ý'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .admin-page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
                .sub-title-neon { display: block; color: #000; font-size: 14px; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px; text-transform: uppercase; font-family: 'Oswald'; }
                .cinematic-title { font-family: 'Oswald', sans-serif; font-size: 40px; font-weight: 800; color: #000; margin: 0; line-height: 1; }
                
                .header-right-actions { display: flex; align-items: center; }
                .btn-red-skew { 
                    background: #e50914; color: #fff; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px 30px; font-family: 'Oswald', sans-serif; font-weight: 800; text-transform: uppercase; 
                    transition: 0.3s; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; text-decoration: none;
                }
                .btn-red-skew:hover { background: #fff; color: #000; box-shadow: 0 8px 24px rgba(229,9,20,0.25); transform: translateY(-3px); }
                .toolbar { display: flex; gap: 14px; align-items: center; justify-content: space-between; margin-bottom: 24px; background: #fff; padding: 12px 16px; border: 1px solid #e8eaed; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); flex-wrap: wrap; max-width: 100%; box-sizing: border-box; }
                .admin-search-box-wrap { position: relative; flex: 1; max-width: 100%; min-width: 220px; box-sizing: border-box; background: transparent !important; border: none !important; padding: 0 !important; display: block !important; }
                .admin-search-input { width: 100%; background: #fff !important; border: 1.5px solid #dadce0 !important; padding: 10px 16px 10px 42px !important; color: #000 !important; outline: none; transition: all 0.2s ease; height: 44px; border-radius: 12px !important; font-weight: 500; font-size: 14px; font-family: 'Inter', sans-serif; box-sizing: border-box; }
                .admin-search-input:focus { border-color: #e50914 !important; box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.1) !important; }
                .admin-search-input::placeholder { color: #9aa0a6; }
                .admin-search-icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #888 !important; font-size: 16px; pointer-events: none; z-index: 5; }
                
                .table-card { background: #fff; border: 1px solid #f1f5f9; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow-x: auto; margin-top: 20px; border-radius: 14px; width: 100%; box-sizing: border-box; }
                table { width: 100%; border-collapse: collapse; min-width: 850px; }
                th { background: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; padding: 14px 16px; text-align: left; font-family: 'Oswald'; border-bottom: 1px solid #f1f5f9; font-weight: 700; letter-spacing: 0.5px; }
                td { padding: 14px 16px; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #1e293b; font-weight: 500; }
                
                .order-id { font-family: 'Oswald'; color: #000; font-weight: 800; text-decoration: none; transition: 0.2s; font-size: 16px; }
                .order-id:hover { color: var(--accent-red); text-shadow: none; text-decoration: underline; }
                .customer-name { display: block; font-weight: 800; color: #000; font-size: 15px; }
                .customer-date { font-size: 12px; color: #555; display: flex; align-items: center; gap: 5px; margin-top: 3px; font-weight: 600; }
 
                .admin-btn-view-details {
                    background: #f8fafc !important;
                    border: 1px solid #e2e8f0 !important;
                    color: #64748b !important;
                    height: 36px !important;
                    width: auto !important;
                    padding: 0 14px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 6px !important;
                    border-radius: 8px !important;
                    font-weight: 700 !important;
                    font-size: 12px !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    box-shadow: none !important;
                    text-decoration: none !important;
                    margin: 0 !important;
                }
                .admin-btn-view-details:hover {
                    background: #1e293b !important;
                    color: #fff !important;
                    border-color: #1e293b !important;
                    transform: translateY(-1px) !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                }
                .admin-btn-view-details i {
                    font-size: 14px !important;
                    margin: 0 !important;
                    line-height: 1 !important;
                }
                .btn-view:hover { background: #1e293b; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-1px); }
                
                .filter-select { background: #fff !important; color: #3c4043 !important; border: 1.5px solid #dadce0 !important; padding: 8px 14px; outline: none; cursor: pointer; height: 40px; border-radius: 24px; min-width: 170px; font-weight: 400; font-family: 'Inter'; font-size: 14px; transition: all 0.2s; }
                .filter-select:focus { border-color: #1a73e8 !important; box-shadow: 0 0 0 3px rgba(26,115,232,0.1) !important; }

                /* Status badging */
                .status-select-badge { border-radius: 6px; font-weight: 800; font-family: 'Oswald', sans-serif; text-transform: uppercase; font-size: 13px; border: 1px solid #e2e8f0 !important; box-shadow: 0 4px 16px rgba(0,0,0,0.08); cursor: pointer; }
                .status-pending { background: #fff !important; color: #000 !important; }
                .status-shipping { background: #fff !important; color: #000 !important; }
                .status-success { background: #000 !important; color: #fff !important; }
                .status-cancel { background: var(--accent-red) !important; color: #fff !important; }
                .status-delivered { background: #fff !important; color: #000 !important; }

                .badge-payment { font-size: 11px; font-weight: 800; padding: 6px 12px; background: #fff; color: #000; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); text-transform: uppercase; }
                .payment-vnpay { background: #fff !important; color: #000 !important; }

                /* Modern Brutalism Modal */
                .modal-backdrop-neon {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 2000;
                    padding: 20px; animation: fadeIn 0.25s ease-out;
                }
                .modal-container-neon {
                    background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                    width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; border-radius: 16px;
                    display: flex; flex-direction: column; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .modal-header-neon {
                    padding: 20px 25px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 16px 16px 0 0;
                }
                .modal-header-neon h3 { margin: 0; font-size: 24px; color: #000; letter-spacing: 1px; display: flex; align-items: center; gap: 10px; font-weight: 800; }
                .btn-close-neon { background: transparent; border: none; color: #000; font-size: 32px; font-weight: 800; cursor: pointer; transition: 0.2s; }
                .btn-close-neon:hover { color: var(--accent-red); }
                .modal-body-neon { padding: 30px; background: #fff; }

                .order-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
                .detail-panel { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-radius: 12px; }
                .panel-title { margin-top: 0; font-size: 16px; color: #1e293b; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; }
                .detail-panel p { margin: 10px 0; font-size: 14px; color: #334155; font-weight: 500; }
                .detail-panel b { color: #1e293b; font-weight: 700; margin-right: 5px; }

                .badge-status-neon { font-size: 12px; font-weight: 800; padding: 6px 12px; font-family: 'Oswald'; text-transform: uppercase; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

                /* Modal Product Table */
                .product-table-wrapper { background: #fff; border: 1px solid #e2e8f0; margin-top: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-radius: 12px; overflow: hidden; }
                .modal-product-table { width: 100%; border-collapse: collapse; }
                .modal-product-table th { background: #f8fafc; padding: 14px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b; font-family: 'Oswald'; font-weight: 700; text-transform: uppercase; }
                .modal-product-table td { padding: 14px; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #1e293b; font-weight: 500; }
                .modal-prod-info { display: flex; align-items: center; gap: 15px; }
                .modal-prod-img { width: 55px; height: 55px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 8px; }
                .modal-prod-name { font-weight: 800; color: #000; font-size: 14px; line-height: 1.4; text-transform: uppercase; }
                .modal-prod-variant { font-size: 12px; color: #555; margin-top: 4px; font-weight: 700; }

                .price-summary-panel { margin-top: 30px; max-width: 400px; margin-left: auto; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; padding: 25px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 14px; }
                .summary-row { display: flex; justify-content: space-between; font-size: 15px; color: #334155; font-weight: 600; }
                .final-row { font-size: 22px; font-family: 'Oswald'; font-weight: 800; color: #1e293b; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
                .cyan-glow-text { color: #000 !important; text-shadow: none; }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

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
                    background: #b91c1c;
                    box-shadow: 0 8px 12px -1px rgba(229, 9, 20, 0.3);
                }

                /* Quick Cancel Reason Buttons */
                .admin-quick-reason-btn {
                    background: #f3f4f6;
                    color: #4b5563;
                    border: 1px solid #e5e7eb;
                    border-radius: 16px;
                    padding: 5px 12px;
                    font-size: 11.5px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    font-family: 'Inter', sans-serif;
                }
                .admin-quick-reason-btn:hover {
                    background: #e5e7eb;
                    color: #1f2937;
                    border-color: #d1d5db;
                }
                .admin-quick-reason-btn.active {
                    background: #fee2e2;
                    color: #e50914;
                    border-color: #fca5a5;
                }
            `}</style>
        </AdminLayout>
    );
};

export default AdminOrders;
