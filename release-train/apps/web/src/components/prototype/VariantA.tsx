// ========== 变体 A：经典表单 ==========
// 所有字段纵向排列，单页长表单，Ant Design 标准风格
// 适合：字段少、用户熟悉表单操作的场景
import React from 'react';
import { Form, Input, Select, InputNumber, Button, Card, Space, Tag, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  Priority,
  PRIORITY_LABELS,
  ReqType,
  REQ_TYPE_LABELS,
  SourceChannel,
  SOURCE_CHANNEL_LABELS,
} from '@release-train/shared';

const { TextArea } = Input;
const { Title } = Typography;

// 模拟数据
const MOCK_SYSTEMS = [
  { value: 'sys-1', label: '用户中心' },
  { value: 'sys-2', label: '交易系统' },
  { value: 'sys-3', label: '风控平台' },
];

const MOCK_USERS: Record<string, { value: string; label: string }[]> = {
  'sys-1': [
    { value: 'u-1', label: '张三 (BA)' },
    { value: 'u-2', label: '李四 (PM)' },
  ],
  'sys-2': [
    { value: 'u-3', label: '王五 (BA)' },
    { value: 'u-4', label: '赵六 (PM)' },
  ],
  'sys-3': [
    { value: 'u-5', label: '钱七 (BA)' },
  ],
};

const MOCK_DEPENDENCIES = [
  { id: 'req-1', code: 'REQ-2026-0001', title: '用户登录优化', status: 'REVIEWED' },
  { id: 'req-2', code: 'REQ-2026-0003', title: '权限管理改造', status: 'DRAFT' },
];

const VariantA: React.FC = () => {
  const [form] = Form.useForm();
  const [selectedSystem, setSelectedSystem] = React.useState<string>('');
  const [deps, setDeps] = React.useState(MOCK_DEPENDENCIES);

  const handleFinish = (values: any) => {
    console.log('[VariantA] 提交数据:', values);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>新增需求</Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ priority: Priority.P2, storyPoints: 5 }}
      >
        <Card style={{ marginBottom: 16 }}>
          <Form.Item
            name="title"
            label="需求标题"
            rules={[{ required: true, message: '请输入需求标题' }, { max: 200, message: '标题不超过200字' }]}
          >
            <Input placeholder="简洁描述需求核心内容" size="large" />
          </Form.Item>

          <Space size="large" style={{ width: '100%' }} wrap>
            <Form.Item name="systemId" label="归属系统" rules={[{ required: true, message: '请选择归属系统' }]} style={{ width: 220 }}>
              <Select
                placeholder="选择系统"
                options={MOCK_SYSTEMS}
                onChange={(v) => { setSelectedSystem(v); form.setFieldsValue({ baId: undefined, pmId: undefined }); }}
              />
            </Form.Item>
            <Form.Item name="priority" label="优先级" rules={[{ required: true }]} style={{ width: 160 }}>
              <Select options={Object.entries(PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Form.Item>
            <Form.Item name="storyPoints" label="工作量(点)" rules={[{ required: true }]} style={{ width: 120 }}>
              <InputNumber min={1} max={100} />
            </Form.Item>
          </Space>

          <Space size="large" style={{ width: '100%' }} wrap>
            <Form.Item name="baId" label="业务归属人" rules={[{ required: true, message: '请选择业务归属人' }]} style={{ width: 220 }}>
              <Select
                placeholder={selectedSystem ? '选择BA' : '请先选择系统'}
                options={MOCK_USERS[selectedSystem]?.filter((u) => u.label.includes('BA')) || []}
                disabled={!selectedSystem}
              />
            </Form.Item>
            <Form.Item name="pmId" label="产品经理" style={{ width: 220 }}>
              <Select
                placeholder={selectedSystem ? '选择PM' : '请先选择系统'}
                options={MOCK_USERS[selectedSystem]?.filter((u) => u.label.includes('PM')) || []}
                disabled={!selectedSystem}
                allowClear
              />
            </Form.Item>
          </Space>

          <Space size="large" style={{ width: '100%' }} wrap>
            <Form.Item name="reqType" label="需求类型" style={{ width: 180 }}>
              <Select placeholder="可选" options={Object.entries(REQ_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} allowClear />
            </Form.Item>
            <Form.Item name="sourceChannel" label="来源渠道" style={{ width: 180 }}>
              <Select placeholder="可选" options={Object.entries(SOURCE_CHANNEL_LABELS).map(([v, l]) => ({ value: v, label: l }))} allowClear />
            </Form.Item>
          </Space>
        </Card>

        <Card title="需求描述" style={{ marginBottom: 16 }}>
          <Form.Item
            name="description"
            rules={[{ required: true, message: '请输入需求描述' }]}
          >
            <TextArea
              rows={8}
              placeholder="详细描述需求背景、目标、验收标准等（原型用纯文本，正式版为TipTap富文本）"
              style={{ fontSize: 14 }}
            />
          </Form.Item>
        </Card>

        <Card
          title="关联依赖"
          extra={<Button type="link" icon={<PlusOutlined />}>添加依赖</Button>}
          style={{ marginBottom: 16 }}
        >
          {deps.length === 0 ? (
            <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>暂无关联依赖</div>
          ) : (
            deps.map((dep) => (
              <div
                key={dep.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#fafafa',
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <Space>
                  <Tag color="blue">{dep.code}</Tag>
                  <span>{dep.title}</span>
                  <Tag color={dep.status === 'REVIEWED' ? 'green' : 'orange'}>{dep.status}</Tag>
                </Space>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setDeps(deps.filter((d) => d.id !== dep.id))}
                />
              </div>
            ))
          )}
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
          <Button>取消</Button>
          <Button type="default">保存草稿</Button>
          <Button type="primary">保存并发起评审</Button>
        </div>
      </Form>
    </div>
  );
};

export default VariantA;
