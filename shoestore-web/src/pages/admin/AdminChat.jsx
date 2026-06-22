import React, { useState, useEffect, useRef } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Link } from "react-router-dom";

const AdminChat = () => {
    const [activeConv, setActiveConv] = useState({
        id: "TN",
        name: "Lý Thị Thúy Nga",
        location: "Hà Nội, Việt Nam",
        idText: "ID: 8291",
        initials: "TN"
    });

    const [msgInput, setMsgInput] = useState("");
    const [messages, setMessages] = useState([
        { type: 'received', content: "Chào shop, đôi Nike Air Max size 38 này còn hàng không shop?", time: "10:42 AM" },
        { type: 'sent', content: "Chào bạn Nga ạ! Đôi này bên mình hiện đang còn 2 đôi cuối cùng tại kho. Bạn có muốn shop giữ hàng cho mình không?", time: "10:45 AM" },
    ]);

    const chatBoxRef = useRef(null);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMsg = () => {
        if (msgInput.trim() !== "") {
            const now = new Date();
            const timeStr = now.getHours() + ":" + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes() + " " + (now.getHours() >= 12 ? 'PM' : 'AM');
            setMessages([...messages, { type: 'sent', content: msgInput, time: timeStr }]);
            setMsgInput("");
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMsg();
        }
    };

    const conversations = [
        { category: 'Đang chờ', count: 2, items: [
            { id: 'LM', name: 'Lý Nguyễn Đom Đóm', initials: 'LM', time: '2p', msg: 'Shop ơi cho mình hỏi size 42...', location: 'Hải Phòng, Việt Nam', idText: 'ID: 7721' }
        ]},
        { category: 'Đang hoạt động', count: 12, items: [
            { id: 'TN', name: 'Lý Thị Thúy Nga', initials: 'TN', time: '15p', msg: 'Đang nhập...', typing: true, location: 'Hà Nội, Việt Nam', idText: 'ID: 8291' },
            { id: 'HK', name: 'Hoàng Kim', initials: 'HK', time: '1h', msg: 'Cảm ơn shop nhiều!', location: 'Đà Nẵng, Việt Nam', idText: 'ID: 9912' }
        ]}
    ];

    return (
        <AdminLayout>
            <div className="chat-hub-wrapper">
                <style>{`
                    .chat-hub-wrapper {
                        display: grid;
                        grid-template-columns: 340px 1fr 320px;
                        height: calc(100vh - 80px); /* Subtract header height */
                        background: #f4f5f7;
                        border-top: 1px solid rgba(0, 0, 0, 0.05);
                        overflow: hidden;
                    }

                    .panel-left { border-right: 1px solid rgba(0, 0, 0, 0.08); background: #ffffff; display: flex; flex-direction: column; }
                    .panel-header { padding: 25px 20px; border-bottom: 1px solid rgba(0, 0, 0, 0.08); }
                    .panel-title { font-family: 'Oswald'; text-transform: uppercase; font-size: 18px; letter-spacing: 1px; color: #000000; margin-bottom: 15px; }

                    .chat-search-box { position: relative; width: 100%; }
                    .chat-search-box input { width: 100%; background: #f4f5f7; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 8px; padding: 12px 15px 12px 45px; color: #000000; font-size: 13px; outline: none; transition: 0.3s; }
                    .chat-search-box i { position: absolute; left: 15px; top: 14px; color: #8a8a93; }
                    .chat-search-box input:focus { border-color: var(--accent-red); background: #ffffff; box-shadow: 0 0 0 3px rgba(204, 0, 0, 0.1); }

                    .conv-list { flex: 1; overflow-y: auto; padding: 10px; }
                    .conv-category { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #8a8a93; letter-spacing: 2px; padding: 15px 10px 10px; display: flex; align-items: center; gap: 8px; }
                    .conv-category .dot { width: 6px; height: 6px; border-radius: 50%; }

                    .conv-item { 
                        padding: 15px; border-radius: 12px; margin-bottom: 5px; cursor: pointer; transition: 0.3s; 
                        display: flex; gap: 12px; border: 1px solid transparent; position: relative;
                    }
                    .conv-item:hover { background: #f4f5f7; }
                    .conv-item.active { background: rgba(204, 0, 0, 0.05); border-color: rgba(204, 0, 0, 0.08); }
                    .conv-item.active::before { content: ''; position: absolute; left: -2px; top: 20%; height: 60%; width: 4px; background: var(--accent-red); border-radius: 4px; }

                    .chat-avatar { 
                        width: 45px; height: 45px; border-radius: 50%; 
                        background: #e4e4e7; color: #000000; 
                        flex-shrink: 0; display: flex; align-items: center; justify-content: center; 
                        font-family: 'Oswald'; font-weight: 700; font-size: 16px; 
                        border: 1px solid rgba(0, 0, 0, 0.05); transition: 0.3s; 
                    }
                    .conv-item:hover .chat-avatar, .conv-item.active .chat-avatar { background: var(--accent-red) !important; color: #ffffff !important; box-shadow: 0 4px 10px rgba(204, 0, 0, 0.2); border-color: var(--accent-red) !important; }

                    .conv-info { flex: 1; min-width: 0; }
                    .conv-name-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
                    .conv-name { font-weight: 600; font-size: 14px; color: #000000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .conv-time { font-size: 10px; color: #8a8a93; font-weight: 600; }
                    .conv-msg { font-size: 12px; color: #555559; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .status-typing { color: var(--accent-red); font-weight: 600; font-style: italic; }

                    .panel-center { display: flex; flex-direction: column; background: #ffffff; border-right: 1px solid rgba(0, 0, 0, 0.08); overflow: hidden; }
                    .chat-view-header { padding: 15px 30px; border-bottom: 1px solid rgba(0, 0, 0, 0.08); display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); }

                    .msg-container { flex: 1; padding: 30px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
                    .msg-row { display: flex; gap: 12px; max-width: 80%; }
                    .msg-row.sent { align-self: flex-end; flex-direction: row-reverse; }
                    .msg-bubble { padding: 14px 20px; border-radius: 20px; font-size: 14px; line-height: 1.6; background: #f4f5f7; border: 1px solid rgba(0, 0, 0, 0.05); color: #000000; }
                    .msg-row.sent .msg-bubble { background: var(--accent-red); color: #ffffff; border: none; border-bottom-right-radius: 4px; box-shadow: 0 8px 25px rgba(204, 0, 0, 0.15); }
                    .msg-row.received .msg-bubble { border-bottom-left-radius: 4px; }
                    .msg-meta { font-size: 10px; color: #8a8a93; font-weight: 700; margin-top: 6px; display: block; }
                    .msg-row.sent .msg-meta { text-align: right; color: rgba(255, 255, 255, 0.7); }

                    .chat-tools { padding: 25px 30px; background: #ffffff; border-top: 1px solid rgba(0, 0, 0, 0.08); }
                    .input-wrapper { background: #f4f5f7; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 15px; padding: 8px; display: flex; align-items: center; gap: 10px; }
                    .input-wrapper textarea { flex: 1; background: transparent; border: none; outline: none; color: #000000; padding: 10px; font-size: 14px; resize: none; }
                    .btn-send-chat { width: 42px; height: 42px; border-radius: 10px; border: none; background: var(--accent-red); color: #ffffff; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(204, 0, 0, 0.2); }

                    .panel-right { background: #ffffff; padding: 30px 20px; display: flex; flex-direction: column; gap: 30px; overflow-y: auto; }
                    .profile-avatar-large { 
                        width: 100px; height: 100px; border-radius: 50%; overflow: hidden; 
                        margin: 0 auto 20px; border: 4px solid #f4f5f7; box-shadow: 0 10px 25px rgba(0,0,0,0.05); 
                        background: var(--accent-red); display: flex; align-items: center; justify-content: center; 
                        font-family: 'Oswald'; font-size: 36px; font-weight: 700; color: #ffffff; 
                    }

                    /* Window Control Buttons */
                    .chat-window-controls {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    }
                    .control-btn {
                        background: transparent;
                        border: none;
                        outline: none;
                        color: #8a8a93;
                        font-size: 14px;
                        cursor: pointer;
                        width: 32px;
                        height: 32px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                    }
                    .control-btn:hover {
                        background: #f4f5f7;
                        color: #000000;
                    }
                    .control-btn.close-btn:hover {
                        background: var(--accent-red);
                        color: #ffffff;
                    }
                `}</style>
                
                {/* LEFT CONVERSATIONS */}
                <section className="panel-left">
                    <div className="panel-header">
                        <h2 className="panel-title">Hội thoại</h2>
                        <div className="chat-search-box">
                            <i className="bi bi-search"></i>
                            <input type="text" placeholder="Tìm khách hàng..." />
                        </div>
                    </div>
                    
                    <div className="conv-list">
                        {conversations.map((cat, idx) => (
                            <React.Fragment key={idx}>
                                <div className="conv-category">
                                    <span className="dot" style={{ background: cat.category === 'Đang chờ' ? '#e50914' : '#555' }}></span> 
                                    {cat.category} • {cat.count}
                                </div>
                                {cat.items.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className={`conv-item ${activeConv.id === item.id ? 'active' : ''}`}
                                        onClick={() => setActiveConv(item)}
                                    >
                                        <div className="chat-avatar">
                                            <span>{item.initials}</span>
                                        </div>
                                        <div className="conv-info">
                                            <div className="conv-name-row">
                                                <span className="conv-name">{item.name}</span>
                                                <span className="conv-time">{item.time}</span>
                                            </div>
                                            <div className={`conv-msg ${item.typing ? 'status-typing' : ''}`}>
                                                {item.typing ? 'Đang nhập...' : item.msg}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </section>

                {/* CENTER CHAT WINDOW */}
                <section className="panel-center">
                    <div className="chat-view-header">
                        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                            <div className="chat-avatar" style={{ width: 40, height: 40, background: 'var(--accent-red)', color: '#fff' }}>
                                <span>{activeConv.initials}</span>
                            </div>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#000' }}>{activeConv.name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%' }}></span>
                                    <span style={{ fontSize: 11, color: '#8a8a93', fontWeight: 600 }}>Khách hàng từ {activeConv.location.split(',')[0]} • {activeConv.idText}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* WINDOW CONTROL BUTTONS */}
                        <div className="chat-window-controls">
                            <button className="control-btn" title="Thu nhỏ">
                                <i className="bi bi-dash-lg"></i>
                            </button>
                            <button className="control-btn" title="Phóng to">
                                <i className="bi bi-window-stack"></i>
                            </button>
                            <button className="control-btn close-btn" title="Đóng">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                    </div>

                    <div className="msg-container" ref={chatBoxRef}>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`msg-row ${msg.type}`}>
                                <div className="msg-bubble">
                                    {msg.content}
                                    <span className="msg-meta">{msg.time} {msg.type === 'sent' && <i className="bi bi-check2-all" style={{ color: '#ffffff' }}></i>}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="chat-tools">
                        <div className="input-wrapper">
                            <textarea 
                                value={msgInput} 
                                onChange={(e) => setMsgInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Nhập tin nhắn..." 
                                rows="1"
                            ></textarea>
                            <button className="btn-send-chat" onClick={handleSendMsg}>
                                <i className="bi bi-send-fill"></i>
                            </button>
                        </div>
                    </div>
                </section>

                {/* RIGHT PROFILE */}
                <section className="panel-right">
                    <div style={{ textAlign: 'center' }}>
                        <div className="profile-avatar-large">
                            <span>{activeConv.initials}</span>
                        </div>
                        <h2 style={{ fontFamily: 'Oswald', fontSize: 24, textTransform: 'uppercase', margin: 0, color: '#000000' }}>{activeConv.name}</h2>
                        <p style={{ fontSize: 11, color: '#8a8a93', textTransform: 'uppercase', margin: '5px 0' }}>
                            <i className="bi bi-geo-alt-fill"></i> {activeConv.location}
                        </p>
                    </div>
                    
                    <div style={{ background: '#f4f5f7', padding: 15, borderRadius: 15, border: '1px solid rgba(0, 0, 0, 0.05)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
                            <div><div style={{ color: 'var(--accent-red)', fontFamily: 'Oswald', fontWeight: 'bold' }}>12</div><div style={{ fontSize: 9, color: '#8a8a93' }}>Đơn hàng</div></div>
                            <div><div style={{ color: 'var(--accent-red)', fontFamily: 'Oswald', fontWeight: 'bold' }}>15.4M</div><div style={{ fontSize: 9, color: '#8a8a93' }}>Tổng chi</div></div>
                            <div><div style={{ color: '#facc15', fontFamily: 'Oswald', fontWeight: 'bold' }}>VIP</div><div style={{ fontSize: 9, color: '#8a8a93' }}>Hạng</div></div>
                        </div>
                    </div>

                    <div>
                        <span style={{ fontFamily: 'Oswald', fontSize: 11, color: '#8a8a93', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 15, display: 'block' }}>Đơn hàng gần nhất</span>
                        <div style={{ background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.08)', borderLeft: '3px solid var(--accent-red)', borderRadius: 12, padding: 15 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: '#000000' }}>Đơn #10293</span>
                                <span style={{ color: '#22c55e', fontSize: 10, fontWeight: 700 }}>Hoàn tất</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <div style={{ width: 40, height: 40, background: '#f4f5f7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="bi bi-bag-fill" style={{ color: '#8a8a93' }}></i>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#000000' }}>Nike Air Max '90</div>
                                    <div style={{ fontSize: 10, color: '#8a8a93' }}>Size 38 • 1,200,000₫</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
};

export default AdminChat;
