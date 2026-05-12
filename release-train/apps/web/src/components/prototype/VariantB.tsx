// ========== 变体 B：分步向导 ==========
// 字段拆成 3 步：基本信息 → 详细描述 → 依赖与提交
// 适合：字段多、需要引导用户按顺序填写的场景
import React from 'react';
import { Form, Input, Select, InputNumber, Button, Card, Steps, Tag, Space, Typography, Result } from 'antd';
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

const VariantB: React.FC = () => {
  const [form] = Form.useForm();
  const [current, setCurrent] = React.useState(0);
  const [selectedSystem, setSelectedSystem] = React.useState<string>('');
  const [deps, setDeps] = React.useState(MOCK_DEPENDENCIES);

  const steps = [
    { title: '基本信息', description: '标题、系统、优先级' },
    { title: '需求描述', description: '详细描述需求' },
    { title: '依赖与提交', description: '配置依赖关系' },
  ];

  const next = async () => {
    try {
      const fields = current === 0
        ? ['title', 'systemId', 'priority', 'storyPoints', 'baId']
        : ['description'];
      await form.validateFields(fields);
      setCurrent(current + 1);
    } catch {}
  };

  const prev = () => setCurrent(current - 1);

  const handleFinish = () => {
    form.validateFields().then((values) => {
      console.log('[VariantB] 提交数据:', values);
    });
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 24 }}>新增需求</Title>

      <Steps current={current} items={steps} style={{ marginBottom: 32 }} size="small" />

      <Form
        form={form}
        layout="vertical"
        initialValues={{ priority: Priority.P2, storyPoints: 5 }}
      >
        {/* Step 0: 基本信息 */}
        <div style={{ display: current === 0 ? 'block' : 'none' }}>
          <Card>
            <Form.Item
              name="title"
              label="需求标题"
              rules={[{ required: true, message: '请输入需求标题' }, { max: 200 }]}
            >
              <Input placeholder="简洁描述需求核心内容" size="large" />
            </Form.Item>

            <Form.Item name="systemId" label="归属系统" rules={[{ required: true, message: '请选择归属系统' }]}>
              <Select
                placeholder="选择系统"
                options={MOCK_SYSTEMS}
                onChange={(v) => { setSelectedSystem(v); form.setFieldsValue({ baId: undefined, pmId: undefined }); }}
              />
            </Form.Item>

            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item name="priority" label="优先级" rules={[{ required: true }]} style={{ flex: 1 }}>
                <Select options={Object.entries(PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
              </Form.Item>
              <Form.Item name="storyPoints" label="工作量(点)" rules={[{ required: true }]} style={{ flex: 1 }}>
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item name="baId" label="业务归属人" rules={[{ required: true, message: '请选择' }]} style={{ flex: 1 }}>
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

            <div style={{ display: 'flex', gap: 16 }}>
              <Form.Item name="reqType" label="需求类型" style={{ flex: 1 }}>
                <Select placeholder="可选" options={Object.entries(REQ_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} allowClear />
              </Form.Item>
              <Form.Item name="sourceChannel" label="来源渠道" style={{ flex: 1 }}>
                <Select placeholder="可选" options={Object.entries(SOURCE_CHANNEL_LABELS).map(([v, l]) => ({ value: v, label: l }))} allowClear />
              </Form.Item>
            </div>
          </Card>
        </div>

        {/* Step 1: 需求描述 */}
        <div style={{ display: current === 1 ? 'block' : 'none' }}>
          <Card>
            <Form.Item name="description" label="需求描述" rules={[{ required: true, message: '请输入需求描述' }]}>
              <TextArea
                rows={14}
                placeholder="详细描述需求背景、目标、验收标准等&#10;&#10;建议包含：&#10;1. 背景与目标&#10;2. 功能需求&#10;3. 非功能需求&#10;4. 验收标准"
                style={{ fontSize: 14 }}
              />
            </Form.Item>
            <div style={{ color: '#999', fontSize: 12 }}>
              支持富文本编辑（TipTap），原型阶段使用纯文本代替
            </div>
          </Card>
        </div>

        {/* Step 2: 依赖与提交 */}
        <div style={{ display: current === 2 ? 'block' : 'none' }}>
          <Card
            title="前置依赖（可选）"
            extra={<Button type="link" icon={<PlusOutlined />}>添加依赖</Button>}
            style={{ marginBottom: 16 }}
          >
            {deps.length === 0 ? (
              <div style={{ color: '#999', textAlign: 'center', padding: 24 }}>
                暂无前置依赖，点击右上角添加
              </div>
            ) : (
              deps.map((dep) => (
                <div
                  key={dep.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
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

          <Card title="提交确认" size="small">
            <div style={{ color: '#666', fontSize: 14, lineHeight: 2 }}>
              <div>• 保存草稿：需求保存为草稿状态，可继续编辑</div>
              <div>• 保存并发起评审：需求提交后进入评审流程，不可再编辑</div>
            </div>
          </Card>
        </div>
      </Form>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <div>
          {current > 0 && <Button onClick={prev}>上一步</Button>}
        </div>
        <Space>
          <Button>取消</Button>
          {current < steps.length - 1 && (
            <Button type="primary" onClick={next}>下一步</Button>
          )}
          {current === steps.length - 1 && (
            <>
              <Button type="default">保存草稿</Button>
              <Button type="primary" onClick={handleFinish}>保存并发起评审</Button>
            </>
          )}
        </Space>
      </div>
    </div>
  );
};

export default VariantB;
