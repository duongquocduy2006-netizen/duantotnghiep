import React, { useState } from "react";
import AdminLayout from "../../components/AdminLayout";

const AdminPOS = () => {
    const [cart, setCart] = useState([
        { id: 1, name: "Nike Air Jordan 1 Low", price: 3250000, qty: 1, sku: "AJ1-L-001" },
        { id: 2, name: "Adidas Ultraboost 22", price: 4100000, qty: 1, sku: "UB22-042" },
    ]);
    const [searchProduct, setSearchProduct] = useState("");

    const products = [
        { id: 1, name: "Nike Air Jordan 1 Low", price: 3250000, stock: 15, sku: "AJ1-L-001", img: "https://placehold.co/100x100/121212/00f2ff?text=AJ1" },
        { id: 2, name: "Adidas Ultraboost 22", price: 4100000, stock: 8, sku: "UB22-042", img: "https://placehold.co/100x100/121212/00f2ff?text=UB22" },
        { id: 3, name: "Puma Suede Classic", price: 2150000, stock: 20, sku: "PSC-109", img: "https://placehold.co/100x100/121212/00f2ff?text=PSC" },
        { id: 4, name: "Nike Dunk Low Retro", price: 2900000, stock: 12, sku: "NDL-005", img: "https://placehold.co/100x100/121212/00f2ff?text=NDL" },
        { id: 5, name: "Vans Old Skool", price: 1850000, stock: 30, sku: "VOS-011", img: "https://placehold.co/100x100/121212/00f2ff?text=VOS" },
        { id: 6, name: "Converse Chuck 70", price: 2200000, stock: 25, sku: "CC70-088", img: "https://placehold.co/100x100/121212/00f2ff?text=CC70" },
    ];

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const updateQty = (id, delta) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    return (
        <AdminLayout>
            <div className="admin-page-header">
                <div className="header-left">
                    <span className="sub-title-neon"><i className="bi bi-display"></i> TERMINAL POS</span>
                    <h1 className="cinematic-title">HỆ THỐNG BÁN TẠI QUẦY</h1>
                </div>
                <div className="header-right-actions" style={{ display: 'flex', gap: '15px' }}>
                    <button className="btn-cyan-skew">
                        <i className="bi bi-clock-history"></i> &nbsp;GIAO DỊCH GẦN ĐÂY
                    </button>
                    <button className="btn-cyan-skew" style={{ background: '#e50914' }}>
                        <i className="bi bi-x-circle"></i> &nbsp;HUỶ ĐƠN
                    </button>
                </div>
            </div>

            <div className="pos-wrapper" style={{ display: 'flex', gap: '25px', height: 'calc(100vh - 200px)', padding: '0' }}>
                
                {/* LEFT: Product Wall */}
                <div className="pos-catalog" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="pos-search-area">
                        <div className="search-neon-wrapper">
                            <i className="bi bi-search"></i>
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm nhanh tên sản phẩm, mã SKU hoặc quét mã vạch (Ctrl + F)..." 
                                value={searchProduct}
                                onChange={(e) => setSearchProduct(e.target.value)}
                            />
                            <span className="search-hint">SEARCH</span>
                        </div>
                    </div>

                    <div className="pos-grid-cinematic">
                        {products.map(p => (
                            <div key={p.id} className="pos-card-alt" onClick={() => addToCart(p)}>
                                <div className="p-img-box">
                                    <img src={p.img} alt={p.name} />
                                    <div className="p-badge">{p.sku}</div>
                                </div>
                                <div className="p-info-alt">
                                    <div className="p-name">{p.name}</div>
                                    <div className="p-price-row">
                                        <span className="p-price">{p.price.toLocaleString()} ₫</span>
                                        <span className="p-stock">TỒN: {p.stock}</span>
                                    </div>
                                </div>
                                <div className="p-overlay-plus"><i className="bi bi-plus-lg"></i></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Order Panel */}
                <div className="pos-panel card-box" style={{ width: '420px', display: 'flex', flexDirection: 'column', padding: '0', background: 'var(--bg-card)', overflow: 'hidden' }}>
                    
                    <div className="panel-header" style={{ padding: '20px', borderBottom: '1px solid #333', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="font-oswald" style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '20px' }}>ĐƠN HÀNG #POS-001</h3>
                            <button className="btn-icon"><i className="bi bi-person-plus"></i></button>
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <i className="bi bi-calendar3"></i> 10/04/2026 17:37
                        </div>
                    </div>

                    <div className="panel-cart" style={{ flexGrow: 1, overflowY: 'auto', padding: '20px' }}>
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#333', marginTop: '100px' }}>
                                <i className="bi bi-cart-x" style={{ fontSize: '60px', display: 'block', opacity: 0.2 }}></i>
                                <span style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '12px', fontWeight: 600 }}>Giỏ hàng đang trống</span>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="cart-row" style={{ display: 'flex', gap: '15px', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div style={{ width: '50px', height: '50px', background: '#050505', borderRadius: '4px', border: '1px solid #222', flexShrink: 0 }}>
                                        <img src={`https://placehold.co/50x50/121212/00f2ff?text=${item.sku.split('-')[0]}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                    </div>
                                    <div style={{ flexGrow: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '5px' }}>{item.name}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>-</button>
                                                <span style={{ fontSize: '13px', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                                                <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                                            </div>
                                            <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontFamily: 'Oswald' }}>
                                                {(item.price * item.qty).toLocaleString()} ₫
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer' }}><i className="bi bi-x-lg"></i></button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="panel-footer" style={{ padding: '25px', background: '#0a0a0a', borderTop: '1px solid #333' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                            <span style={{ color: '#666' }}>Tạm tính:</span>
                            <span>{total.toLocaleString()} ₫</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                            <span style={{ color: '#666' }}>Giảm giá:</span>
                            <span style={{ color: 'var(--accent-red)' }}>-0 ₫</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: '700', borderTop: '2px dashed #222', paddingTop: '15px', marginTop: '10px' }}>
                            <span className="font-oswald">TỔNG CỘNG:</span>
                            <span className="font-oswald" style={{ color: 'var(--accent-cyan)' }}>{total.toLocaleString()} ₫</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                            <button className="btn-neon" style={{ background: '#333', color: '#fff', fontSize: '12px' }}>
                                <i className="bi bi-printer"></i> IN TẠM
                            </button>
                            <button className="btn-neon" style={{ fontSize: '12px' }}>
                                <i className="bi bi-cash-coin"></i> THANH TOÁN
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .admin-page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 30px;
                    padding-top: 10px;
                }
                .sub-title-neon {
                    display: block;
                    color: var(--accent-cyan);
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 2px;
                    margin-bottom: 5px;
                }
                .cinematic-title {
                    font-family: 'Oswald', sans-serif;
                    font-size: 40px;
                    font-weight: 700;
                    color: #fff;
                    margin: 0;
                }
                .btn-cyan-skew {
                    background: var(--accent-cyan);
                    color: #000;
                    border: none;
                    padding: 10px 25px;
                    font-family: 'Oswald', sans-serif;
                    font-weight: 700;
                    text-transform: uppercase;
                    clip-path: polygon(0 0, 100% 0, 92% 100%, 0% 100%);
                    transition: 0.3s;
                    cursor: pointer;
                    font-size: 13px;
                }
                .btn-cyan-skew:hover {
                    background: #fff;
                    transform: scale(1.05);
                }

                .pos-search-area {
                    background: #0a0a0a;
                    padding: 15px;
                    border: 1px solid #222;
                }
                .search-neon-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .search-neon-wrapper i {
                    position: absolute;
                    left: 15px;
                    color: var(--accent-cyan);
                }
                .search-neon-wrapper input {
                    width: 100%;
                    background: #000;
                    border: 1px solid #333;
                    padding: 12px 15px 12px 45px;
                    color: #fff;
                    outline: none;
                }
                .search-neon-wrapper input:focus {
                    border-color: var(--accent-cyan);
                    box-shadow: 0 0 10px rgba(0, 242, 255, 0.1);
                }
                .search-hint {
                    position: absolute;
                    right: 15px;
                    font-size: 10px;
                    color: #555;
                    font-weight: 700;
                }

                .pos-grid-cinematic {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 15px;
                    overflow-y: auto;
                    padding-right: 5px;
                }
                .pos-card-alt {
                    background: #111;
                    border: 1px solid #222;
                    padding: 10px;
                    cursor: pointer;
                    transition: 0.3s;
                    position: relative;
                    overflow: hidden;
                }
                .pos-card-alt:hover {
                    border-color: var(--accent-cyan);
                    transform: translateY(-3px);
                }
                .p-img-box {
                    height: 140px;
                    background: #000;
                    margin-bottom: 12px;
                    position: relative;
                    border: 1px solid #222;
                }
                .p-img-box img { width: 100%; height: 100%; object-fit: cover; }
                .p-badge {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: rgba(0,0,0,0.8);
                    color: #fff;
                    font-size: 9px;
                    padding: 2px 6px;
                    border: 1px solid #333;
                }
                .p-name { font-family: 'Oswald'; color: #fff; font-size: 14px; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .p-price-row { display: flex; justify-content: space-between; align-items: center; }
                .p-price { color: var(--accent-cyan); font-weight: 700; font-size: 15px; }
                .p-stock { font-size: 9px; color: #555; }
                
                .p-overlay-plus {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,242,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: 0.3s;
                    font-size: 24px;
                    color: var(--accent-cyan);
                }
                .pos-card-alt:hover .p-overlay-plus { opacity: 1; }

                .qty-btn {
                    width: 24px;
                    height: 24px;
                    background: #1a1a1a;
                    border: 1px solid #333;
                    color: #888;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .qty-btn:hover { background: #222; color: #fff; border-color: #555; }
                .btn-icon { width: 35px; height: 35px; background: rgba(255,255,255,0.03); border: 1px solid #333; color: #888; cursor: pointer; transition: 0.3s; }
                .btn-icon:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); }
                
                .pos-grid-cinematic::-webkit-scrollbar { width: 4px; }
                .pos-grid-cinematic::-webkit-scrollbar-thumb { background: #222; }
            `}</style>
        </AdminLayout>
    );
};

export default AdminPOS;
