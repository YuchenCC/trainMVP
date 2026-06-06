// ========== 智能纳版班次选择模态框 ==========
import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Tag, message } from 'antd';
import { RocketOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ScheduleProgressItem } from '@release-train/shared';
import { trainService } from '../../services/train';

interface SmartOnboardModalProps {
  visible: boolean;
  onCancel: () => void;
}

const SmartOnboardModal: React.FC<SmartOnboardModalProps> = ({ visible, onCancel }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleProgressItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ScheduleProgressItem | null>(null);

  useEffect(() => {
    if (visible) {
      fetchSchedules();
    }
  }, [visible]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await trainService.getScheduleProgress();
      if (res.success && res.data) {
        // 只显示可纳版的班次（未封板的）
        const availableSchedules = res.data.filter((item: any) => 
          item.status !== 'LOCKED_DOWN' && item.status !== 'RELEASED' && item.status !== 'COMPLETED'
        );
        setSchedules(availableSchedules);
      } else {
        message.error('获取班次列表失败');
      }
    } catch (error) {
      message.error('获取班次列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedItem) {
      message.warning('请选择一个班次');
      return;
    }
    // 跳转到班次详情页面，并携带自动触发智能纳版参数
    navigate(`/trains/${selectedItem.trainId}/schedules/${selectedItem.scheduleId}?autoOnboard=true`);
    onCancel();
  };

  const columns = [
    {
      title: '班次名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; label: string }> = {
          PLANNING: { color: 'blue', label: '规划中' },
          ONGOING: { color: 'green', label: '进行中' },
          BOARDING: { color: 'gold', label: '纳版中' },
          LOCKED_DOWN: { color: 'red', label: '已封板' },
          RELEASED: { color: 'purple', label: '已投产' },
          COMPLETED: { color: 'gray', label: '已完成' },
        };
        const item = statusMap[status] || { color: 'gray', label: status };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: '纳版截止',
      dataIndex: 'boardingDate',
      key: 'boardingDate',
      render: (date: string) => (
        <span className="flex items-center gap-1">
          <CalendarOutlined size={14} />
          {date ? new Date(date).toLocaleDateString('zh-CN') : '-'}
        </span>
      ),
    },
    {
      title: '容量使用',
      dataIndex: ['capacityTotal', 'capacityUsed'],
      key: 'capacity',
      render: (_: unknown, record: ScheduleProgressItem) => {
        const rate = record.capacityTotal > 0 
          ? Math.round((record.capacityUsed / record.capacityTotal) * 100) 
          : 0;
        return (
          <span>
            {record.capacityUsed}/{record.capacityTotal} SP ({rate}%)
          </span>
        );
      },
    },
    {
      title: '已纳版需求',
      dataIndex: 'totalRequirements',
      key: 'totalRequirements',
      render: (count: number) => (
        <span className="flex items-center gap-1">
          <ClockCircleOutlined size={14} />
          {count} 个
        </span>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <RocketOutlined className="text-primary" />
          <span>AI 智能纳版</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleConfirm}
          loading={loading}
          disabled={!selectedItem}
        >
          开始智能纳版
        </Button>,
      ]}
      width={800}
    >
      <p className="mb-4 text-gray-500">
        请选择要进行智能纳版的班次，AI 将根据需求优先级、依赖关系和班次容量自动生成纳版建议。
      </p>
      
      <Table
        dataSource={schedules}
        columns={columns}
        rowKey="scheduleId"
        loading={loading}
        pagination={false}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedItem ? [selectedItem.scheduleId] : [],
          onChange: (keys, records) => setSelectedItem(records[0] || null),
        }}
        locale={{
          emptyText: loading ? '加载中...' : '暂无可纳版的班次',
        }}
      />
    </Modal>
  );
};

export default SmartOnboardModal;
