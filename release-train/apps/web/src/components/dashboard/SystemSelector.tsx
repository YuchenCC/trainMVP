import React, { useState, useEffect } from 'react';
import { Select, message } from 'antd';
import { systemService, SystemOption } from '../../services/system';

interface SystemSelectorProps {
  value: string;
  onChange: (systemId: string) => void;
}

const SystemSelector: React.FC<SystemSelectorProps> = ({ value, onChange }) => {
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSystems();
  }, []);

  const loadSystems = async () => {
    try {
      setLoading(true);
      const allSystems = await systemService.list();
      setSystems(allSystems);
      
      // 如果当前没有选中的系统，默认选中第一个
      if (!value && allSystems.length > 0) {
        onChange(allSystems[0].id);
      }
    } catch (error) {
      message.error('加载系统列表失败');
      console.error('Failed to load systems:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select
      loading={loading}
      value={value}
      onChange={onChange}
      placeholder="请选择系统"
      style={{ width: 200 }}
      allowClear={false}
    >
      {systems.map(system => (
        <Select.Option key={system.id} value={system.id}>
          {system.name}
        </Select.Option>
      ))}
    </Select>
  );
};

export default SystemSelector;
