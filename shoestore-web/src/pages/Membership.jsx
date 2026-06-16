import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import 'animate.css';
import './Membership.css';

const hexToRgb = (hex) => {
    if (!hex) return '229, 9, 20';
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        return cleanHex.split('').map(char => parseInt(char + char, 16)).join(', ');
    }
    if (cleanHex.length !== 6) return '229, 9, 20';
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
};

const formatCardNumber = (code) => {
    if (!code) return 'MBR - 2026 - 0000 - 0000';
    const cleanDigits = code.replace(/[^0-9]/g, '');
    const padDigits = (cleanDigits + '00000000').substring(0, 8);
    return `MBR - 2026 - ${padDigits.substring(0, 4)} - ${padDigits.substring(4, 8)}`;
};

const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return new Intl.NumberFormat('vi-VN').format(num);
};


const getPerksForRank = (r) => {
    if (!r) return [];
    const name = r.rankName || r.name || '';
    const lower = name.toLowerCase();
    const isFreeShipping = !!r.freeShipping || !!r.free_shipping;
    const discount = r.discountPercent !== null && r.discountPercent !== undefined ? r.discountPercent : (r.discount || 0);

    if (lower.includes('kim cuong') || lower.includes('diamond') || lower.includes('cương')) {
        return [
            `Giảm giá ${discount}% tất cả hóa đơn`,
            isFreeShipping ? 'Miễn phí giao hàng không giới hạn' : 'Miễn phí giao hàng đơn từ 500K',
            'Quyền mua Sneaker bản giới hạn',
            'Lối đi riêng & thử giày VIP tại Store',
            'Chăm sóc đặc biệt 24/7'
        ];
    } else if (lower.includes('vàng') || lower.includes('gold')) {
        return [
            `Giảm giá ${discount}% tất cả hóa đơn`,
            isFreeShipping ? 'Miễn phí giao hàng toàn quốc' : 'Miễn phí giao hàng đơn từ 500K',
            'Ưu tiên đặt trước giày sắp ra mắt',
            'Quà tặng sinh nhật VIP',
            'Hỗ trợ khách hàng ưu tiên'
        ];
    } else if (lower.includes('bạc') || lower.includes('silver')) {
        return [
            `Giảm giá ${discount}% tất cả hóa đơn`,
            isFreeShipping ? 'Miễn phí giao hàng toàn quốc' : 'Miễn phí giao hàng đơn từ 500K',
            'Tích điểm đổi quà (10K = 1đ)',
            'Quà tặng sinh nhật cơ bản',
            'Hỗ trợ khách hàng tiêu chuẩn'
        ];
    } else {
        return [
            `Giảm giá ${discount}% tất cả hóa đơn`,
            isFreeShipping ? 'Miễn phí giao hàng toàn quốc' : 'Phí giao hàng tiêu chuẩn',
            'Tích điểm đổi quà (10K = 1đ)',
            'Nhận tin tức ưu đãi sớm nhất',
            'Hỗ trợ khách hàng tiêu chuẩn',
            'Quà tặng sinh nhật cơ bản'
        ];
    }
};

const Membership = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState(null);
    const [allRanks, setAllRanks] = useState([]);
    const [rankInfo, setRankInfo] = useState(null);
    const [nextRank, setNextRank] = useState(null);
    const [vouchers, setVouchers] = useState([]);
    const [loggedIn, setLoggedIn] = useState(false);
    const [activeFaq, setActiveFaq] = useState(null);

    useEffect(() => {
        fetchMembershipData();
    }, []);

    const fetchMembershipData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/membership');
            
            if (res.data && res.data.success && res.data.loggedIn) {
                setLoggedIn(true);
                setUserInfo(res.data.account);
                
                const ranksList = res.data.ranks || [];
                setAllRanks(ranksList);
                
                const currentRankId = res.data.account.membership_rank_id;
                let currentRank = ranksList.find(r => r.id === currentRankId);
                
                if (!currentRank && ranksList.length > 0) {
                    currentRank = ranksList[0];
                }
                
                setRankInfo(currentRank);
                
                if (currentRank) {
                    const next = ranksList.find(r => r.minPoints > currentRank.minPoints);
                    setNextRank(next || null);
                }

                setVouchers(res.data.vouchers || []);
            } else {
                setLoggedIn(false);
            }
        } catch (error) {
            console.error("Lỗi tải thông tin thành viên:", error);
            if (error.response && error.response.status === 401) {
                setLoggedIn(false);
            }
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const toggleFaq = (idx) => {
        setActiveFaq(activeFaq === idx ? null : idx);
    };

    if (loading) {
        return (
            <Layout>
                <div className="member-epic-theme">
                    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                        <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}></div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!loggedIn) {
        return (
            <Layout>
                <div className="member-epic-theme">
                    <div className="container py-5 text-center my-5 epic-empty-box animate__animated animate__fadeIn">
                        <i className="fa fa-id-card fa-4x text-danger mb-4"></i>
                        <h2 className="font-oswald fw-bold text-uppercase mb-3">CHƯƠNG TRÌNH THÀNH VIÊN</h2>
                        <p className="fw-bold mb-4">Bạn cần đăng nhập để xem thông tin hạng thẻ và nhận mã giảm giá đặc quyền.</p>
                        <Link to="/login" className="btn-brutal-black">ĐĂNG NHẬP NGAY</Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const totalSpent = userInfo ? parseFloat(userInfo.points || 0) : 0;
    const progressToNext = nextRank ? Math.min((totalSpent / nextRank.minPoints) * 100, 100) : 100;

    return (
        <Layout>
            <div className="member-epic-theme">
                {/* EPIC MEMBER HEADER */}
                <div className="epic-member-header">
                    <div className="container text-center">
                        <span className="epic-tag">MEMBERSHIP PROGRAM</span>
                        <h1 className="epic-header-title mt-3 animate__animated animate__fadeInDown">HELLO, <span className="text-red">{userInfo.full_name || userInfo.email}</span></h1>
                    </div>
                </div>

                <div className="container py-5">
                    <div className="row g-5 align-items-stretch">
                        <div className="col-lg-5 d-flex flex-column justify-content-center">
                            {/* PREMIUM SMART CREDIT CARD */}
                            <div className="metallic-card-container animate__animated animate__fadeInLeft">
                                <div className="epic-id-card metallic-card" style={{ 
                                    borderColor: rankInfo?.colorCode || '#e50914',
                                    '--rank-color': rankInfo?.colorCode || '#e50914',
                                    '--rank-color-rgb': hexToRgb(rankInfo?.colorCode)
                                }}>
                                    <div className="metallic-glare"></div>
                                    <div className="id-card-top pb-3 d-flex justify-content-between align-items-center">
                                        <h3 className="font-oswald fw-bold text-uppercase m-0" style={{ letterSpacing: '1.5px', fontSize: '18px' }}>SNEAKER STREET</h3>
                                        <div className="epic-rank-badge" style={{ background: rankInfo?.colorCode || '#e50914', color: '#fff' }}>
                                            {rankInfo ? rankInfo.rankName : (userInfo.rank_name || 'MEMBER')}
                                        </div>
                                    </div>
                                    <div className="id-card-middle flex-grow-1 d-flex flex-column justify-content-center">
                                        <div className="card-chip"></div>
                                        <div className="card-number">{formatCardNumber(userInfo.user_code)}</div>
                                    </div>
                                    <div className="id-card-bottom pt-3 d-flex justify-content-between align-items-center">
                                        <div>
                                            <div className="text-uppercase fw-bold text-muted small letter-spacing-1">CARDHOLDER</div>
                                            <div className="card-holder-name text-uppercase">{userInfo.full_name || userInfo.email}</div>
                                        </div>
                                        <div>
                                            <div className="text-uppercase fw-bold text-muted small letter-spacing-1 text-end">NFC</div>
                                            <i className="fa-solid fa-nfc-symbol nfc-icon text-end d-block" style={{ color: rankInfo?.colorCode || '#e50914' }}></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-7">
                            {/* EPIC STATS */}
                            <div className="epic-stats-box animate__animated animate__fadeInRight">
                                <h3 className="font-oswald fw-bold text-uppercase mb-4 pb-2">TIẾN ĐỘ THĂNG HẠNG CỦA BẠN</h3>
                                
                                <div className="d-flex justify-content-between font-oswald fw-bold text-uppercase mb-2" style={{ fontSize: '13px', color: '#555' }}>
                                    <span>{rankInfo ? rankInfo.rankName : (userInfo.rank_name || 'CURRENT')}</span>
                                    <span>{nextRank ? nextRank.rankName : 'HẠNG TỐI ĐA'}</span>
                                </div>
                                
                                <div className="epic-progress-bar mb-3">
                                    <div className="epic-progress-fill" style={{ width: `${progressToNext}%` }}></div>
                                </div>
                                
                                {nextRank ? (
                                    <p className="fw-bold mb-4" style={{ fontSize: '15px', color: '#444' }}>
                                        Cần tích lũy thêm <span className="text-red fs-5" style={{ fontWeight: '700' }}>{formatNumber(nextRank.minPoints - totalSpent)} điểm</span> để thăng hạng <span className="font-oswald text-red" style={{ fontWeight: '700' }}>{nextRank.rankName}</span>
                                    </p>
                                ) : (
                                    <p className="fw-bold text-success mb-4" style={{ fontSize: '15px' }}>Chúc mừng! Bạn đã đạt hạng thẻ cao nhất và sở hữu toàn bộ đặc quyền.</p>
                                )}

                                <div className="row g-4 pt-3 mt-2">
                                    <div className="col-6">
                                        <div className="text-uppercase fw-bold text-muted letter-spacing-1">ĐIỂM TÍCH LŨY HIỆN TẠI</div>
                                        <div className="font-numeric fs-2 text-red">{formatNumber(totalSpent)}</div>
                                    </div>
                                    <div className="col-6 border-start">
                                        <div className="text-uppercase fw-bold text-muted letter-spacing-1 ps-3">MÃ THÀNH VIÊN</div>
                                        <div className="font-numeric fs-2 ps-3" style={{ color: '#111' }}>{userInfo.user_code || 'MEMBER'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TIER BENEFITS COMPARISON GRID */}
                    <div className="mt-5 pt-5">
                        <div className="section-header">
                            <h2>ĐẶC QUYỀN HẠNG THÀNH VIÊN</h2>
                            <p>Tích lũy chi tiêu nhiều hơn, nâng hạng thẻ cao hơn để hưởng chiết khấu độc quyền trên từng đơn hàng.</p>
                        </div>
                        <div className="tier-perks-grid">
                            {allRanks.map((r) => {
                                const isActive = userInfo?.membership_rank_id === r.id;
                                const perks = getPerksForRank(r);
                                return (
                                    <div 
                                        key={r.id} 
                                        className={`tier-perk-card ${isActive ? 'active-rank-card' : ''}`}
                                        style={{
                                            '--tier-color': r.colorCode || '#e50914',
                                            '--tier-color-rgb': hexToRgb(r.colorCode),
                                            '--tier-light-color': `rgba(${hexToRgb(r.colorCode)}, 0.06)`
                                        }}
                                    >
                                        {isActive && <div className="active-tier-badge">HẠNG CỦA BẠN</div>}
                                        <div className="tier-card-header">
                                            <div className="tier-icon-circle">
                                                <i className="fa-solid fa-gem"></i>
                                            </div>
                                            <h3 className="tier-name">{r.rankName}</h3>
                                            <div className="tier-points-label">Từ {formatNumber(r.minPoints)} điểm</div>
                                        </div>

                                        <div className="tier-discount-box">
                                            <div className="tier-discount-val">-{r.discountPercent || 0}%</div>
                                            <div className="tier-discount-desc">Giảm trực tiếp mỗi đơn</div>
                                        </div>

                                        <ul className="tier-perks-list flex-grow-1">
                                            {perks.map((p, idx) => (
                                                <li key={idx}><i className="fa-solid fa-circle-check"></i> {p}</li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* HOW IT WORKS PROCESS */}
                    <div className="mt-5 pt-5">
                        <div className="section-header">
                            <h2>HƯỚNG DẪN TÍCH ĐIỂM</h2>
                            <p>Cách hoạt động cực kỳ đơn giản để bạn thăng hạng và nhận các quyền lợi VIP.</p>
                        </div>
                        <div className="how-it-works-grid">
                            <div className="step-card">
                                <div className="step-number">01</div>
                                <div className="step-icon-wrapper">
                                    <i className="fa-solid fa-cart-shopping"></i>
                                </div>
                                <h4>Mua Sắm Tích Lũy</h4>
                                <p>Mỗi đơn hàng hoàn thành tại ShoeStore đều được tự động quy đổi thành điểm thành viên (10.000 VND mua sắm = 1 điểm tích lũy).</p>
                            </div>
                            <div className="step-card">
                                <div className="step-number">02</div>
                                <div className="step-icon-wrapper">
                                    <i className="fa-solid fa-circle-up"></i>
                                </div>
                                <h4>Tự Động Thăng Hạng</h4>
                                <p>Hệ thống tự động quét và nâng hạng thẻ của bạn ngay lập tức khi tổng điểm chi tiêu tích lũy đạt đến các mốc quy định.</p>
                            </div>
                            <div className="step-card">
                                <div className="step-number">03</div>
                                <div className="step-icon-wrapper">
                                    <i className="fa-solid fa-gift"></i>
                                </div>
                                <h4>Nhận Đặc Quyền VIP</h4>
                                <p>Tự động giảm giá trực tiếp vào hóa đơn tiếp theo, nhận ưu đãi sinh nhật và đặc quyền mua các đôi giày limited trước mọi người.</p>
                            </div>
                        </div>
                    </div>

                    {/* EXCLUSIVE VOUCHERS */}
                    <div className="mt-5 pt-5">
                        <div className="section-header">
                            <h2>ƯU ĐÃI DÀNH RIÊNG CHO BẠN</h2>
                            <p>Dưới đây là các mã giảm giá đặc quyền chỉ có hạng thẻ của bạn mới được sở hữu và sử dụng.</p>
                        </div>
                        {vouchers.length > 0 ? (
                            <div className="row g-4">
                                {vouchers.map((v, idx) => (
                                    <div key={idx} className="col-md-6 col-lg-4 animate__animated animate__fadeInUp" style={{ animationDelay: `${idx * 0.1}s` }}>
                                        <div className="epic-voucher-card">
                                            <div className="voucher-left">
                                                <i className="fa-solid fa-bolt fs-1"></i>
                                                <div className="font-oswald fw-bold fs-5 mt-2">
                                                    GIẢM {v.discountType === 'PERCENT' || v.discount_type === 'PERCENT' ? `${v.discountValue || v.discount_value}%` : `${(v.discountValue || v.discount_value) / 1000}K`}
                                                </div>
                                            </div>
                                            <div className="voucher-right">
                                                <h4 className="font-oswald fw-bold mb-1">{v.code}</h4>
                                                <p className="fw-bold text-muted small mb-3">Đơn từ {formatCurrency(v.minOrderValue || v.min_order_value)}</p>
                                                <button className="btn-brutal-outline w-100 py-2 fs-6" onClick={() => {
                                                    navigator.clipboard.writeText(v.code);
                                                    alert('Đã copy mã: ' + v.code);
                                                }}>COPY MÃ</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="epic-empty-box text-center py-5">
                                <i className="fa-solid fa-ticket fa-4x text-muted mb-4 opacity-50"></i>
                                <h3 className="font-oswald fw-bold text-uppercase">CHƯA CÓ MÃ NÀO</h3>
                                <p className="fw-bold">Bạn chưa nhận được mã giảm giá nào. Hãy tiếp tục mua sắm để nhận đặc quyền!</p>
                                <Link to="/shop" className="btn-brutal-black mt-3">MUA SẮM NGAY</Link>
                            </div>
                        )}
                    </div>

                    {/* FAQ SECTION */}
                    <div className="mt-5 pt-5">
                        <div className="section-header">
                            <h2>CÂU HỎI THƯỜNG GẶP</h2>
                            <p>Giải đáp các thắc mắc phổ biến về chính sách tích lũy điểm và quyền lợi thành viên.</p>
                        </div>
                        <div className="faq-list">
                            <div className={`faq-item ${activeFaq === 0 ? 'active-faq' : ''}`}>
                                <button className="faq-question-btn" onClick={() => toggleFaq(0)}>
                                    Làm cách nào để tôi có thể tích lũy điểm thành viên?
                                    <i className="fa-solid fa-chevron-down"></i>
                                </button>
                                <div className="faq-answer">
                                    Điểm thành viên được tích lũy hoàn toàn tự động dựa trên hóa đơn mua sắm thực tế của bạn. Cứ mỗi 10,000 VND chi tiêu thanh toán thành công (online hoặc tại quầy), tài khoản của bạn sẽ tự động được cộng thêm 1 điểm thành viên.
                                </div>
                            </div>
                            <div className={`faq-item ${activeFaq === 1 ? 'active-faq' : ''}`}>
                                <button className="faq-question-btn" onClick={() => toggleFaq(1)}>
                                    Hạng thành viên của tôi có thời hạn sử dụng hay không?
                                    <i className="fa-solid fa-chevron-down"></i>
                                </button>
                                <div className="faq-answer">
                                    Không! Hạng thành viên tại ShoeStore là **trọn đời**. Sau khi thăng hạng, bạn sẽ được giữ nguyên hạng thẻ đó mãi mãi và hưởng toàn bộ đặc quyền tương ứng mà không phải lo sợ bị tụt hạng hay reset điểm hàng năm.
                                </div>
                            </div>
                            <div className={`faq-item ${activeFaq === 2 ? 'active-faq' : ''}`}>
                                <button className="faq-question-btn" onClick={() => toggleFaq(2)}>
                                    Chiết khấu thành viên có áp dụng đồng thời với các voucher khác không?
                                    <i className="fa-solid fa-chevron-down"></i>
                                </button>
                                <div className="faq-answer">
                                    Có! Chiết khấu theo hạng thành viên (ví dụ Bạc giảm 5%, Vàng giảm 10%, Kim Cương giảm 15%) được trừ trực tiếp vào giá trị của từng sản phẩm. Bạn vẫn có thể nhập thêm các mã giảm giá voucher, mã vận chuyển hoặc điểm tích lũy bổ sung ở bước thanh toán để tối đa hóa ưu đãi.
                                </div>
                            </div>
                            <div className={`faq-item ${activeFaq === 3 ? 'active-faq' : ''}`}>
                                <button className="faq-question-btn" onClick={() => toggleFaq(3)}>
                                    Đặc quyền mua trước Sneaker giới hạn hoạt động như thế nào?
                                    <i className="fa-solid fa-chevron-down"></i>
                                </button>
                                <div className="faq-answer">
                                    Đối với các dòng giày giới hạn (Limited Edition), thành viên hạng Vàng và Kim Cương sẽ được gửi email thông báo và mở trang đặt trước (pre-order) sớm từ 24h - 48h trước khi sản phẩm được bán công khai ngoài thị trường để đảm bảo bạn không bỏ lỡ đôi giày yêu thích.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Membership;