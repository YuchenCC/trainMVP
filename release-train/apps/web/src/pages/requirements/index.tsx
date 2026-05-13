// ========== 需求池页面 ==========
// 需求池首页：显示需求列表入口 + 新增需求按钮
// 点击「新增需求」后切换为 RequirementForm 组件（创建模式）
// 文件名：pages/requirements/index.tsx
import React, { useState } from 'react';
import { Typography, Button } from 'antd';    // Ant Design 组件
import { PlusOutlined } from '@ant-design/icons'; // + 图标
import RequirementForm from '../../components/requirements/RequirementForm'; // 需求表单组件

const { Title, Paragraph } = Typography;        // 排版子组件

/**
 * 需求池页面组件
 * 
 * 两种状态：
 * - showForm = false → 显示列表占位 + 新增按钮
 * - showForm = true  → 显示需求表单（VariantC 双栏布局）
 */
const RequirementsPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false); // 是否显示表单

  // 表单模式：显示 RequirementForm
  if (showForm) {
    return (
      <RequirementForm
        mode="create"                               // 创建模式
        onCancel={() => setShowForm(false)}         // 取消 → 返回列表
        onSuccess={() => setShowForm(false)}        // 成功 → 返回列表
      />
    );
  }

  // 列表模式：显示占位区 + 新增按钮
  return (
    <div>
      {/* 标题栏：需求池 + 新增需求按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>需求池</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowForm(true)}         // 点击切换到表单模式
        >
          新增需求
        </Button>
      </div>
      {/* 需求列表占位（后续 US1.4 实现） */}
      <Paragraph type="secondary">
        需求列表功能开发中... 点击「新增需求」创建新需求
      </Paragraph>
    </div>
  );
};

export default RequirementsPage;
