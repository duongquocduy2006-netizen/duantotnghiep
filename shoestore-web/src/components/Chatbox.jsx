import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import './Chatbox.css';

const SUGGESTED_QUESTIONS = [
    { text: "Mẫu giày nào bán chạy nhất?", icon: "bi-fire" },
    { text: "Có chương trình Flash Sale nào không?", icon: "bi-lightning-charge-fill" },
    { text: "Phí giao hàng và thời gian vận chuyển?", icon: "bi-truck" },
    { text: "Quyền lợi tích điểm hạng thành viên?", icon: "bi-gem" },
    { text: "Hướng dẫn chọn size giày chuẩn?", icon: "bi-ruler" },
    { text: "Chính sách đổi trả hàng như thế nào?", icon: "bi-arrow-counterclockwise" }
];

// Helper to get unique client token per account or guest visitor
const getClientToken = () => {
    try {
        const savedAccount = localStorage.getItem('account');
        if (savedAccount) {
            const acc = JSON.parse(savedAccount);
            if (acc && acc.id) return `user_${acc.id}`;
            if (acc && acc.email) return `user_${acc.email}`;
        }
    } catch (e) {}

    let guestToken = localStorage.getItem('shoestore_chat_guest_token');
    if (!guestToken) {
        guestToken = 'guest_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem('shoestore_chat_guest_token', guestToken);
    }
    return guestToken;
};

// Global device lock storage key (persists across login/logout)
const DEVICE_LOCK_KEY = 'shoestore_chat_device_lock_until';

const Chatbox = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Xin chào! Tôi là Trợ lý AI của ShoeStore. Tôi có thể giúp gì cho bạn hôm nay?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const clientToken = getClientToken();

    const [lastMsg, setLastMsg] = useState('');
    const [repeatCount, setRepeatCount] = useState(0);

    const [lockUntil, setLockUntil] = useState(() => {
        const savedGlobal = localStorage.getItem(DEVICE_LOCK_KEY);
        const savedUser = localStorage.getItem(`shoestore_chat_lock_until_${clientToken}`);
        const maxSaved = Math.max(savedGlobal ? parseInt(savedGlobal, 10) : 0, savedUser ? parseInt(savedUser, 10) : 0);
        return maxSaved;
    });
    const [remainingMinutes, setRemainingMinutes] = useState(0);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Timer check for lock status
    useEffect(() => {
        const checkLockStatus = () => {
            const now = Date.now();
            if (lockUntil > now) {
                const mins = Math.ceil((lockUntil - now) / 60000);
                setRemainingMinutes(mins);
            } else {
                setRemainingMinutes(0);
                if (lockUntil !== 0) {
                    setLockUntil(0);
                    localStorage.removeItem(DEVICE_LOCK_KEY);
                    localStorage.removeItem(`shoestore_chat_lock_until_${clientToken}`);
                }
            }
        };

        checkLockStatus();
        const interval = setInterval(checkLockStatus, 5000);
        return () => clearInterval(interval);
    }, [lockUntil, clientToken]);

    // Apply lock from backend or frontend
    const applyLock = (targetLockUntil) => {
        setLockUntil(targetLockUntil);
        localStorage.setItem(DEVICE_LOCK_KEY, targetLockUntil.toString());
        localStorage.setItem(`shoestore_chat_lock_until_${clientToken}`, targetLockUntil.toString());
    };

    // --- TEXT SANITIZATION & PROFANITY FILTER ---
    const sanitizeAndFilterInput = (text) => {
        if (!text) return { valid: false, message: 'Vui lòng nhập nội dung câu hỏi!' };

        // Strip HTML & Script tags
        let cleaned = text.replace(/<[^>]*>?/gm, '').trim();

        if (!cleaned) return { valid: false, message: 'Nội dung chứa ký tự không hợp lệ!' };

        // Check profanity / vulgar words
        const lower = cleaned.toLowerCase();
        const profaneWords = ['đm', 'dmm', 'vãi', 'đéo', 'clmm', 'chó đẻ', 'buồi', 'lồn', 'cặc', 'fuck', 'shit'];
        for (let word of profaneWords) {
            if (lower.includes(word)) {
                return { valid: false, message: 'Vui lòng sử dụng từ ngữ văn minh, lịch sự khi trao đổi với Trợ lý AI!' };
            }
        }

        return { valid: true, cleaned };
    };

    // --- SEND MESSAGE HANDLER ---
    const sendMessage = async (textToSend) => {
        const now = Date.now();
        if (lockUntil > now) {
            const mins = Math.ceil((lockUntil - now) / 60000);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `TÀI KHOẢN / THIẾT BỊ TẠM KHÓA: Bạn đang bị tạm khóa gửi tin nhắn trong ${mins} phút do gửi lặp lại 1 nội dung 3 lần liên tiếp!`
            }]);
            return;
        }

        const filterResult = sanitizeAndFilterInput(textToSend);
        if (!filterResult.valid) {
            setMessages(prev => [...prev, { role: 'ai', content: filterResult.message }]);
            return;
        }

        const userMsg = filterResult.cleaned;

        // Anti-spam check: 3 consecutive identical messages -> Block 10 mins
        const normalizedMsg = userMsg.toLowerCase().trim();
        let newCount = 1;
        if (normalizedMsg === lastMsg) {
            newCount = repeatCount + 1;
        } else {
            setLastMsg(normalizedMsg);
        }
        setRepeatCount(newCount);

        if (newCount >= 3) {
            const newLockUntil = Date.now() + (10 * 60 * 1000); // 10 minutes lock
            applyLock(newLockUntil);

            setMessages(prev => [
                ...prev,
                { role: 'user', content: userMsg },
                { role: 'ai', content: 'HỆ THỐNG CẢNH BÁO SPAM: Bạn đã gửi trùng lặp 1 nội dung 3 lần liên tiếp! Thiết bị/Tài khoản của bạn đã bị tạm khóa gửi tin nhắn trong 10 phút. Vui lòng thử lại sau.' }
            ]);
            setInput('');
            return;
        }

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const response = await api.post('/api/chatbot/ask', { message: userMsg, clientToken });

            if (response.data?.isBlocked) {
                const bLockUntil = response.data?.lockUntil || (Date.now() + (10 * 60 * 1000));
                applyLock(bLockUntil);
            }

            setMessages(prev => [...prev, { role: 'ai', content: response.data?.reply || 'Xin lỗi, không có phản hồi.' }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'ai', content: 'Dạ, hiện tại em đang bận một chút, bạn thử lại sau nhé!' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || loading || remainingMinutes > 0) return;
        sendMessage(input);
    };

    const handleChipClick = (questionText) => {
        if (loading || remainingMinutes > 0) return;
        sendMessage(questionText);
    };

    const renderMessage = (msg) => {
        const parsePrice = (priceStr) => {
            if (!priceStr) return 0;
            let cleaned = String(priceStr).replace(/\s+/g, '').toLowerCase();
            cleaned = cleaned.replace(/đ|vnd|vnđ|đồng|dong/g, '');
            cleaned = cleaned.replace(/\.0000$|\.00$|\.0$/, '');
            cleaned = cleaned.replace(/[\.,]/g, '');
            const num = Number(cleaned);
            return isNaN(num) ? 0 : num;
        };

        const getImageUrl = (url) => {
            if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
                return 'https://ui-avatars.com/api/?name=SP&background=121212&color=00f2ff&bold=true';
            }
            let clean = url.trim();
            if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) {
                return clean;
            }
            if (!clean.startsWith('/')) {
                clean = '/' + clean;
            }
            if (!clean.startsWith('/images/') && !clean.startsWith('/uploads/')) {
                clean = '/images' + clean;
            }
            return `http://localhost:8080${clean}`;
        };

        if (msg.content && msg.content.includes('[PRODUCT:')) {
            const parts = msg.content.split(/(\[PRODUCT:[^\]]+\])/g);
            return (
                <div className="ai-content-wrapper">
                    {parts.map((part, i) => {
                        if (part.startsWith('[PRODUCT:')) {
                            const data = part.replace('[PRODUCT:', '').replace(']', '').split('|');
                            const [id, name, price, image] = data;
                            return (
                                <div key={i} className="ai-product-card" onClick={() => window.location.href = `/details?id=${id}`}>
                                    <div className="ai-card-img-wrapper">
                                        <img 
                                            src={getImageUrl(image)} 
                                            alt={name} 
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://ui-avatars.com/api/?name=SP&background=121212&color=00f2ff&bold=true';
                                            }}
                                        />
                                    </div>
                                    <div className="product-info">
                                        <h6 title={name}>{name}</h6>
                                        <p className="product-price">{parsePrice(price).toLocaleString('vi-VN')} ₫</p>
                                        <button type="button" className="btn-view-detail" onClick={(e) => { e.stopPropagation(); window.location.href = `/details?id=${id}`; }}>
                                            <i className="bi bi-eye-fill me-1"></i> Xem chi tiết
                                        </button>
                                    </div>
                                </div>
                            );
                        }
                        return part.trim() ? <div key={i} className="ai-text-part">{part}</div> : null;
                    })}
                </div>
            );
        }

        // Render warnings with Bootstrap icons cleanly
        if (msg.content && (msg.content.startsWith('TÀI KHOẢN') || msg.content.startsWith('HỆ THỐNG CẢNH BÁO SPAM'))) {
            return (
                <span>
                    <i className="bi bi-shield-lock-fill text-danger me-1"></i>
                    {msg.content}
                </span>
            );
        }

        if (msg.content && msg.content.startsWith('Vui lòng sử dụng từ ngữ')) {
            return (
                <span>
                    <i className="bi bi-exclamation-triangle-fill text-warning me-1"></i>
                    {msg.content}
                </span>
            );
        }

        return <span>{msg.content}</span>;
    };

    const location = useLocation();
    const isHiddenPath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/shipper');

    if (isHiddenPath) {
        return null;
    }

    const isLocked = remainingMinutes > 0;

    return (
        <div className={`chatbox-container ${isOpen ? 'open' : ''}`}>
            {!isOpen && (
                <button className="chatbox-toggle" onClick={() => setIsOpen(true)}>
                    <i className="bi bi-chat-dots-fill"></i>
                    <span className="pulse"></span>
                </button>
            )}

            {isOpen && (
                <div className="chatbox-window">
                    <div className="chatbox-header">
                        <div className="ai-info">
                            <div className="ai-avatar">
                                <i className="bi bi-robot"></i>
                            </div>
                            <div>
                                <h5>ShoeStore Assistant</h5>
                                <span><i className="bi bi-circle-fill"></i> Online</span>
                            </div>
                        </div>
                        <button className="close-btn" onClick={() => setIsOpen(false)}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <div className="chatbox-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message ${msg.role}`}>
                                <div className="message-content">
                                    {renderMessage(msg)}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="message ai">
                                <div className="message-content typing">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* SUGGESTED QUESTIONS CHIPS (100% BOOTSTRAP ICONS ONLY) */}
                    <div className="chatbox-suggestions-wrapper">
                        <div className="chatbox-suggestions-header">
                            <i className="bi bi-lightbulb-fill" style={{ color: '#e50914' }}></i> Gợi ý câu hỏi
                        </div>
                        <div className="chatbox-suggestions-chips">
                            {SUGGESTED_QUESTIONS.map((q, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className="suggestion-chip"
                                    disabled={loading || isLocked}
                                    onClick={() => handleChipClick(q.text)}
                                >
                                    <i className={`bi ${q.icon}`}></i> {q.text}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* BLOCKED ANTI-SPAM BANNER (BOOTSTRAP ICON ONLY) */}
                    {isLocked && (
                        <div className="chatbox-blocked-banner">
                            <i className="bi bi-shield-lock-fill" style={{ fontSize: '16px', flexShrink: 0 }}></i>
                            <div>Tài khoản/Thiết bị bị tạm khóa gửi tin nhắn trong <strong>{remainingMinutes} phút</strong> do gửi lặp lại 1 nội dung 3 lần liên tiếp.</div>
                        </div>
                    )}

                    {/* CHAT INPUT FORM */}
                    <form className="chatbox-input" onSubmit={handleFormSubmit}>
                        <input
                            type="text"
                            placeholder={isLocked ? `Đang khóa (${remainingMinutes} phút)...` : "Nhập câu hỏi của bạn..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading || isLocked}
                        />
                        <button type="submit" disabled={loading || isLocked || !input.trim()}>
                            <i className="bi bi-send-fill"></i>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chatbox;
