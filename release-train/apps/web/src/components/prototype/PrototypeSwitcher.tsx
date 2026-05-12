// ========== 需求录入原型 — 变体切换器 ==========
// 浮动底栏，通过 URL ?variant= 切换 A/B/C 三种 UI 变体
// 仅开发环境显示，生产构建自动隐藏
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

// 变体定义：key + 描述性名称
const VARIANTS = [
  { key: 'A', name: '经典表单' },
  { key: 'B', name: '分步向导' },
  { key: 'C', name: '双栏布局' },
] as const;

const PrototypeSwitcher: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const current = searchParams.get('variant') || 'A';

  const cycle = (direction: 1 | -1) => {
    const idx = VARIANTS.findIndex((v) => v.key === current);
    const next = VARIANTS[(idx + direction + VARIANTS.length) % VARIANTS.length];
    const params = new URLSearchParams(searchParams);
    params.set('variant', next.key);
    navigate({ search: params.toString() }, { replace: true });
  };

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).contentEditable === 'true') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); cycle(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); cycle(1); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [current, searchParams]);

  if (import.meta.env.PROD) return null;

  const variantInfo = VARIANTS.find((v) => v.key === current) || VARIANTS[0];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 20px',
        background: '#1a1a2e',
        color: '#fff',
        borderRadius: 24,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        fontSize: 14,
        userSelect: 'none',
      }}
    >
      <button
        onClick={() => cycle(-1)}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff',
          borderRadius: '50%',
          width: 28,
          height: 28,
          cursor: 'pointer',
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ←
      </button>
      <span style={{ fontWeight: 600 }}>
        {variantInfo.key} — {variantInfo.name}
      </span>
      <button
        onClick={() => cycle(1)}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.3)',
          color: '#fff',
          borderRadius: '50%',
          width: 28,
          height: 28,
          cursor: 'pointer',
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        →
      </button>
    </div>
  );
};

export default PrototypeSwitcher;
export { VARIANTS };
