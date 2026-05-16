// ========== 搭载系统列表组件 ==========
// TrainSystemList — 显示火车搭载系统的列表组件
// 支持查看系统容量、人员配置，支持编辑模式和操作按钮
// 文件名：TrainSystemList.tsx
import React, { useState, useCallback } from 'react';
import {
  Table, Tag, Progress, Card, Space, Typography, Button, message, Modal, Select, InputNumber, Tooltip,
} from 'antd';
import {
  EditOutlined, DeleteOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  TrainSystemDetail,           // 搭载系统详情类型
  TrainStatus,                // 火车状态枚举
  TRAIN_STATUS_LABELS,        // 火车状态标签
  AvailableSystem,            // 可选系统类型
  AddTrainSystemRequest,      // 添加搭载系统请求类型
  UpdateTrainSystemRequest,   // 更新搭载系统请求类型
} from '@release-train/shared';
import { trainService } from '../../services/train';
import { systemService, SystemUserOption } from '../../services/system';

// ========== Ant Design 子组件解构 ==========
const { Text } = Typography;

// ========== 组件 Props 类型 ==========
interface TrainSystemListProps {
  trainId: string;                  // 火车 ID
  systems: TrainSystemDetail[];      // 搭载系统列表
  trainStatus: TrainStatus;         // 火车状态
  onRefresh: () => void;            // 刷新回调
}

// ========== 容量使用率颜色映射 ==========
// 根据容量使用率显示不同颜色：<70% 绿色，70-90% 黄色，>=90% 红色
const getUsageRateColor = (rate: number): string => {
  if (rate >= 90) return '#ff4d4f'; // 红色
  if (rate >= 70) return '#faad14'; // 黄色
  return '#52c41a';                  // 绿色
};

// ========== 容量使用率状态映射 ==========
const getUsageRateStatus = (rate: number): 'success' | 'normal' | 'exception' => {
  if (rate >= 90) return 'exception';
  if (rate >= 70) return 'normal';
  return 'success';
};

/**
 * 搭载系统列表组件
 * 
 * 显示火车搭载系统的容量、人员配置等信息。
 * 规划中状态支持添加/移除/编辑系统。
 */
const TrainSystemList: React.FC<TrainSystemListProps> = ({
  trainId,
  systems,
  trainStatus,
  onRefresh,
}) => {
  // ========== 状态 ==========
  const [availableSystems, setAvailableSystems] = useState<AvailableSystem[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<AvailableSystem | null>(null);
  const [editingSystem, setEditingSystem] = useState<TrainSystemDetail | null>(null);
  const [systemUsers, setSystemUsers] = useState<SystemUserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  // ========== 编辑表单状态 ==========
  const [capacityPoints, setCapacityPoints] = useState<number>(100);
  const [baUserId, setBaUserId] = useState<string | undefined>(undefined);
  const [pmUserId, setPmUserId] = useState<string | undefined>(undefined);
  const [techMgrUserId, setTechMgrUserId] = useState<string | undefined>(undefined);
  const [testMgrUserId, setTestMgrUserId] = useState<string | undefined>(undefined);
  const [devTeamUserIds, setDevTeamUserIds] = useState<string[]>([]);

  // ========== 判断是否为规划中状态 ==========
  // 规划中状态才允许添加/移除/编辑系统
  const isPlanning = trainStatus === TrainStatus.PLANNING;

  // ========== 加载可选系统列表 ==========
  const loadAvailableSystems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trainService.getAvailableSystems(trainId);
      setAvailableSystems(res.data || []);
    } catch {
      message.error('加载可选系统失败');
    } finally {
      setLoading(false);
    }
  }, [trainId]);

  // ========== 加载系统成员列表 ==========
  const loadSystemUsers = useCallback((systemId: string): Promise<void> => {
    setUsersLoading(true);
    return systemService.getUsers(systemId)
      .then((users: SystemUserOption[]) => {
        setSystemUsers(users);
      })
      .catch(() => {
        setSystemUsers([]);
      })
      .finally(() => {
        setUsersLoading(false);
      });
  }, []);

  // ========== 打开添加系统弹窗 ==========
  const handleOpenAddModal = async () => {
    await loadAvailableSystems();
    setAddModalVisible(true);
  };

  // ========== 选择系统后加载成员 ==========
  const handleSelectSystem = (systemId: string) => {
    const system = availableSystems.find((s) => s.id === systemId);
    setSelectedSystem(system || null);
    if (systemId) {
      loadSystemUsers(systemId);
    } else {
      setSystemUsers([]);
    }
    setCapacityPoints(100);
    setBaUserId(undefined);
    setPmUserId(undefined);
    setTechMgrUserId(undefined);
    setTestMgrUserId(undefined);
    setDevTeamUserIds([]);
  };

  // ========== 添加搭载系统 ==========
  const handleAddSystem = async () => {
    if (!selectedSystem) {
      message.warning('请选择系统');
      return;
    }

    setLoading(true);
    try {
      const data: AddTrainSystemRequest = {
        systemId: selectedSystem.id,
        capacityPoints,
        baUserId,
        pmUserId,
        techMgrUserId,
        testMgrUserId,
        devTeamUserIds,
      };
      await trainService.addSystem(trainId, data);
      message.success('添加成功');
      setAddModalVisible(false);
      setSelectedSystem(null);
      setSystemUsers([]);
      onRefresh();
    } catch (error: any) {
      message.error(error?.message || '添加失败');
    } finally {
      setLoading(false);
    }
  };

  // ========== 打开编辑系统弹窗 ==========
  const handleOpenEditModal = (system: TrainSystemDetail) => {
    setEditingSystem(system);
    setCapacityPoints(system.capacityPoints);
    setBaUserId(system.baUser?.id);
    setPmUserId(system.pmUser?.id);
    setTechMgrUserId(system.techMgrUser?.id);
    setTestMgrUserId(system.testMgrUser?.id);
    setDevTeamUserIds(system.devTeamUsers?.map((u) => u.id) || []);

    loadSystemUsers(system.system.id).then(() => {
      setEditModalVisible(true);
    });
  };

  // ========== 更新搭载系统 ==========
  const handleUpdateSystem = async () => {
    if (!editingSystem) return;

    setLoading(true);
    try {
      const data: UpdateTrainSystemRequest = {
        capacityPoints,
        baUserId,
        pmUserId,
        techMgrUserId,
        testMgrUserId,
        devTeamUserIds,
      };
      await trainService.updateSystem(trainId, editingSystem.id, data);
      message.success('更新成功');
      setEditModalVisible(false);
      setEditingSystem(null);
      onRefresh();
    } catch (error: any) {
      message.error(error?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  // ========== 移除搭载系统 ==========
  const handleRemoveSystem = (system: TrainSystemDetail) => {
    if (system.usedPoints > 0) {
      Modal.warning({
        title: '无法移除',
        content: `该系统已有 ${system.usedPoints} 点需求纳版，无法移除。请先处理已纳版需求。`,
        okText: '知道了',
      });
      return;
    }

    Modal.confirm({
      title: '确认移除',
      icon: <ExclamationCircleOutlined />,
      content: `确认从火车中移除系统【${system.system.name}】？`,
      okText: '确认移除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await trainService.removeSystem(trainId, system.id);
          message.success('移除成功');
          onRefresh();
        } catch (error: any) {
          message.error(error?.message || '移除失败');
        }
      },
    });
  };

  // ========== 表格列定义 ==========
  const columns = [
    {
      title: '系统名称',
      dataIndex: ['system', 'name'],
      key: 'systemName',
      width: 180,
    },
    {
      title: '容量点数',
      key: 'capacity',
      width: 200,
      render: (_: any, record: TrainSystemDetail) => (
        <div>
          <Space>
            <span>{record.usedPoints} / {record.capacityPoints}</span>
            <Progress
              percent={record.usageRate}
              size="small"
              strokeColor={getUsageRateColor(record.usageRate)}
              status={getUsageRateStatus(record.usageRate)}
              format={(percent) => `${percent}%`}
              style={{ width: 100 }}
            />
          </Space>
        </div>
      ),
    },
    {
      title: '业务 BA',
      key: 'baUser',
      width: 120,
      render: (_: any, record: TrainSystemDetail) => (
        record.baUser?.displayName || <Text type="secondary">—</Text>
      ),
    },
    {
      title: '产品经理',
      key: 'pmUser',
      width: 120,
      render: (_: any, record: TrainSystemDetail) => (
        record.pmUser?.displayName || <Text type="secondary">—</Text>
      ),
    },
    {
      title: '技术经理',
      key: 'techMgrUser',
      width: 120,
      render: (_: any, record: TrainSystemDetail) => (
        record.techMgrUser?.displayName || <Text type="secondary">—</Text>
      ),
    },
    {
      title: '测试负责人',
      key: 'testMgrUser',
      width: 120,
      render: (_: any, record: TrainSystemDetail) => (
        record.testMgrUser?.displayName || <Text type="secondary">—</Text>
      ),
    },
    {
      title: '开发团队',
      key: 'devTeamUsers',
      width: 200,
      render: (_: any, record: TrainSystemDetail) => {
        const devs = record.devTeamUsers || [];
        if (devs.length === 0) return <Text type="secondary">—</Text>;
        return (
          <Tooltip
            title={devs.map((d) => d.displayName).join('、')}
            placement="topLeft"
          >
            <span>{devs.length} 人</span>
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: TrainSystemDetail) => (
        isPlanning && (
          <Space>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditModal(record)}
            >
              编辑
            </Button>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveSystem(record)}
            >
              移除
            </Button>
          </Space>
        )
      ),
    },
  ];

  // ========== 过滤可选系统列表 ==========
  // 排除已在火车中的系统
  const filteredAvailableSystems = availableSystems.filter(
    (s) => !systems.some((added) => added.system.id === s.id)
  );

  // ========== 成员角色选项 ==========
  const getRoleOptions = (role: string) => {
    return systemUsers
      .filter((u) => u.role === role || (role === 'DEV' && ['DEV', 'PM'].includes(u.role)))
      .map((u) => ({ value: u.id, label: u.displayName }));
  };

  return (
    <div>
      {/* 操作栏 */}
      <div style={{ marginBottom: 16 }}>
        {isPlanning && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleOpenAddModal}
          >
            添加搭载系统
          </Button>
        )}
      </div>

      {/* 系统列表表格 */}
      {systems.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
            暂无搭载系统
          </div>
        </Card>
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={systems}
          pagination={false}
          size="middle"
        />
      )}

      {/* 添加系统弹窗 */}
      <Modal
        title="添加搭载系统"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          setSelectedSystem(null);
          setSystemUsers([]);
        }}
        onOk={handleAddSystem}
        okText="添加"
        confirmLoading={loading}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>选择系统（必填）</div>
          <Select
            placeholder="请选择系统"
            style={{ width: '100%' }}
            value={selectedSystem?.id}
            onChange={handleSelectSystem}
            options={filteredAvailableSystems.map((s) => ({
              value: s.id,
              label: s.conflictTrain
                ? `${s.name} (已在 ${s.conflictTrain.name})`
                : s.name,
              disabled: !!s.conflictTrain,
            }))}
          />
          {selectedSystem?.conflictTrain && (
            <Text type="warning" style={{ fontSize: 12 }}>
              ⚠️ 该系统已在火车【{selectedSystem.conflictTrain.name}】中
            </Text>
          )}
        </div>

        {selectedSystem && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>本期可用点数（必填）</div>
              <InputNumber
                min={1}
                max={500}
                value={capacityPoints}
                onChange={(value) => setCapacityPoints(value || 100)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>业务 BA</div>
                <Select
                  placeholder="选择BA"
                  value={baUserId}
                  onChange={setBaUserId}
                  options={getRoleOptions('BA')}
                  loading={usersLoading}
                  allowClear
                  showSearch
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>产品经理</div>
                <Select
                  placeholder="选择PM"
                  value={pmUserId}
                  onChange={setPmUserId}
                  options={getRoleOptions('PM')}
                  loading={usersLoading}
                  allowClear
                  showSearch
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>技术经理</div>
                <Select
                  placeholder="选择技术经理"
                  value={techMgrUserId}
                  onChange={setTechMgrUserId}
                  options={getRoleOptions('TECH_MGR')}
                  loading={usersLoading}
                  allowClear
                  showSearch
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>测试负责人</div>
                <Select
                  placeholder="选择测试负责人"
                  value={testMgrUserId}
                  onChange={setTestMgrUserId}
                  options={getRoleOptions('TEST_MGR')}
                  loading={usersLoading}
                  allowClear
                  showSearch
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 8, fontWeight: 500 }}>开发团队（多选）</div>
              <Select
                mode="multiple"
                placeholder="选择开发人员"
                value={devTeamUserIds}
                onChange={setDevTeamUserIds}
                options={getRoleOptions('DEV')}
                loading={usersLoading}
                allowClear
                showSearch
                style={{ width: '100%' }}
              />
            </div>
          </>
        )}
      </Modal>

      {/* 编辑系统弹窗 */}
      <Modal
        title={`编辑系统 - ${editingSystem?.system.name}`}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingSystem(null);
        }}
        onOk={handleUpdateSystem}
        okText="保存"
        confirmLoading={loading}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>本期可用点数</div>
          <InputNumber
            min={1}
            max={500}
            value={capacityPoints}
            onChange={(value) => setCapacityPoints(value || 100)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>业务 BA</div>
            <Select
              placeholder="选择BA"
              value={baUserId}
              onChange={setBaUserId}
              options={getRoleOptions('BA')}
              loading={usersLoading}
              allowClear
              showSearch
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>产品经理</div>
            <Select
              placeholder="选择PM"
              value={pmUserId}
              onChange={setPmUserId}
              options={getRoleOptions('PM')}
              loading={usersLoading}
              allowClear
              showSearch
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>技术经理</div>
            <Select
              placeholder="选择技术经理"
              value={techMgrUserId}
              onChange={setTechMgrUserId}
              options={getRoleOptions('TECH_MGR')}
              loading={usersLoading}
              allowClear
              showSearch
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>测试负责人</div>
            <Select
              placeholder="选择测试负责人"
              value={testMgrUserId}
              onChange={setTestMgrUserId}
              options={getRoleOptions('TEST_MGR')}
              loading={usersLoading}
              allowClear
              showSearch
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>开发团队（多选）</div>
          <Select
            mode="multiple"
            placeholder="选择开发人员"
            value={devTeamUserIds}
            onChange={setDevTeamUserIds}
            options={getRoleOptions('DEV')}
            loading={usersLoading}
            allowClear
            showSearch
            style={{ width: '100%' }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default TrainSystemList;
