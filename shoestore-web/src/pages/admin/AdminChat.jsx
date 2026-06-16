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
                        background: #050505;
                        border-top: 1px solid rgba(255, 255, 255, 0.08);
                        overflow: hidden;
                    }

                    .panel-left { border-right: 1px solid rgba(255, 255, 255, 0.08); background: #0a0a0a; display: flex; flex-direction: column; }
                    .panel-header { padding: 25px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
                    .panel-title { font-family: 'Oswald'; text-transform: uppercase; font-size: 18px; letter-spacing: 1px; color: #fff; margin-bottom: 15px; }

                    .chat-search-box { position: relative; width: 100%; }
                    .chat-search-box input { width: 100%; background: #050505; border: 1px solid #333; border-radius: 4px; padding: 12px 15px 12px 45px; color: #fff; font-size: 13px; outline: none; transition: 0.3s; }
                    .chat-search-box i { position: absolute; left: 15px; top: 14px; color: #666; }
                    .chat-search-box input:focus { border-color: #00f2ff; box-shadow: 0 0 10px rgba(0, 242, 255, 0.2); }

                    .conv-list { flex: 1; overflow-y: auto; padding: 10px; }
                    .conv-category { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #555; letter-spacing: 2px; padding: 15px 10px 10px; display: flex; align-items: center; gap: 8px; }
                    .conv-category .dot { width: 6px; height: 6px; border-radius: 50%; }

                    .conv-item { 
                        padding: 15px; border-radius: 12px; margin-bottom: 5px; cursor: pointer; transition: 0.3s; 
                        display: flex; gap: 12px; border: 1px solid transparent; position: relative;
                    }
                    .conv-item:hover { background: rgba(255, 255, 255, 0.03); }
                    .conv-item.active { background: rgba(0, 242, 255, 0.05); border-color: rgba(0, 242, 255, 0.1); }
                    .conv-item.active::before { content: ''; position: absolute; left: -5px; top: 20%; height: 60%; width: 3px; background: #00f2ff; border-radius: 4px; box-shadow: 0 0 10px #00f2ff; }

                    .chat-avatar { 
                        width: 45px; height: 45px; border-radius: 50%; 
                        background: #111; color: #fff; 
                        flex-shrink: 0; display: flex; align-items: center; justify-content: center; 
                        font-family: 'Oswald'; font-weight: 700; font-size: 16px; 
                        border: 1px solid rgba(255, 255, 255, 0.08); transition: 0.3s; 
                    }
                    .conv-item:hover .chat-avatar, .conv-item.active .chat-avatar { background: #00f2ff; color: #fff; box-shadow: 0 0 15px rgba(0, 242, 255, 0.4); border-color: #00f2ff; }

                    .conv-info { flex: 1; min-width: 0; }
                    .conv-name-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
                    .conv-name { font-weight: 600; font-size: 14px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .conv-time { font-size: 10px; color: #555; font-weight: 600; }
                    .conv-msg { font-size: 12px; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .status-typing { color: #00f2ff; font-weight: 600; font-style: italic; }

                    .panel-center { display: flex; flex-direction: column; background: #080808; border-right: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; }
                    .chat-view-header { padding: 15px 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center; background: rgba(8, 8, 8, 0.8); backdrop-filter: blur(10px); }

                    .msg-container { flex: 1; padding: 30px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
                    .msg-row { display: flex; gap: 12px; max-width: 80%; }
                    .msg-row.sent { align-self: flex-end; flex-direction: row-reverse; }
                    .msg-bubble { padding: 14px 20px; border-radius: 20px; font-size: 14px; line-height: 1.6; background: #1a1a1a; border: 1px solid rgba(255, 255, 255, 0.08); color: #fff; }
                    .msg-row.sent .msg-bubble { background: #e50914; color: #fff; border: none; border-bottom-right-radius: 4px; box-shadow: 0 8px 25px rgba(229, 9, 20, 0.2); }
                    .msg-row.received .msg-bubble { border-bottom-left-radius: 4px; }
                    .msg-meta { font-size: 10px; color: #555; font-weight: 700; margin-top: 6px; display: block; }
                    .msg-row.sent .msg-meta { text-align: right; }

                    .chat-tools { padding: 25px 30px; background: #0a0a0a; border-top: 1px solid rgba(255, 255, 255, 0.08); }
                    .input-wrapper { background: #141414; border: 1px solid #222; border-radius: 15px; padding: 8px; display: flex; align-items: center; gap: 10px; }
                    .input-wrapper textarea { flex: 1; background: transparent; border: none; outline: none; color: #fff; padding: 10px; font-size: 14px; resize: none; }
                    .btn-send-chat { width: 42px; height: 42px; border-radius: 10px; border: none; background: #e50914; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(229, 9, 20, 0.3); }

                    .panel-right { background: #0a0a0a; padding: 30px 20px; display: flex; flex-direction: column; gap: 30px; overflow-y: auto; }
                    .profile-avatar-large { 
                        width: 100px; height: 100px; border-radius: 50%; overflow: hidden; 
                        margin: 0 auto 20px; border: 4px solid #1a1a1a; box-shadow: 0 15px 35px rgba(0,0,0,0.5); 
                        background: #00f2ff; display: flex; align-items: center; justify-content: center; 
                        font-family: 'Oswald'; font-size: 36px; font-weight: 700; color: #fff; 
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
                            <div className="chat-avatar" style={{ width: 40, height: 40, background: '#00f2ff', color: '#000' }}>
                                <span>{activeConv.initials}</span>
                            </div>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>{activeConv.name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%' }}></span>
                                    <span style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>Khách hàng từ {activeConv.location.split(',')[0]} • {activeConv.idText}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="msg-container" ref={chatBoxRef}>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`msg-row ${msg.type}`}>
                                <div className="msg-bubble">
                                    {msg.content}
                                    <span className="msg-meta">{msg.time} {msg.type === 'sent' && <i className="bi bi-check2-all" style={{ color: '#00f2ff' }}></i>}</span>
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
                        <h2 style={{ fontFamily: 'Oswald', fontSize: 24, textTransform: 'uppercase', margin: 0 }}>{activeConv.name}</h2>
                        <p style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', margin: '5px 0' }}>
                            <i className="bi bi-geo-alt-fill"></i> {activeConv.location}
                        </p>
                    </div>
                    
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 15, border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
                            <div><div style={{ color: '#00f2ff', fontFamily: 'Oswald' }}>12</div><div style={{ fontSize: 9, color: '#555' }}>Đơn hàng</div></div>
                            <div><div style={{ color: '#00f2ff', fontFamily: 'Oswald' }}>15.4M</div><div style={{ fontSize: 9, color: '#555' }}>Tổng chi</div></div>
                            <div><div style={{ color: '#facc15', fontFamily: 'Oswald' }}>VIP</div><div style={{ fontSize: 9, color: '#555' }}>Hạng</div></div>
                        </div>
                    </div>

                    <div>
                        <span style={{ fontFamily: 'Oswald', fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 15, display: 'block' }}>Đơn hàng gần nhất</span>
                        <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderLeft: '3px solid #ffd700', borderRadius: 12, padding: 15 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 13 }}>Đơn #10293</span>
                                <span style={{ color: '#00f2ff', fontSize: 10, fontWeight: 700 }}>Hoàn tất</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="bi bi-bag-fill" style={{ color: '#555' }}></i>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>Nike Air Max '90</div>
                                    <div style={{ fontSize: 10, color: '#555' }}>Size 38 • 1,200,000₫</div>
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
