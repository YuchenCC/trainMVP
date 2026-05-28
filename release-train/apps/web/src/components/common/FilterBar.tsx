// ========== 筛选工具栏 ==========
// 统一列表页和日历页的筛选控件布局。
import React from 'react';

interface FilterBarProps {
  fields: React.ReactNode;
  actions?: React.ReactNode;
}

const FilterBar: React.FC<FilterBarProps> = ({ fields, actions }) => (
  <div className="rt-filter-bar">
    <div className="rt-filter-fields">{fields}</div>
    {actions && <div className="rt-filter-actions">{actions}</div>}
  </div>
);

export default FilterBar;
