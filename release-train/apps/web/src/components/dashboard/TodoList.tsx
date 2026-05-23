import React from 'react';
import { Card, List, Tag, Typography, Space } from 'antd';
import { MyTodosResponse, RequirementListItem, EmergencyChangeItem } from '@release-train/shared';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

interface TodoListProps {
  todos: MyTodosResponse;
}

const TodoList: React.FC<TodoListProps> = ({ todos }) => {
  const navigate = useNavigate();

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
    <List.Item
      key={item.id}
      onClick={() => navigate(`/requirements/${item.requirementId}`)}
      style={{ cursor: 'pointer' }}
    >
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
    </List.Item>
  );

  return (
    <div>
      {todos.pendingReviewRejected && todos.pendingReviewRejected.length > 0 && (
        <Card title="被驳回的需求（请重新编辑）" style={{ marginBottom: 16 }}>
          <List
            dataSource={todos.pendingReviewRejected}
            renderItem={renderRequirementItem}
          />
        </Card>
      )}

      {todos.changeApprovedNeedsResubmit && todos.changeApprovedNeedsResubmit.length > 0 && (
        <Card title="变更通过的需求（请重新提交评审）" style={{ marginBottom: 16 }}>
          <List
            dataSource={todos.changeApprovedNeedsResubmit}
            renderItem={renderRequirementItem}
          />
        </Card>
      )}

      {todos.pendingReviewList && todos.pendingReviewList.length > 0 && (
        <Card title="待评审需求" style={{ marginBottom: 16 }}>
          <List
            dataSource={todos.pendingReviewList}
            renderItem={renderRequirementItem}
          />
        </Card>
      )}

      {todos.emergencyPendingApproval && todos.emergencyPendingApproval.length > 0 && (
        <Card title="紧急变更待审批" style={{ marginBottom: 16 }}>
          <List
            dataSource={todos.emergencyPendingApproval}
            renderItem={renderEmergencyItem}
          />
        </Card>
      )}

      {todos.pendingOnboard && todos.pendingOnboard.length > 0 && (
        <Card title="待纳版需求" style={{ marginBottom: 16 }}>
          <List
            dataSource={todos.pendingOnboard}
            renderItem={renderRequirementItem}
          />
        </Card>
      )}

      {todos.pendingRelease && todos.pendingRelease.length > 0 && (
        <Card title="待投产需求" style={{ marginBottom: 16 }}>
          <List
            dataSource={todos.pendingRelease}
            renderItem={renderRequirementItem}
          />
        </Card>
      )}
    </div>
  );
};

export default TodoList;
