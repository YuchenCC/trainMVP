// ========== 页面标题区 ==========
// 统一承载页面标题、说明、摘要信息和右侧操作按钮。
import React from 'react';

interface AppPageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}

const AppPageHeader: React.FC<AppPageHeaderProps> = ({ title, description, meta, actions }) => (
  <div className="rt-page-header">
    <div className="rt-page-header-main">
      <h1 className="rt-page-title">{title}</h1>
      {description && <div className="rt-page-description">{description}</div>}
      {meta && <div className="rt-page-meta">{meta}</div>}
    </div>
    {actions && <div className="rt-page-actions">{actions}</div>}
  </div>
);

export default AppPageHeader;
