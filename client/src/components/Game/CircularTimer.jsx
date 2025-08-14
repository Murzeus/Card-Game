// CircularTimer.jsx
import React from 'react';

export function CircularTimer({ timeLeft, totalTime }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;

  const progress = Math.max(0, timeLeft) / totalTime;
  const offset = circumference * (1 - progress);

  // Change color based on remaining time
  const strokeColor = timeLeft <= 5 ? '#ff4d4d' : '#4caf50';

  return (
    <svg
      width="80"
      height="80"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Background circle */}
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke="#ddd"
        strokeWidth="6"
      />
      {/* Progress circle */}
      <circle
        cx="40"
        cy="40"
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease'
        }}
      />
      {/* Text in the middle */}
      <text
        x="50%"
        y="50%"
        dy=".3em"
        textAnchor="middle"
        fontSize="20"
        fill="#333"
        transform="rotate(90, 40, 40)"
      >
        {timeLeft}
      </text>
    </svg>
  );
}
