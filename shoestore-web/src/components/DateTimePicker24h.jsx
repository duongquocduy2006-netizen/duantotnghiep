import React, { useState, useEffect, useRef } from 'react';

const DateTimePicker24h = ({ value, onChange, min, placeholder = "Chọn ngày & giờ...", className = "", error = false, title = "CHỌN THỜI GIAN (24H)" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const hoursColRef = useRef(null);
    const minutesColRef = useRef(null);

    // Get minimum allowed date (YYYY-MM-DD)
    const getMinDateOnly = () => {
        if (!min) {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return min.includes('T') ? min.split('T')[0] : min;
    };

    // Get minimum allowed time parts if date matches minDate
    const getMinTimeParts = () => {
        if (!min || !min.includes('T')) {
            const now = new Date();
            return {
                minHour: String(now.getHours()).padStart(2, '0'),
                minMinute: String(now.getMinutes()).padStart(2, '0')
            };
        }
        const tPart = min.split('T')[1] || '00:00';
        const [h, m] = tPart.split(':');
        return { minHour: h || '00', minMinute: m || '00' };
    };

    const minDateOnly = getMinDateOnly();
    const { minHour, minMinute } = getMinTimeParts();

    // Check if a YYYY-MM-DD date is in the past
    const isPastDate = (dateStr) => {
        if (!dateStr) return true;
        return dateStr < minDateOnly;
    };

    // Parse initial value (format YYYY-MM-DDTHH:mm)
    const parseValue = (valStr) => {
        const now = new Date();
        const defaultDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const defaultHour = String(now.getHours()).padStart(2, '0');
        const defaultMin = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');

        if (!valStr || !valStr.includes('T')) {
            const finalDate = defaultDateStr < minDateOnly ? minDateOnly : defaultDateStr;
            return {
                year: Number(finalDate.split('-')[0]),
                month: Number(finalDate.split('-')[1]) - 1,
                dateStr: finalDate,
                hour: defaultHour,
                minute: defaultMin
            };
        }
        const [dPart, tPart] = valStr.split('T');
        const [y, m] = dPart.split('-').map(Number);
        const [h, minPart] = (tPart || '00:00').split(':');

        const validDateStr = isPastDate(dPart) ? minDateOnly : dPart;
        const [valY, valM] = validDateStr.split('-').map(Number);

        return {
            year: valY || new Date().getFullYear(),
            month: valM ? valM - 1 : new Date().getMonth(),
            dateStr: validDateStr,
            hour: (h || '00').padStart(2, '0'),
            minute: (minPart || '00').padStart(2, '0')
        };
    };

    const parsed = parseValue(value);
    const [viewYear, setViewYear] = useState(parsed.year);
    const [viewMonth, setViewMonth] = useState(parsed.month);
    const [tempDate, setTempDate] = useState(parsed.dateStr);
    const [tempHour, setTempHour] = useState(parsed.hour);
    const [tempMinute, setTempMinute] = useState(parsed.minute);

    // Sync state when props change or modal opens
    useEffect(() => {
        const p = parseValue(value);
        setViewYear(p.year);
        setViewMonth(p.month);
        setTempDate(p.dateStr);

        // Ensure tempHour is not in past if tempDate is minDateOnly
        let validHour = p.hour;
        if (p.dateStr === minDateOnly && p.hour < minHour) {
            validHour = minHour;
        }
        setTempHour(validHour);
        setTempMinute(p.minute);
    }, [value, isOpen, min]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                if (hoursColRef.current) {
                    const activeH = hoursColRef.current.querySelector('.dtp-time-item.active');
                    if (activeH) activeH.scrollIntoView({ block: 'center' });
                }
                if (minutesColRef.current) {
                    const activeM = minutesColRef.current.querySelector('.dtp-time-item.active');
                    if (activeM) activeM.scrollIntoView({ block: 'center' });
                }
            }, 60);
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleConfirm = () => {
        const targetDate = isPastDate(tempDate) ? minDateOnly : tempDate;
        let targetHour = tempHour;
        if (targetDate === minDateOnly && tempHour < minHour) {
            targetHour = minHour;
        }
        const combined = `${targetDate}T${targetHour}:${tempMinute}`;
        onChange(combined);
        setIsOpen(false);
    };

    // Check if can navigate to previous month
    const canGoPrevMonth = () => {
        const [minY, minM] = minDateOnly.split('-').map(Number);
        const minMonthIdx = minM - 1;
        if (viewYear < minY) return false;
        if (viewYear === minY && viewMonth <= minMonthIdx) return false;
        return true;
    };

    // Calendar month navigation
    const handlePrevMonth = () => {
        if (!canGoPrevMonth()) return;
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(v => v - 1);
        } else {
            setViewMonth(v => v - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(v => v + 1);
        } else {
            setViewMonth(v => v + 1);
        }
    };

    // Days Grid Generator
    const getDaysGrid = () => {
        const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
        const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

        let startingDay = firstDayOfMonth.getDay() - 1;
        if (startingDay === -1) startingDay = 6;

        const totalDays = lastDayOfMonth.getDate();
        const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();

        const grid = [];

        // Trailing days from previous month
        for (let i = startingDay - 1; i >= 0; i--) {
            grid.push({
                day: prevMonthLastDay - i,
                isCurrentMonth: false,
                dateStr: ''
            });
        }

        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            const mStr = String(viewMonth + 1).padStart(2, '0');
            const dStr = String(day).padStart(2, '0');
            const fullStr = `${viewYear}-${mStr}-${dStr}`;
            grid.push({
                day,
                isCurrentMonth: true,
                dateStr: fullStr
            });
        }

        // Remaining grid cells
        const remaining = (7 - (grid.length % 7)) % 7;
        for (let day = 1; day <= remaining; day++) {
            grid.push({
                day,
                isCurrentMonth: false,
                dateStr: ''
            });
        }

        return grid;
    };

    const monthsVietnamese = [
        "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
        "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ];

    // Format display string inside input box (24h format: e.g. 22/08/2026 20:00)
    const getFormattedDisplay = () => {
        if (!value || !value.includes('T')) return '';
        try {
            const [dPart, tPart] = value.split('T');
            const [y, m, d] = dPart.split('-');
            const [h, min] = tPart.split(':');
            return `${d}/${m}/${y}  ${h}:${min}`;
        } catch (e) {
            return value;
        }
    };

    // Format live preview in modal
    const getLivePreview = () => {
        if (!tempDate) return '';
        try {
            const [y, m, d] = tempDate.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const weekday = days[dateObj.getDay()];
            
            const hNum = parseInt(tempHour, 10);
            let period = 'Sáng';
            if (hNum >= 12 && hNum < 18) period = 'Chiều';
            else if (hNum >= 18) period = 'Tối';
            if (hNum === 0) period = 'Nửa đêm';
            if (hNum === 12) period = 'Trưa';

            return `${tempHour}:${tempMinute} (${period}) - ${weekday}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
        } catch (e) {
            return `${tempHour}:${tempMinute} - ${tempDate}`;
        }
    };

    const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutesList = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

    return (
        <div className="dtp-24h-container" style={{ position: 'relative', width: '100%' }}>
            {/* Modern Styled Trigger Box */}
            <div 
                className={`dtp-input-wrapper ${className}`}
                style={{ position: 'relative', cursor: 'pointer', width: '100%' }} 
                onClick={() => setIsOpen(true)}
            >
                <div 
                    className="dtp-trigger-box"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: error ? '#fff5f5' : '#ffffff',
                        border: error ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '9px 14px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        minHeight: '42px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', overflow: 'hidden' }}>
                        <i className="bi bi-clock-history" style={{ color: '#0070f3', fontSize: '15px' }}></i>
                        <span style={{ 
                            fontSize: '14px', 
                            fontWeight: getFormattedDisplay() ? '700' : '400',
                            color: getFormattedDisplay() ? '#0f172a' : '#94a3b8',
                            letterSpacing: '0.2px',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden'
                        }}>
                            {getFormattedDisplay() || placeholder}
                        </span>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #e50914 0%, #b91c1c 100%)',
                        color: '#ffffff',
                        borderRadius: '7px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 4px rgba(229, 9, 20, 0.25)',
                        marginLeft: '8px'
                    }}>
                        <i className="bi bi-calendar-event" style={{ fontSize: '13px' }}></i>
                    </div>
                </div>
            </div>

            {/* 24-Hour Floating Modal Popup */}
            {isOpen && (
                <div 
                    className="dtp-modal-backdrop"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsOpen(false);
                    }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999999,
                        background: 'rgba(15, 23, 42, 0.55)',
                        backdropFilter: 'blur(5px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                >
                    <div 
                        className="dtp-modal-card"
                        style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.35)',
                            border: '1px solid #e2e8f0',
                            width: '490px',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            animation: 'dtpFadeIn 0.2s ease-out',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                    >
                        {/* Modal Header */}
                        <div 
                            style={{
                                background: '#f8fafc',
                                padding: '16px 20px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div>
                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', fontFamily: "'Oswald', sans-serif" }}>
                                    <i className="bi bi-clock-history me-2 text-danger"></i>
                                    {title}
                                </h4>
                                <small style={{ color: '#64748b', fontSize: '12px' }}>
                                    Định dạng 24h chuẩn (00:00 - 23:59)
                                </small>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#64748b',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '6px'
                                }}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {/* Modal Body: Calendar + 24h Time Picker */}
                        <div style={{ display: 'flex', padding: '20px', gap: '20px' }}>
                            {/* LEFT: CALENDAR */}
                            <div style={{ flex: '1', minWidth: '0' }}>
                                {/* Month/Year Nav */}
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                                        {monthsVietnamese[viewMonth]}, {viewYear}
                                    </span>
                                    <div className="d-flex gap-1">
                                        <button 
                                            type="button" 
                                            disabled={!canGoPrevMonth()}
                                            className="btn btn-sm btn-outline-secondary py-0 px-2" 
                                            onClick={handlePrevMonth}
                                            style={{ borderRadius: '6px', fontSize: '13px', opacity: canGoPrevMonth() ? 1 : 0.4, cursor: canGoPrevMonth() ? 'pointer' : 'not-allowed' }}
                                        >
                                            <i className="bi bi-chevron-left"></i>
                                        </button>
                                        <button 
                                            type="button" 
                                            className="btn btn-sm btn-outline-secondary py-0 px-2" 
                                            onClick={handleNextMonth}
                                            style={{ borderRadius: '6px', fontSize: '13px' }}
                                        >
                                            <i className="bi bi-chevron-right"></i>
                                        </button>
                                    </div>
                                </div>

                                {/* Weekday Headers: T2, T3, T4, T5, T6, T7, CN */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 800, fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                                    <div>T2</div>
                                    <div>T3</div>
                                    <div>T4</div>
                                    <div>T5</div>
                                    <div>T6</div>
                                    <div>T7</div>
                                    <div style={{ color: '#ef4444' }}>CN</div>
                                </div>

                                {/* Days Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                                    {getDaysGrid().map((item, idx) => {
                                        const isPast = item.isCurrentMonth && isPastDate(item.dateStr);
                                        const isSelected = item.isCurrentMonth && !isPast && item.dateStr === tempDate;
                                        const isToday = item.isCurrentMonth && item.dateStr === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                disabled={!item.isCurrentMonth || isPast}
                                                onClick={() => {
                                                    if (item.isCurrentMonth && !isPast) {
                                                        setTempDate(item.dateStr);
                                                    }
                                                }}
                                                style={{
                                                    height: '32px',
                                                    width: '32px',
                                                    margin: 'auto',
                                                    border: isToday && !isSelected ? '2px solid #0070f3' : 'none',
                                                    borderRadius: '8px',
                                                    background: isSelected ? '#0070f3' : (isPast ? '#f8fafc' : 'transparent'),
                                                    color: isSelected ? '#ffffff' : (isPast ? '#cbd5e1' : (item.isCurrentMonth ? '#1e293b' : '#cbd5e1')),
                                                    fontWeight: isSelected || isToday ? 800 : 500,
                                                    fontSize: '13px',
                                                    cursor: item.isCurrentMonth && !isPast ? 'pointer' : 'not-allowed',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: '0.15s',
                                                    textDecoration: isPast ? 'line-through' : 'none',
                                                    opacity: isPast ? 0.45 : 1
                                                }}
                                                title={isPast ? "Không thể chọn ngày trong quá khứ" : ""}
                                            >
                                                {item.day}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Today Quick Button */}
                                <div className="mt-3 text-center">
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-light border w-100 fw-bold"
                                        style={{ fontSize: '12px', color: '#0070f3', borderRadius: '8px' }}
                                        onClick={() => {
                                            const now = new Date();
                                            const y = now.getFullYear();
                                            const m = String(now.getMonth() + 1).padStart(2, '0');
                                            const d = String(now.getDate()).padStart(2, '0');
                                            const todayStr = `${y}-${m}-${d}`;
                                            const validToday = isPastDate(todayStr) ? minDateOnly : todayStr;
                                            setViewYear(Number(validToday.split('-')[0]));
                                            setViewMonth(Number(validToday.split('-')[1]) - 1);
                                            setTempDate(validToday);
                                        }}
                                    >
                                        <i className="bi bi-calendar-check me-1"></i> Hôm nay ({new Date().getDate()}/{new Date().getMonth() + 1})
                                    </button>
                                </div>
                            </div>

                            {/* RIGHT: 24-HOUR TIME PICKER (00 to 23 & 00 to 55) */}
                            <div 
                                style={{ 
                                    width: '160px', 
                                    borderLeft: '1px solid #f1f5f9', 
                                    paddingLeft: '16px',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                {/* Active Time Display Badge */}
                                <div className="text-center mb-2 py-1 px-2 rounded-3" style={{ background: '#0070f3', color: '#fff', fontWeight: 800, fontSize: '14px' }}>
                                    {tempHour}:{tempMinute} (24h)
                                </div>

                                <div className="d-flex gap-2 flex-grow-1" style={{ height: '220px' }}>
                                    {/* Hours Column (00 to 23) */}
                                    <div 
                                        ref={hoursColRef}
                                        style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', paddingRight: '2px' }}
                                    >
                                        <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontWeight: 800, marginBottom: '4px' }}>GIỜ (24H)</div>
                                        {hoursList.map(h => {
                                            const isPastHour = tempDate === minDateOnly && h < minHour;
                                            return (
                                                <div
                                                    key={h}
                                                    className={`dtp-time-item ${tempHour === h ? 'active' : ''}`}
                                                    onClick={() => {
                                                        if (!isPastHour) setTempHour(h);
                                                    }}
                                                    style={{
                                                        padding: '5px 0',
                                                        textAlign: 'center',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        fontWeight: tempHour === h ? 800 : 500,
                                                        background: tempHour === h ? '#0070f3' : (isPastHour ? '#f8fafc' : 'transparent'),
                                                        color: tempHour === h ? '#ffffff' : (isPastHour ? '#cbd5e1' : '#334155'),
                                                        cursor: isPastHour ? 'not-allowed' : 'pointer',
                                                        marginBottom: '2px',
                                                        transition: '0.1s',
                                                        opacity: isPastHour ? 0.4 : 1,
                                                        textDecoration: isPastHour ? 'line-through' : 'none'
                                                    }}
                                                    title={isPastHour ? "Giờ đã qua trong ngày" : ""}
                                                >
                                                    {h}h
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Minutes Column (00 to 55) */}
                                    <div 
                                        ref={minutesColRef}
                                        style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', paddingLeft: '2px' }}
                                    >
                                        <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontWeight: 800, marginBottom: '4px' }}>PHÚT</div>
                                        {minutesList.map(m => (
                                            <div
                                                key={m}
                                                className={`dtp-time-item ${tempMinute === m ? 'active' : ''}`}
                                                onClick={() => setTempMinute(m)}
                                                style={{
                                                    padding: '5px 0',
                                                    textAlign: 'center',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    fontWeight: tempMinute === m ? 800 : 500,
                                                    background: tempMinute === m ? '#0070f3' : 'transparent',
                                                    color: tempMinute === m ? '#ffffff' : '#334155',
                                                    cursor: 'pointer',
                                                    marginBottom: '2px',
                                                    transition: '0.1s'
                                                }}
                                            >
                                                :{m}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div 
                            style={{
                                background: '#f8fafc',
                                padding: '14px 20px',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>
                                <i className="bi bi-calendar-check text-success me-1"></i>
                                {getLivePreview()}
                            </div>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-light border px-3 fw-bold"
                                    style={{ borderRadius: '8px', fontSize: '13px' }}
                                    onClick={() => setIsOpen(false)}
                                >
                                    HỦY BỎ
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary px-4 fw-bold"
                                    style={{ borderRadius: '8px', background: '#0070f3', borderColor: '#0070f3', fontSize: '13px' }}
                                    onClick={handleConfirm}
                                >
                                    XÁC NHẬN
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes dtpFadeIn {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
                .dtp-trigger-box:hover {
                    border-color: #0070f3 !important;
                    box-shadow: 0 4px 12px rgba(0, 112, 243, 0.15) !important;
                }
            `}</style>
        </div>
    );
};

export default DateTimePicker24h;
