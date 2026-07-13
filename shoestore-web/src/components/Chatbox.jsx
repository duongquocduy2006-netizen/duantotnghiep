import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import './Chatbox.css';

const Chatbox = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Xin chào! Tôi là trợ lý ảo của ShoeStore. Tôi có thể giúp gì cho bạn?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const response = await api.post('/api/chatbot/ask', { message: userMsg });
            setMessages(prev => [...prev, { role: 'ai', content: response.data.reply }]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'ai', content: 'Dạ, hiện tại em đang bận một chút, bạn thử lại sau nhé!' }]);
        } finally {
            setLoading(false);
        }
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

        // Simple logic to parse [PRODUCT:id|name|price|image]
        if (msg.content.includes('[PRODUCT:')) {
            const parts = msg.content.split(/(\[PRODUCT:[^\]]+\])/g);
            return parts.map((part, i) => {
                if (part.startsWith('[PRODUCT:')) {
                    const data = part.replace('[PRODUCT:', '').replace(']', '').split('|');
                    const [id, name, price, image] = data;
                    return (
                        <div key={i} className="ai-product-card">
                            <img src={`http://localhost:8080/uploads/${image}`} alt={name} />
                            <div className="product-info">
                                <h6>{name}</h6>
                                <p>{parsePrice(price).toLocaleString('vi-VN')}₫</p>
                                <button onClick={() => window.location.href = `/details?id=${id}`}>Xem chi tiết</button>
                            </div>
                        </div>
                    );
                }
                return <span key={i}>{part}</span>;
            });
        }
        return <span>{msg.content}</span>;
    };

    const location = useLocation();
    const isHiddenPath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/shipper');

    if (isHiddenPath) {
        return null;
    }

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
                            <div className="ai-avatar">AI</div>
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

                    <form className="chatbox-input" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            placeholder="Nhập câu hỏi của bạn..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button type="submit" disabled={loading}>
                            <i className="bi bi-send-fill"></i>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chatbox;
