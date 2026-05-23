import React, { useState } from 'react';
import { Card, List, Tag, Typography, Space, Button, Modal, Input } from 'antd';
import { MyTodosResponse, RequirementListItem, EmergencyChangeItem } from '@release-train/shared';
import { useNavigate } from 'react-router-dom';
import { CheckCircleOutlined, CloseOutlined } from '@ant-design/icons';
import requirementService from '../../services/requirement';

const { Text } = Typography;
const { TextArea } = Input;

interface TodoListProps {
  todos: MyTodosResponse;
}

const TodoList: React.FC<TodoListProps> = ({ todos }) => {
  const navigate = useNavigate();
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [currentEmergencyId, setCurrentEmergencyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async (id: string) => {
    try {
      const res = await requirementService.approveEmergencyChange(id);
      if (res.success) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async () => {
    if (!currentEmergencyId || !rejectReason.trim()) {
      return;
    }
    try {
      const res = await requirementService.rejectEmergencyChange(currentEmergencyId, rejectReason);
      if (res.success) {
        setRejectModalVisible(false);
        setRejectReason('');
        setCurrentEmergencyId(null);
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const openRejectModal = (id: string) => {
    setCurrentEmergencyId(id);
    setRejectModalVisible(true);
  };

  const renderRequirementItem = (req: RequirementListItem) => (
    <List.Item
      key={req.id}
      onClick={() => navigate(`/requirements/${req.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <List.Item.Meta
        title={<Space><Text strong>{req.reqCode}</Text> {req.title}</Space>}
        description={
          <Space>
            <Tag color="blue">{req.system.name}</Tag>
            <Tag color={req.priority === 'P0' ? 'red' : req.priority === 'P1' ? 'orange' : 'default'}>
              {req.priority}
            </Tag>
            <Text type="secondary">{new Date(req.updatedAt).toLocaleString()}</Text>
          </Space>
        }
      />
    </List.Item>
  );

  const renderEmergencyItem = (item: EmergencyChangeItem) => (
    <List.Item key={item.id}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div onClick={() => navigate(`/requirements/${item.requirementId}`)} style={{ cursor: 'pointer', flex: 1 }}>
          <List.Item.Meta
            title={<Space><Text strong>{item.reqCode}</Text> {item.title}</Space>}
            description={
              <Space>
                <Tag color="blue">{item.system.name}</Tag>
                <Tag color={item.urgency === 'P0' ? 'red' : 'orange'}>
                  {item.urgency}
                </Tag>
                <Tag color="yellow">紧急变更待审批</Tag>
                <Text type="secondary">{new Date(item.createdAt).toLocaleString()}</Text>
              </Space>
            }
          />
        </div>
        <Space style={{ marginLeft: 16 }}>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleApprove(item.id);
            }}
          >
            通过
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              openRejectModal(item.id);
            }}
          >
            驳回
          </Button>
        </Space>
      </div>
    </List.Item>
  );

  const renderSection = (
    title: string,
    data: any[],
    renderItem: (item: any) => React.ReactNode,
    style?: React.CSSProperties
  ) => {
    if (!data || data.length === 0) return null;
    return (
      <Card title={title} style={{ ...style, marginBottom: 16 }}>
        <List dataSource={data} renderItem={renderItem} />
      </Card>
    );
  };

  return (
    <div>
      {renderSection('被驳回的需求（请重新编辑）', todos.pendingReviewRejected, renderRequirementItem)}
      {renderSection('变更通过的需求（请重新提交评审）', todos.changeApprovedNeedsResubmit, renderRequirementItem)}
      {renderSection('待评审需求', todos.pendingReviewList, renderRequirementItem)}
      {renderSection('紧急变更待审批', todos.emergencyPendingApproval, renderEmergencyItem)}
      {renderSection('待纳版需求', todos.pendingOnboard, renderRequirementItem)}
      {renderSection('待投产需求', todos.pendingRelease, renderRequirementItem)}
      {renderSection('待开发需求', todos.pendingDev, renderRequirementItem)}
      {renderSection('待提交测试', todos.pendingToSubmitTest, renderRequirementItem)}
      {renderSection('待测试需求', todos.pendingTest, renderRequirementItem)}

      {/* 驳回确认弹窗 */}
      <Modal
        title="驳回紧急变更"
        visible={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          setRejectReason('');
          setCurrentEmergencyId(null);
        }}
        footer={[
          <Button key="back" onClick={() => setRejectModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleReject}>
            确认驳回
          </Button>
        ]}
      >
        <TextArea
          placeholder="请输入驳回原因"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={4}
          style={{ marginBottom: 16 }}
        />
      </Modal>
    </div>
  );
};

export default TodoList;
