// ========== 变体 C：双栏布局 ==========
// 左侧表单 + 右侧实时预览（需求卡片预览 + 依赖关系可视化）
// 适合：需要边填边看效果的场景，信息密度高
import React from 'react';
import {
  Form, Input, Select, InputNumber, Button, Card, Tag, Space, Typography, Divider, Badge, Tooltip,
} from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import {
  Priority, PRIORITY_LABELS, ReqType, REQ_TYPE_LABELS,
  SourceChannel, SOURCE_CHANNEL_LABELS, ReqStatus,
} from '@release-train/shared';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

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
  { id: 'req-1', code: 'REQ-2026-0001', title: '用户登录优化', status: 'REVIEWED', system: '用户中心' },
  { id: 'req-2', code: 'REQ-2026-0003', title: '权限管理改造', status: 'DRAFT', system: '交易系统' },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default',
  PENDING_REVIEW: 'processing',
  REVIEWED: 'green',
  CANCELLED: 'red',
};

const VariantC: React.FC = () => {
  const [form] = Form.useForm();
  const [selectedSystem, setSelectedSystem] = React.useState<string>('');
  const [deps, setDeps] = React.useState(MOCK_DEPENDENCIES);
  const formValues = Form.useWatch([], form) || {};

  const systemLabel = MOCK_SYSTEMS.find((s) => s.value === formValues.systemId)?.label || '—';
  const baLabel = MOCK_USERS[formValues.systemId || '']?.find((u) => u.value === formValues.baId)?.label || '—';
  const pmLabel = MOCK_USERS[formValues.systemId || '']?.find((u) => u.value === formValues.pmId)?.label || '—';
  const priorityLabel = PRIORITY_LABELS[formValues.priority as Priority] || '—';
  const reqTypeLabel = REQ_TYPE_LABELS[formValues.reqType as ReqType] || '—';
  const sourceLabel = SOURCE_CHANNEL_LABELS[formValues.sourceChannel as SourceChannel] || '—';

  const handleFinish = (values: any) => {
    console.log('[VariantC] 提交数据:', values);
  };

  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 'calc(100vh - 140px)' }}>
      {/* 左侧：表单 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Title level={4} style={{ marginBottom: 24 }}>新增需求</Title>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ priority: Priority.P2, storyPoints: 5 }}
        >
          <Form.Item
            name="title"
            label="需求标题"
            rules={[{ required: true, message: '请输入需求标题' }, { max: 200 }]}
          >
            <Input placeholder="简洁描述需求核心内容" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="systemId" label="归属系统" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select
                placeholder="选择系统"
                options={MOCK_SYSTEMS}
                onChange={(v) => { setSelectedSystem(v); form.setFieldsValue({ baId: undefined, pmId: undefined }); }}
              />
            </Form.Item>
            <Form.Item name="priority" label="优先级" rules={[{ required: true }]} style={{ width: 140 }}>
              <Select options={Object.entries(PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Form.Item>
            <Form.Item name="storyPoints" label="工作量" rules={[{ required: true }]} style={{ width: 100 }}>
              <InputNumber min={1} max={100} placeholder="点" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="baId" label="业务归属人" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select
                placeholder={selectedSystem ? '选择BA' : '请先选择系统'}
                options={MOCK_USERS[selectedSystem]?.filter((u) => u.label.includes('BA')) || []}
                disabled={!selectedSystem}
              />
            </Form.Item>
            <Form.Item name="pmId" label="产品经理" style={{ flex: 1 }}>
              <Select
                placeholder={selectedSystem ? '选择PM' : '请先选择系统'}
                options={MOCK_USERS[selectedSystem]?.filter((u) => u.label.includes('PM')) || []}
                disabled={!selectedSystem}
                allowClear
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="reqType" label="需求类型" style={{ flex: 1 }}>
              <Select placeholder="可选" options={Object.entries(REQ_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} allowClear />
            </Form.Item>
            <Form.Item name="sourceChannel" label="来源渠道" style={{ flex: 1 }}>
              <Select placeholder="可选" options={Object.entries(SOURCE_CHANNEL_LABELS).map(([v, l]) => ({ value: v, label: l }))} allowClear />
            </Form.Item>
          </div>

          <Form.Item name="description" label="需求描述" rules={[{ required: true, message: '请输入需求描述' }]}>
            <TextArea rows={6} placeholder="详细描述需求背景、目标、验收标准等" />
          </Form.Item>

          <Card
            size="small"
            title={<span style={{ fontSize: 14 }}>关联依赖</span>}
            extra={<Button type="link" size="small" icon={<PlusOutlined />}>添加</Button>}
          >
            {deps.map((dep) => (
              <div
                key={dep.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  background: '#fafafa',
                  borderRadius: 4,
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <Space size={4}>
                  <Tag color="blue" style={{ margin: 0 }}>{dep.code}</Tag>
                  <span>{dep.title}</span>
                </Space>
                <Space size={4}>
                  <Tag color={STATUS_COLORS[dep.status] || 'default'} style={{ margin: 0 }}>{dep.status}</Tag>
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => setDeps(deps.filter((d) => d.id !== dep.id))} />
                </Space>
              </div>
            ))}
            {deps.length === 0 && <div style={{ color: '#999', textAlign: 'center', padding: 12, fontSize: 13 }}>暂无依赖</div>}
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <Button>取消</Button>
            <Button type="default">保存草稿</Button>
            <Button type="primary">保存并发起评审</Button>
          </div>
        </Form>
      </div>

      {/* 右侧：实时预览 */}
      <div style={{ width: 360, flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: 16 }}>
          <Card
            size="small"
            title={<Space><InfoCircleOutlined /> 实时预览</Space>}
            style={{ marginBottom: 16 }}
          >
            <div style={{ marginBottom: 12 }}>
              <Tag color="default">草稿</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>REQ-2026-XXXX</Text>
            </div>

            <Title level={5} style={{ margin: '0 0 12px' }}>
              {formValues.title || '（未填写标题）'}
            </Title>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div><Text type="secondary">归属系统</Text><div>{systemLabel}</div></div>
              <div><Text type="secondary">优先级</Text><div><Tag color="red">{priorityLabel}</Tag></div></div>
              <div><Text type="secondary">业务归属人</Text><div>{baLabel}</div></div>
              <div><Text type="secondary">产品经理</Text><div>{pmLabel}</div></div>
              <div><Text type="secondary">工作量</Text><div>{formValues.storyPoints || '—'} 点</div></div>
              <div><Text type="secondary">需求类型</Text><div>{reqTypeLabel}</div></div>
              <div><Text type="secondary">来源渠道</Text><div>{sourceLabel}</div></div>
            </div>

            {formValues.description && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>描述预览</Text>
                <Paragraph
                  ellipsis={{ rows: 4, expandable: false }}
                  style={{ fontSize: 13, marginTop: 4, color: '#333' }}
                >
                  {formValues.description}
                </Paragraph>
              </>
            )}
          </Card>

          {/* 依赖关系可视化 */}
          <Card
            size="small"
            title={<Space><InfoCircleOutlined /> 依赖关系</Space>}
          >
            {deps.length === 0 ? (
              <div style={{ color: '#999', textAlign: 'center', padding: 16, fontSize: 13 }}>
                无关联依赖
              </div>
            ) : (
              <div>
                {deps.map((dep) => (
                  <div
                    key={dep.id}
                    style={{
                      padding: '8px 10px',
                      background: dep.status === 'REVIEWED' ? '#f6ffed' : '#fff7e6',
                      borderRadius: 6,
                      marginBottom: 8,
                      borderLeft: `3px solid ${dep.status === 'REVIEWED' ? '#52c41a' : '#faad14'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      {dep.status === 'REVIEWED'
                        ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        : <WarningOutlined style={{ color: '#faad14' }} />
                      }
                      <Text strong style={{ fontSize: 12 }}>{dep.code}</Text>
                      <Tag color={STATUS_COLORS[dep.status]} style={{ margin: 0, fontSize: 11 }}>{dep.status}</Tag>
                    </div>
                    <div style={{ fontSize: 13, marginTop: 2, paddingLeft: 22 }}>{dep.title}</div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 2, paddingLeft: 22 }}>{dep.system}</div>
                  </div>
                ))}
                <div style={{
                  textAlign: 'center',
                  padding: '8px 0',
                  color: '#999',
                  fontSize: 12,
                  borderTop: '1px dashed #e8e8e8',
                  marginTop: 4,
                }}>
                  ↓ 当前需求
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VariantC;
