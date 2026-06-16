import React from 'react';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import 'animate.css';

const Vouchers = () => {
    const publicVouchers = [
        {
            id: 1,
            code: "WELCOME50K",
            title: "Voucher Chào Mừng",
            desc: "Giảm 50k cho đơn hàng đầu tiên từ 500k",
            type: "FIXED",
            value: 50000,
            expiry: "31/12/2026",
            brand: "SHOE STORE",
            color: "#e50914"
        },
        {
            id: 2,
            code: "NIKE2026",
            title: "Ưu Đãi Nike",
            desc: "Giảm 10% tối đa 200k cho sản phẩm Nike",
            type: "PERCENT",
            value: 10,
            expiry: "30/06/2026",
            brand: "NIKE OFFICIAL",
            color: "#00f2ff"
        },
        {
            id: 3,
            code: "FREESHIPGOLD",
            title: "Miễn Phí Vận Chuyển",
            desc: "Dành riêng cho hạng Vàng trở lên",
            type: "SHIPPING",
            value: 0,
            expiry: "Vô thời hạn",
            brand: "ALL BRANDS",
            color: "#fbbf24"
        },
        {
            id: 4,
            code: "SUPERFRIDAY",
            title: "Siêu Thứ 6",
            desc: "Giảm ngay 100k cho đơn từ 1.5tr",
            type: "FIXED",
            value: 100000,
            expiry: "Mỗi thứ 6",
            brand: "SHOE STORE",
            color: "#8a2be2"
        }
    ];

    return (
        <Layout>
            <div className="vouchers-page" style={{ backgroundColor: '#050505', minHeight: '100vh', padding: '60px 0' }}>
                <div className="container">
                    <div className="text-center mb-5 animate__animated animate__fadeInDown">
                        <h1 style={{ fontFamily: 'Oswald', fontSize: '48px', color: '#fff', letterSpacing: '2px' }}>
                            KHO <span style={{ color: '#e50914' }}>VOUCHERS</span> ĐỘC QUYỀN
                        </h1>
                        <p className="text-white-50">Săn ngay mã giảm giá để nhận ưu đãi cực hời từ ShoeStore</p>
                    </div>

                    <div className="row g-4">
                        {publicVouchers.map((v, idx) => (
                            <div key={v.id} className="col-lg-6 animate__animated animate__fadeInUp" style={{ animationDelay: `${idx * 0.1}s` }}>
                                <div className="voucher-item-cine">
                                    <div className="v-left-cine" style={{ backgroundColor: `${v.color}1a`, borderLeft: `4px solid ${v.color}` }}>
                                        <div className="v-val-cine" style={{ color: v.color }}>
                                            {v.type === 'PERCENT' ? `${v.value}%` : v.type === 'SHIPPING' ? <i className="fa fa-truck"></i> : `${v.value / 1000}K`}
                                        </div>
                                        <div className="v-lbl-cine">{v.type === 'SHIPPING' ? 'FREE' : 'OFF'}</div>
                                    </div>
                                    <div className="v-right-cine">
                                        <div className="v-brand-cine" style={{ color: v.color }}>{v.brand}</div>
                                        <h3 className="v-title-cine">{v.title}</h3>
                                        <p className="v-desc-cine">{v.desc}</p>
                                        <div className="v-footer-cine">
                                            <div className="v-exp-cine">HSD: {v.expiry}</div>
                                            <div className="v-code-box">
                                                <span className="v-code-text">{v.code}</span>
                                                <button className="v-copy-btn" onClick={() => navigator.clipboard.writeText(v.code)}>
                                                    SAO CHÉP
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .voucher-item-cine {
                    background: #121212;
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px;
                    display: flex;
                    overflow: hidden;
                    height: 180px;
                    transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                .voucher-item-cine:hover {
                    transform: translateY(-8px);
                    border-color: rgba(255,255,255,0.2);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                }
                .voucher-item-cine::after {
                    content: "";
                    position: absolute;
                    left: 128px;
                    top: -10px;
                    bottom: -10px;
                    width: 20px;
                    background-image: radial-gradient(circle at center, #050505 8px, transparent 8px);
                    background-size: 20px 20px;
                    z-index: 2;
                }
                .v-left-cine {
                    width: 140px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    position: relative;
                    z-index: 1;
                }
                .v-val-cine {
                    font-family: 'Oswald';
                    font-size: 36px;
                    font-weight: 700;
                    line-height: 1;
                }
                .v-lbl-cine {
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-top: 5px;
                    color: #777;
                    font-weight: 600;
                }
                .v-right-cine {
                    flex: 1;
                    padding: 25px;
                    padding-left: 35px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .v-brand-cine {
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    margin-bottom: 5px;
                }
                .v-title-cine {
                    color: #fff;
                    font-family: 'Oswald';
                    font-size: 18px;
                    margin-bottom: 5px;
                    text-transform: uppercase;
                }
                .v-desc-cine {
                    color: #9ca3af;
                    font-size: 13px;
                    margin-bottom: 15px;
                    line-height: 1.4;
                }
                .v-footer-cine {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-top: auto;
                }
                .v-exp-cine {
                    font-size: 11px;
                    color: #555;
                }
                .v-code-box {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .v-code-text {
                    font-family: 'Oswald';
                    font-size: 16px;
                    color: #fff;
                    letter-spacing: 1px;
                    background: #000;
                    padding: 4px 12px;
                    border: 1px dashed #444;
                    border-radius: 4px;
                }
                .v-copy-btn {
                    background: #e50914;
                    color: #fff;
                    border: none;
                    font-size: 10px;
                    font-weight: 700;
                    padding: 6px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: 0.3s;
                }
                .v-copy-btn:hover {
                    background: #ff0f1e;
                    transform: scale(1.05);
                    box-shadow: 0 0 15px rgba(229, 9, 20, 0.4);
                }
                @media (max-width: 576px) {
                    .voucher-item-cine { height: auto; flex-direction: column; }
                    .v-left-cine { width: 100%; height: 100px; border-left: none; border-bottom: 4px solid; }
                    .voucher-item-cine::after { display: none; }
                }
            `}</style>
        </Layout>
    );
};

export default Vouchers;
