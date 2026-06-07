
// ========== 智能纳版建议组件 ==========
import React from 'react';
import { Button } from 'antd';
import { RocketOutlined } from '@ant-design/icons';

interface SmartOnboardSuggestionProps {
  onClick: () => void;
  loading?: boolean;
}

const SmartOnboardSuggestion: React.FC<SmartOnboardSuggestionProps> = ({
  onClick,
  loading,
}) => {
  return (
    <Button
      id="ai-smart-onboard-button"
      type="primary"
      icon={<RocketOutlined />}
      onClick={onClick}
      loading={loading}
    >
      AI 智能纳版
    </Button>
  );
};

export default SmartOnboardSuggestion;
