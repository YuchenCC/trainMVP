// ========== 指标卡片 ==========
// 用于仪表盘状态统计，白底配状态色条，避免大面积彩色背景。
import React from 'react';

interface MetricCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  caption?: React.ReactNode;
  color?: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, caption, color = '#2563eb', onClick }) => (
  <div
    className="rt-metric-card"
    style={{ '--metric-color': color } as React.CSSProperties}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={(event) => {
      if (!onClick) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    }}
  >
    <div className="rt-metric-label">{label}</div>
    <div className="rt-metric-value">{value}</div>
    {caption && <div className="rt-metric-caption">{caption}</div>}
  </div>
);

export default MetricCard;
