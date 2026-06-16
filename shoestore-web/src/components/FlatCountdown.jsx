import React from 'react';
import './flashSaleFlat.css';

const FlatCountdown = ({ timeLeft }) => (
  <div className="flat-countdown">
    <div className="time-block"><span>{timeLeft.days}</span><small>Days</small></div>
    <div className="time-block"><span>{timeLeft.hours}</span><small>Hours</small></div>
    <div className="time-block"><span>{timeLeft.minutes}</span><small>Min</small></div>
    <div className="time-block"><span>{timeLeft.seconds}</span><small>Sec</small></div>
  </div>
);

export default FlatCountdown;
