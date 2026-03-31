// src/components/ui/Badge.jsx
import React from 'react';

const Badge = ({ label, bg, c, size = 10 }) => (
  <span
    style={{
      background: bg,
      color: c,
      fontSize: size,
      fontWeight: 700,
      padding: "2px 9px",
      borderRadius: 20,
      letterSpacing: "0.04em",
      whiteSpace: "nowrap",
      display: "inline-block",
    }}
  >
    {label}
  </span>
);

export default Badge;