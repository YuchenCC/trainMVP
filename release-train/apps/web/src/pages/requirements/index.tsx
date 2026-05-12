// ========== 需求池页面 ==========
// 原型阶段：需求录入 UI 变体切换（?variant=A/B/C）
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Typography, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import VariantA from '../../components/prototype/VariantA';
import VariantB from '../../components/prototype/VariantB';
import VariantC from '../../components/prototype/VariantC';
import PrototypeSwitcher from '../../components/prototype/PrototypeSwitcher';

const { Title, Paragraph } = Typography;

const RequirementsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const variant = searchParams.get('variant') || 'A';
  const [showForm, setShowForm] = React.useState(false);

  if (showForm) {
    return (
      <>
        {variant === 'A' && <VariantA />}
        {variant === 'B' && <VariantB />}
        {variant === 'C' && <VariantC />}
        <PrototypeSwitcher />
      </>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>需求池</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
          新增需求
        </Button>
      </div>
      <Paragraph type="secondary">
        需求列表功能开发中... 点击「新增需求」查看录入表单原型
      </Paragraph>
      <Paragraph type="secondary" style={{ fontSize: 12 }}>
        💡 原型提示：点击新增后，用底部切换栏或键盘 ← → 切换 A/B/C 三种 UI 变体
      </Paragraph>
      <PrototypeSwitcher />
    </div>
  );
};

export default RequirementsPage;
