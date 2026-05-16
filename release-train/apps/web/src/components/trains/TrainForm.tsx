// ========== 火车表单组件 ==========
// TrainForm — 创建/编辑版本火车共用组件
// 支持创建模式和编辑模式，通过 mode prop 区分
// 文件名：TrainForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Form, Input, Button, Card, Space, Typography, Divider, message, Spin, Modal, Select, InputNumber,
} from 'antd';
import {
  PlusOutlined,             // 添加搭载系统按钮图标
  DeleteOutlined,           // 删除搭载系统按钮图标
  SaveOutlined,             // 保存按钮图标
} from '@ant-design/icons';
import {
  CreateTrainRequest,              // 创建火车请求类型
  UpdateTrainRequest,             // 编辑火车请求类型
  TrainDetail,                   // 火车详情类型
  AvailableSystem,               // 可选系统类型
  TrainStatus,                   // 火车状态枚举
} from '@release-train/shared';
import { trainService } from '../../services/train';
import { systemService, SystemUserOption } from '../../services/system';
import { useAuthStore } from '../../stores/auth';

// ========== Ant Design 子组件解构 ==========
const { TextArea } = Input;       // 多行文本输入（火车描述）
const { Title, Text } = Typography; // 排版组件

// ========== 组件 Props 类型 ==========
interface TrainFormProps {
  mode: 'create' | 'edit';      // 表单模式：创建/编辑
  initialData?: TrainDetail;     // 编辑模式下的初始数据
  onCancel?: () => void;        // 取消/返回回调
  onSuccess?: (trainId?: string) => void; // 成功回调
}

// ========== 搭载系统表单数据项 ==========
// 用于表单内的本地状态管理
interface TrainSystemFormItem {
  systemId: string;                    // 系统 ID
  systemName: string;                  // 系统名称（显示用）
  capacityPoints: number;              // 本期可用点数
  baUserId?: string;                   // 业务 BA 用户 ID
  pmUserId?: string;                   // 产品经理用户 ID
  techMgrUserId?: string;              // 技术经理用户 ID
  testMgrUserId?: string;              // 测试负责人用户 ID
  devTeamUserIds?: string[];           // 开发团队用户 ID 列表
  conflictInfo?: {                     // 冲突信息（如果系统已在其他火车）
    trainId: string;
    trainName: string;
    trainStatus: TrainStatus;
  };
}

/**
 * 火车表单组件（核心组件）
 * 
 * 同时支持创建和编辑两种模式，通过 mode prop 区分。
 * 火车名称和描述在表单内编辑，搭载系统通过独立区域配置。
 */
const TrainForm: React.FC<TrainFormProps> = ({ mode, initialData, onCancel, onSuccess }) => {
  // ========== 表单状态 ==========
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { checkPermission } = useAuthStore();

  // ========== 搭载系统状态 ==========
  const [systems, setSystems] = useState<TrainSystemFormItem[]>([]);
  const [availableSystems, setAvailableSystems] = useState<AvailableSystem[]>([]);
  const [availableSystemsLoading, setAvailableSystemsLoading] = useState(false);

  // ========== 系统成员状态 ==========
  // 存储每个系统的成员列表，key 为 systemId
  const [systemUsers, setSystemUsers] = useState<Record<string, SystemUserOption[]>>({});
  const [usersLoading, setUsersLoading] = useState<Record<string, boolean>>({});

  // ========== 初始化标志 ==========
  const [initialized, setInitialized] = useState(false);

  // ========== 加载可选系统列表 ==========
  // 创建模式：加载所有可添加的系统（含冲突信息）
  // 编辑模式：加载排除已在该火车的系统
  const loadAvailableSystems = useCallback(async () => {
    setAvailableSystemsLoading(true);
    try {
      const trainId = mode === 'edit' ? initialData?.id : undefined;
      const res = await trainService.getAvailableSystems(trainId);
      setAvailableSystems(res.data || []);
    } catch {
      message.error('加载可选系统失败');
      setAvailableSystems([]);
    } finally {
      setAvailableSystemsLoading(false);
    }
  }, [mode, initialData?.id]);

  // ========== 加载系统成员列表 ==========
  // 加载指定系统的成员，用于下拉选择 BA/PM/TECH_MGR/TEST_MGR/DEV
  const loadSystemUsers = useCallback(async (systemId: string) => {
    if (systemUsers[systemId]) return; // 已加载则跳过

    setUsersLoading((prev) => ({ ...prev, [systemId]: true }));
    try {
      const users = await systemService.getUsers(systemId);
      setSystemUsers((prev) => ({ ...prev, [systemId]: users }));
    } catch {
      message.error('加载系统成员失败');
      setSystemUsers((prev) => ({ ...prev, [systemId]: [] }));
    } finally {
      setUsersLoading((prev) => ({ ...prev, [systemId]: false }));
    }
  }, [systemUsers]);

  // ========== 初始化 ==========
  useEffect(() => {
    if (initialized) return;

    loadAvailableSystems();

    if (mode === 'edit' && initialData) {
      form.setFieldsValue({
        name: initialData.name,
        description: initialData.description,
      });

      // 回填搭载系统列表
      const initSystems: TrainSystemFormItem[] = initialData.systems.map((sys) => ({
        systemId: sys.system.id,
        systemName: sys.system.name,
        capacityPoints: sys.capacityPoints,
        baUserId: sys.baUser?.id,
        pmUserId: sys.pmUser?.id,
        techMgrUserId: sys.techMgrUser?.id,
        testMgrUserId: sys.testMgrUser?.id,
        devTeamUserIds: sys.devTeamUsers?.map((u) => u.id),
      }));
      setSystems(initSystems);

      // 预加载所有系统的成员列表
      initialData.systems.forEach((sys) => {
        loadSystemUsers(sys.system.id);
      });
    }

    setInitialized(true);
  }, [mode, initialData, form, loadAvailableSystems, loadSystemUsers, initialized]);

  // ========== 添加搭载系统 ==========
  const handleAddSystem = (system: AvailableSystem) => {
    // 校验冲突
    if (system.conflictTrain) {
      message.warning(`系统【${system.name}】已在火车【${system.conflictTrain.name}】中，无法重复添加`);
      return;
    }

    // 校验是否已添加
    if (systems.some((s) => s.systemId === system.id)) {
      message.warning('该系统已添加');
      return;
    }

    const newSystem: TrainSystemFormItem = {
      systemId: system.id,
      systemName: system.name,
      capacityPoints: 100, // 默认 100 点
    };

    setSystems([...systems, newSystem]);
    loadSystemUsers(system.id);
  };

  // ========== 移除搭载系统 ==========
  const handleRemoveSystem = (systemId: string) => {
    setSystems(systems.filter((s) => s.systemId !== systemId));
  };

  // ========== 更新搭载系统配置 ==========
  const handleUpdateSystem = (systemId: string, field: keyof TrainSystemFormItem, value: any) => {
    setSystems(systems.map((s) => {
      if (s.systemId !== systemId) return s;
      return { ...s, [field]: value };
    }));
  };

  // ========== 构建提交 Payload ==========
  // 将表单数据和搭载系统列表组装为创建/编辑请求体
  const buildPayload = (values: any): CreateTrainRequest | UpdateTrainRequest => {
    const base = {
      name: values.name,
      description: values.description,
      systems: systems.map((s) => ({
        systemId: s.systemId,
        capacityPoints: s.capacityPoints,
        baUserId: s.baUserId,
        pmUserId: s.pmUserId,
        techMgrUserId: s.techMgrUserId,
        testMgrUserId: s.testMgrUserId,
        devTeamUserIds: s.devTeamUserIds,
      })),
    };

    if (mode === 'create') {
      return base as CreateTrainRequest;
    } else {
      return {
        ...base,
        version: initialData!.version,
      } as UpdateTrainRequest;
    }
  };

  // ========== 表单提交处理 ==========
  const handleFinish = async (values: any) => {
    // 校验至少添加一个搭载系统
    if (systems.length === 0) {
      message.warning('请至少添加一个搭载系统');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = buildPayload(values);

      if (mode === 'create') {
        const res = await trainService.create(data as CreateTrainRequest);
        message.success('版本火车创建成功');
        onSuccess?.(res.data?.id);
      } else {
        await trainService.update(initialData!.id, data as UpdateTrainRequest);
        onSuccess?.();
      }
    } catch (error: any) {
      const errCode = error?.code;
      if (errCode === 'TRAIN_VERSION_CONFLICT') {
        Modal.warning({
          title: '编辑冲突',
          content: '该火车已被其他人修改，请刷新页面获取最新数据后重新编辑。',
          okText: '刷新页面',
          onOk: () => {
            window.location.reload();
          },
        });
      } else {
        message.error(error?.message || '操作失败');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== 过滤可选系统列表 ==========
  // 排除已在火车中的系统
  const filteredAvailableSystems = availableSystems.filter(
    (s) => !systems.some((added) => added.systemId === s.id)
  );

  // ========== 成员角色选项 ==========
  // 从系统成员列表中提取各角色的选项
  const getRoleOptions = (systemId: string, role: string) => {
    const users = systemUsers[systemId] || [];
    return users
      .filter((u) => u.role === role || (role === 'DEV' && ['DEV', 'PM'].includes(u.role)))
      .map((u) => ({ value: u.id, label: u.displayName }));
  };

  // ========== 判断是否为规划中状态 ==========
  // 规划中状态才允许添加/移除搭载系统
  const isPlanning = mode === 'create' || initialData?.status === TrainStatus.PLANNING;

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {/* ======== 左侧：表单区域 ======== */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          {mode === 'edit' && initialData && (
            <Form.Item name="version" hidden>
              <Input type="hidden" />
            </Form.Item>
          )}

          {/* 火车名称 */}
          <Form.Item
            name="name"
            label="火车名称"
            rules={[
              { required: true, message: '请输入火车名称' },
              { min: 2, message: '火车名称至少2个字符' },
              { max: 100, message: '火车名称不能超过100个字符' },
            ]}
          >
            <Input placeholder="例如：2026-Q2 版本火车 V1" />
          </Form.Item>

          {/* 火车描述 */}
          <Form.Item
            name="description"
            label="火车描述"
            rules={[{ max: 2000, message: '火车描述不能超过2000个字符' }]}
          >
            <TextArea rows={4} placeholder="描述版本火车的目标、范围等" />
          </Form.Item>

          {/* 搭载系统配置区域 */}
          <Card
            size="small"
            title={<span style={{ fontSize: 14 }}>搭载系统配置</span>}
            extra={
              isPlanning && (
                <Select
                  placeholder="添加系统"
                  style={{ width: 200 }}
                  loading={availableSystemsLoading}
                  value={null}
                  onChange={(value) => {
                    const selected = availableSystems.find((s) => s.id === value);
                    if (selected) handleAddSystem(selected);
                  }}
                  options={filteredAvailableSystems.map((s) => ({
                    value: s.id,
                    label: s.conflictTrain
                      ? `${s.name} (已在 ${s.conflictTrain.name})`
                      : s.name,
                    disabled: !!s.conflictTrain,
                  }))}
                />
              )
            }
            style={{ marginBottom: 16 }}
          >
            {systems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                {isPlanning ? '点击上方下拉框添加搭载系统' : '暂无搭载系统'}
              </div>
            ) : (
              <div>
                {systems.map((sys) => (
                  <div
                    key={sys.systemId}
                    style={{
                      padding: 16,
                      background: '#fafafa',
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                  >
                    {/* 系统名称行 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text strong>{sys.systemName}</Text>
                      {isPlanning && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveSystem(sys.systemId)}
                        >
                          移除
                        </Button>
                      )}
                    </div>

                    {/* 配置项 */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {/* 本期可用点数 */}
                      <div style={{ width: 140 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>本期可用点数</Text>
                        <InputNumber
                          min={1}
                          max={500}
                          value={sys.capacityPoints}
                          onChange={(value) => handleUpdateSystem(sys.systemId, 'capacityPoints', value)}
                          disabled={!isPlanning}
                          style={{ width: '100%', marginTop: 4 }}
                        />
                      </div>

                      {/* 业务 BA */}
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>业务 BA</Text>
                        <Select
                          placeholder={usersLoading[sys.systemId] ? '加载中...' : '选择BA'}
                          value={sys.baUserId}
                          onChange={(value) => handleUpdateSystem(sys.systemId, 'baUserId', value)}
                          options={getRoleOptions(sys.systemId, 'BA')}
                          loading={usersLoading[sys.systemId]}
                          allowClear
                          showSearch
                          style={{ width: '100%', marginTop: 4 }}
                        />
                      </div>

                      {/* 产品经理 */}
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>产品经理</Text>
                        <Select
                          placeholder={usersLoading[sys.systemId] ? '加载中...' : '选择PM'}
                          value={sys.pmUserId}
                          onChange={(value) => handleUpdateSystem(sys.systemId, 'pmUserId', value)}
                          options={getRoleOptions(sys.systemId, 'PM')}
                          loading={usersLoading[sys.systemId]}
                          allowClear
                          showSearch
                          style={{ width: '100%', marginTop: 4 }}
                        />
                      </div>

                      {/* 技术经理 */}
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>技术经理</Text>
                        <Select
                          placeholder={usersLoading[sys.systemId] ? '加载中...' : '选择技术经理'}
                          value={sys.techMgrUserId}
                          onChange={(value) => handleUpdateSystem(sys.systemId, 'techMgrUserId', value)}
                          options={getRoleOptions(sys.systemId, 'TECH_MGR')}
                          loading={usersLoading[sys.systemId]}
                          allowClear
                          showSearch
                          style={{ width: '100%', marginTop: 4 }}
                        />
                      </div>

                      {/* 测试负责人 */}
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>测试负责人</Text>
                        <Select
                          placeholder={usersLoading[sys.systemId] ? '加载中...' : '选择测试负责人'}
                          value={sys.testMgrUserId}
                          onChange={(value) => handleUpdateSystem(sys.systemId, 'testMgrUserId', value)}
                          options={getRoleOptions(sys.systemId, 'TEST_MGR')}
                          loading={usersLoading[sys.systemId]}
                          allowClear
                          showSearch
                          style={{ width: '100%', marginTop: 4 }}
                        />
                      </div>

                      {/* 开发团队 */}
                      <div style={{ flex: 2, minWidth: 200 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>开发团队</Text>
                        <Select
                          mode="multiple"
                          placeholder={usersLoading[sys.systemId] ? '加载中...' : '选择开发人员'}
                          value={sys.devTeamUserIds || []}
                          onChange={(value) => handleUpdateSystem(sys.systemId, 'devTeamUserIds', value)}
                          options={getRoleOptions(sys.systemId, 'DEV')}
                          loading={usersLoading[sys.systemId]}
                          allowClear
                          showSearch
                          style={{ width: '100%', marginTop: 4 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 底部操作按钮 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {onCancel && <Button onClick={onCancel}>取消</Button>}
            <Button
              type="primary"
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={isSubmitting}
            >
              {mode === 'create' ? '创建版本火车' : '保存修改'}
            </Button>
          </div>
        </Form>
      </div>

      {/* ======== 右侧：说明区域 ======== */}
      <div style={{ width: 320, flexShrink: 0 }}>
        <Card size="small" title="说明" style={{ position: 'sticky', top: 16 }}>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ color: '#334155' }}>版本火车说明</Text>
            </div>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              <li>版本火车用于管理和协调多个系统的需求</li>
              <li>每个火车可搭载多个系统的需求</li>
              <li>一个系统同一时间只能参与一个火车</li>
              <li>火车创建后，可动态添加/移除搭载系统</li>
            </ul>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ color: '#334155' }}>容量点数</Text>
            </div>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              <li>每个系统可分配 1-500 点容量</li>
              <li>已使用点数 = 已纳版需求的点数总和</li>
              <li>剩余点数 = 容量 - 已使用</li>
            </ul>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ color: '#334155' }}>团队成员</Text>
            </div>
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              <li>BA：业务归属人</li>
              <li>PM：产品经理</li>
              <li>TECH_MGR：技术经理</li>
              <li>TEST_MGR：测试负责人</li>
              <li>DEV：开发团队成员</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TrainForm;
