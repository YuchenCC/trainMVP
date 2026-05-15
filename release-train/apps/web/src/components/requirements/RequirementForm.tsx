// ========== 需求表单组件 ==========
// RequirementForm — 新增/编辑需求共用组件（VariantC 双栏布局）
// 左侧：表单区域（系统实时查询 + 依赖搜索） | 右侧：实时预览 + 依赖关系可视化
// 文件名：RequirementForm.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Form, Input, Select, InputNumber, Button, Card, Tag, Space, Typography, Divider, message, Spin, Modal,
} from 'antd';  // Ant Design 组件库
import {
  PlusOutlined,            // 添加依赖按钮图标
  DeleteOutlined,          // 删除依赖按钮图标
  InfoCircleOutlined,      // 实时预览卡片标题图标
  CheckCircleOutlined,     // 依赖满足 ✅ 图标
  WarningOutlined,         // 依赖未满足 ⚠️ 图标
  SaveOutlined,            // 保存草稿按钮图标
  SendOutlined,            // 提交按钮图标
  SearchOutlined,           // 依赖搜索框前缀图标
} from '@ant-design/icons';
import {
  Priority, PRIORITY_LABELS,       // 优先级枚举 + 中文标签
  ReqType, REQ_TYPE_LABELS,         // 需求类型枚举 + 中文标签
  SourceChannel, SOURCE_CHANNEL_LABELS, // 来源渠道枚举 + 中文标签
  ReqStatus,                        // 需求状态枚举
  CreateRequirementRequest,         // 创建请求类型
  UpdateRequirementRequest,         // 编辑请求类型
  RequirementDetail,                // 详情响应类型
  DependencyItem,                   // 依赖项类型
} from '@release-train/shared';
import { requirementService } from '../../services/requirement'; // 需求 API 服务
import { systemService, SystemOption, SystemUserOption } from '../../services/system'; // 系统 API 服务

// ========== Ant Design 子组件解构 ==========
const { TextArea } = Input;          // 多行文本输入（需求描述）
const { Title, Text, Paragraph } = Typography; // 排版组件

// ========== 组件 Props 类型 ==========
interface RequirementFormProps {
  mode: 'create' | 'edit';           // 表单模式：创建/编辑
  initialData?: RequirementDetail;   // 编辑模式下的初始数据
  onCancel?: () => void;             // 取消/返回回调（编辑模式下传入）
  onSuccess?: () => void;             // 创建/编辑成功回调
}

// ========== 状态颜色映射 ==========
// 用于依赖卡片和状态标签的颜色展示
const STATUS_COLORS: Record<ReqStatus, string> = {
  [ReqStatus.DRAFT]: 'default',           // 草稿：灰色
  [ReqStatus.PENDING_REVIEW]: 'processing', // 待评审：蓝色动画
  [ReqStatus.READY]: 'green',             // 已就绪：绿色
  [ReqStatus.REJECTED]: 'red',            // 已拒绝：红色
  [ReqStatus.ONBOARDED]: 'blue',          // 已纳版：蓝色
  [ReqStatus.RELEASED]: 'purple',         // 已投产：紫色
  [ReqStatus.CANCELLED]: 'red',           // 已取消：红色
};

// ========== 状态中文标签映射 ==========
const STATUS_LABELS: Record<ReqStatus, string> = {
  [ReqStatus.DRAFT]: '草稿',
  [ReqStatus.PENDING_REVIEW]: '待评审',
  [ReqStatus.READY]: '已就绪',
  [ReqStatus.REJECTED]: '已拒绝',
  [ReqStatus.ONBOARDED]: '已纳版',
  [ReqStatus.RELEASED]: '已投产',
  [ReqStatus.CANCELLED]: '已取消',
};

/**
 * 需求表单组件（核心组件）
 * 
 * 同时支持创建和编辑两种模式，通过 mode prop 区分。
 * 数据来源全部从后端 API 实时加载（不再硬编码 MOCK 数据）。
 */
const RequirementForm: React.FC<RequirementFormProps> = ({ mode, initialData, onCancel, onSuccess }) => {
  // ========== 表单状态 ==========
  const [form] = Form.useForm();                                     // Ant Design 表单实例
  const [selectedSystem, setSelectedSystem] = useState<string>(''); // 当前选中的系统 ID（用于清空 BA/PM 联动）
  const [deps, setDeps] = useState<DependencyItem[]>([]);           // 已添加的依赖列表
  const [isSubmitting, setIsSubmitting] = useState(false);            // 提交中状态（用于按钮 loading）
  const formValues = Form.useWatch([], form) || {};                 // 实时监听所有表单字段值（用于右侧预览）

  // ========== 远程数据状态 ==========
  const [systems, setSystems] = useState<SystemOption[]>([]);       // 系统搜索结果列表（远程搜索，非全量）
  const [systemsLoading, setSystemsLoading] = useState(false);       // 系统搜索加载中
  const [selectedSystemName, setSelectedSystemName] = useState<string>(''); // 当前选中系统名称（用于右侧预览，远程搜索模式下 systems 数组不包含全量数据）
  const [users, setUsers] = useState<SystemUserOption[]>([]);       // 当前系统的成员列表
  const [usersLoading, setUsersLoading] = useState(false);           // 成员加载中

  // ========== 依赖搜索状态 ==========
  const [depSearchKeyword, setDepSearchKeyword] = useState('');     // 搜索框输入值
  const [depSearchResults, setDepSearchResults] = useState<
    { id: string; reqCode: string; title: string; status: string }[] // 搜索结果列表
  >([]);
  const [depSearchLoading, setDepSearchLoading] = useState(false);    // 搜索加载中
  const depSearchTimer = useRef<ReturnType<typeof setTimeout>>();     // 依赖搜索防抖定时器引用
  const systemSearchTimer = useRef<ReturnType<typeof setTimeout>>();  // 系统搜索防抖定时器引用

  /**
   * 系统远程搜索处理（300ms 防抖）
   * 
   * 改为远程搜索模式的原因：生产环境系统数量可能很多，一次性全量加载
   * 会造成不必要的数据库和网络开销。用户输入关键词后才发起模糊搜索请求。
   * 
   * 注意：React 18 StrictMode 在开发模式下会双重调用 effect，
   * 但此处不再使用 useEffect 加载全量数据，改为 onSearch 触发，
   * 因此不受 StrictMode 双重调用影响。
   */
  const handleSystemSearch = useCallback((keyword: string) => {
    if (systemSearchTimer.current) clearTimeout(systemSearchTimer.current); // 清除上一次的定时器

    if (!keyword || keyword.trim().length === 0) {                          // 空输入 → 清空结果
      setSystems([]);
      return;
    }

    // 300ms 后发起搜索请求
    systemSearchTimer.current = setTimeout(async () => {
      setSystemsLoading(true);                                               // 开启 loading
      try {
        const results = await systemService.list(keyword);                   // 调用 GET /api/systems?q=关键词
        setSystems(results);                                                // 写入搜索结果
      } catch {
        setSystems([]);                                                     // 搜索失败清空
      } finally {
        setSystemsLoading(false);                                           // 关闭 loading
      }
    }, 300); // 300ms 防抖
  }, []);

  /**
   * 加载指定系统的成员列表
   * 
   * 当选中系统 ID 变化时调用（handleSystemChange 触发）。
   * 如果 systemId 为空 → 清空成员列表。
   */
  const loadUsers = useCallback((systemId: string) => {
    if (!systemId) {                          // 系统被清空
      setUsers([]);                           // 清空成员列表
      return;
    }
    setUsersLoading(true);                    // 开启 loading
    systemService.getUsers(systemId)          // 调用 GET /api/systems/:id/users
      .then(setUsers)                        // 成功后写入 state
      .catch(() => setUsers([]))             // 失败时清空
      .finally(() => setUsersLoading(false)); // 关闭 loading
  }, []);

  /**
   * 编辑模式：回填表单初始数据
   * 
   * 当 mode='edit' 时，将 initialData 回填到表单，
   * 同时加载该系统的成员列表用于下拉框。
   */
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      // 回填表单字段
      form.setFieldsValue({
        ...initialData,
        systemId: initialData.system.id,       // 展开 system 对象提取 ID
        baId: initialData.ba.id,               // 展开 ba 对象提取 ID
        pmId: initialData.pm?.id,             // PM 可选，提取 ID
      });
      setSelectedSystem(initialData.system.id);       // 设置选中系统 ID
      setSelectedSystemName(initialData.system.name); // 设置选中系统名称（远程搜索模式下预览用）
      setDeps(initialData.dependencies);               // 回填已有依赖列表
      loadUsers(initialData.system.id);                // 加载该系统成员
    } else if (mode === 'create') {
      // 创建模式：设置默认值
      form.setFieldsValue({ priority: Priority.P2, storyPoints: 5 }); // 默认 P2 + 5 点
    }
  }, [mode, initialData, form, loadUsers]);

  /**
   * 依赖搜索处理（300ms 防抖）
   * 
   * 用户每次输入时重置定时器，300ms 无新输入后才发送请求。
   * 搜索结果会自动过滤掉已添加的依赖项（防重复）。
   */
  const handleDepSearch = useCallback((keyword: string) => {
    setDepSearchKeyword(keyword);                // 更新输入值（实时显示）

    if (depSearchTimer.current) clearTimeout(depSearchTimer.current); // 清除上一次的定时器

    if (!keyword || keyword.trim().length === 0) {                    // 空输入 → 清空结果
      setDepSearchResults([]);
      return;
    }

    // 300ms 后发起搜索请求
    depSearchTimer.current = setTimeout(async () => {
      setDepSearchLoading(true);                                       // 开启搜索 loading
      try {
        const results = await requirementService.search(keyword);      // 调用 GET /api/requirements/search?q=
        // 过滤掉已添加的依赖项
        setDepSearchResults(results.filter((r) => !deps.some((d) => d.id === r.id)));
      } catch {
        setDepSearchResults([]);                                       // 搜索失败清空
      } finally {
        setDepSearchLoading(false);                                    // 关闭搜索 loading
      }
    }, 300); // 300ms 防抖
  }, [deps]); // deps 变化时重新创建 callback

  // ========== 右侧预览数据计算 ==========
  // 根据表单实时值查找对应的显示名称（系统名、用户名等）
  // 注意：systemLabel 使用 selectedSystemName 而非从 systems 数组查找，
  // 因为远程搜索模式下 systems 只包含搜索结果，不包含全量数据
  const systemLabel = selectedSystemName || '—';
  const baLabel = users.find((u) => u.id === formValues.baId)?.displayName || '—';
  const pmLabel = users.find((u) => u.id === formValues.pmId)?.displayName || '—';
  const priorityLabel = PRIORITY_LABELS[formValues.priority as Priority] || '—';
  const reqTypeLabel = REQ_TYPE_LABELS[formValues.reqType as ReqType] || '—';
  const sourceLabel = SOURCE_CHANNEL_LABELS[formValues.sourceChannel as SourceChannel] || '—';

  /**
   * 归属系统切换处理
   * 
   * 选择不同系统时：
   * 1. 更新选中系统 ID 和名称（名称用于右侧预览）
   * 2. 清空 BA/PM 选择（因为旧值属于旧系统）
   * 3. 重新加载新系统的成员列表
   */
  const handleSystemChange = (value: string, option: any) => {
    setSelectedSystem(value);                               // 更新当前系统 ID
    setSelectedSystemName(option?.label || '');             // 更新当前系统名称（远程搜索模式下预览用）
    form.setFieldsValue({ baId: undefined, pmId: undefined }); // 清空 BA/PM
    loadUsers(value);                                       // 加载新系统成员
  };

  /**
   * 添加依赖项（从搜索结果中点击选择）
   * 
   * 校验：最多 20 个依赖 / 不可重复添加
   */
  const handleAddDependency = (item: { id: string; reqCode: string; title: string; status: string }) => {
    if (deps.length >= 20) {                                 // 上限 20 个
      message.warning('最多添加20个依赖');
      return;
    }
    if (deps.find((d) => d.id === item.id)) {               // 防重复
      message.warning('该依赖已添加');
      return;
    }
    // 添加到依赖列表
    setDeps([...deps, { id: item.id, reqCode: item.reqCode, title: item.title, status: item.status as ReqStatus }]);
    setDepSearchKeyword('');                                  // 清空搜索框
    setDepSearchResults([]);                                 // 清空搜索结果
  };

  /**
   * 删除已添加的依赖项
   * 
   * @param id - 依赖需求 ID
   */
  const handleRemoveDependency = (id: string) => {
    setDeps(deps.filter((d) => d.id !== id));                // 过滤移除指定 ID
  };

  /**
   * 构建提交 Payload
   * 
   * 将表单字段 + 依赖列表组装为创建/编辑请求体。
   * 
   * @param values - 表单当前所有字段值
   * @returns 创建或编辑请求体（不含 mode 特有的 version 字段）
   */
  const buildPayload = (values: any): CreateRequirementRequest | UpdateRequirementRequest => ({
    title: values.title,                                     // 需求标题
    description: values.description,                         // 需求描述
    systemId: values.systemId,                               // 归属系统 ID
    priority: values.priority,                               // 优先级
    storyPoints: values.storyPoints,                         // 工作量点数
    baId: values.baId,                                       // 业务归属人 ID
    pmId: values.pmId,                                      // 产品经理 ID（可选）
    reqType: values.reqType,                                // 需求类型（可选）
    sourceChannel: values.sourceChannel,                     // 来源渠道（可选）
    dependencyIds: deps.map((d) => d.id),                   // 依赖需求 ID 列表
  });

  /**
   * 表单提交处理（保存 + 发起评审 / 保存修改）
   * 
   * 由 Ant Design Form 的 onFinish 触发。
   */
  const handleFinish = async (values: any) => {
    setIsSubmitting(true);                                     // 按钮 loading
    try {
      const data = buildPayload(values);                       // 构建请求体
      if (mode === 'edit') {
        (data as UpdateRequirementRequest).version = values.version; // 编辑时附加版本号
        await requirementService.update(initialData!.id, data as UpdateRequirementRequest);
        message.success('需求更新成功');
      } else {
        await requirementService.create(data as CreateRequirementRequest);
        message.success('需求创建成功');
      }
      onSuccess?.(); // 通知父组件（如关闭表单）
    } catch (error: any) {
      const errCode = error?.code;
      if (errCode === 'REQUIREMENT_VERSION_CONFLICT') {
        Modal.warning({
          title: '编辑冲突',
          content: '该需求已被其他人修改，请刷新页面获取最新数据后重新编辑。',
          okText: '刷新页面',
          onOk: () => {
            window.location.reload();
          },
        });
      } else if (errCode === 'REQUIREMENT_CIRCULAR_DEPENDENCY') {
        Modal.warning({
          title: '循环依赖',
          content: '您添加的依赖关系形成了循环引用（A依赖B，B又依赖A）。请检查依赖列表，移除导致循环的需求后重试。',
          okText: '知道了',
        });
      } else {
        message.error(error?.message || '操作失败');
      }
    } finally {
      setIsSubmitting(false);                                  // 恢复按钮
    }
  };

  /**
   * 保存草稿处理
   * 
   * 先校验必填字段，再调用创建/编辑 API。
   * 与 handleFinish 的区别：无 loading 状态（不阻止重复点击）。
   */
  const handleSaveDraft = async () => {
    try {
      await form.validateFields(['title', 'description', 'systemId', 'priority', 'storyPoints', 'baId']); // 校验必填
      const values = form.getFieldsValue();                    // 获取当前表单值
      const data = buildPayload(values);                       // 构建请求体
      if (mode === 'edit') {
        (data as UpdateRequirementRequest).version = values.version;
        await requirementService.update(initialData!.id, data as UpdateRequirementRequest);
      } else {
        await requirementService.create(data as CreateRequirementRequest);
      }
      message.success('草稿已保存');
      onSuccess?.();
    } catch (error: any) {
      const errCode = error?.code;
      if (errCode === 'REQUIREMENT_VERSION_CONFLICT') {
        Modal.warning({
          title: '编辑冲突',
          content: '该需求已被其他人修改，请刷新页面获取最新数据后重新编辑。',
          okText: '刷新页面',
          onOk: () => {
            window.location.reload();
          },
        });
      } else if (errCode === 'REQUIREMENT_CIRCULAR_DEPENDENCY') {
        Modal.warning({
          title: '循环依赖',
          content: '您添加的依赖关系形成了循环引用（A依赖B，B又依赖A）。请检查依赖列表，移除导致循环的需求后重试。',
          okText: '知道了',
        });
      } else {
        message.error(error?.message || '保存失败');
      }
    }
  };

  // ========== JSX 渲染 ==========
  return (
    // 双栏 Flexbox 布局：左表单 + 右预览
    <div style={{ display: 'flex', gap: 24, minHeight: 'calc(100vh - 140px)' }}>
      {/* ======== 左侧：表单区域 ======== */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Ant Design 表单 */}
        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ priority: Priority.P2, storyPoints: 5 }}>
          {mode === 'edit' && <Form.Item name="version" hidden />} {/* 编辑模式：version 隐藏字段 */}

          {/* 需求标题 */}
          <Form.Item name="title" label="需求标题" rules={[{ required: true, message: '请输入需求标题' }, { max: 200, message: '标题不能超过200字' }]}>
            <Input placeholder="简洁描述需求核心内容" />
          </Form.Item>

          {/* 第一行：归属系统 | 优先级 | 工作量 */}
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="systemId" label="归属系统" rules={[{ required: true, message: '请选择归属系统' }]} style={{ flex: 1 }}>
              <Select
                placeholder="输入系统名称搜索"
                loading={systemsLoading}                         // 搜索加载中
                options={systems.map((s) => ({ value: s.id, label: s.name }))} // 数据源：远程搜索结果
                onChange={handleSystemChange}                    // 切换系统时联动清空 BA/PM + 记录名称
                onSearch={handleSystemSearch}                    // 远程搜索：输入关键词后 300ms 防抖请求
                showSearch                                       // 支持搜索输入
                filterOption={false}                             // 关闭本地过滤，完全由远程搜索接管
                notFoundContent={systemsLoading ? <Spin size="small" /> : '输入关键词搜索系统'} // 空状态提示
              />
            </Form.Item>
            <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]} style={{ width: 140 }}>
              <Select options={Object.entries(PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            </Form.Item>
            <Form.Item name="storyPoints" label="工作量" rules={[{ required: true, message: '请输入工作量' }]} style={{ width: 100 }}>
              <InputNumber min={1} max={100} placeholder="点" />
            </Form.Item>
          </div>

          {/* 第二行：业务归属人 | 产品经理 */}
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="baId" label="业务归属人" rules={[{ required: true, message: '请选择业务归属人' }]} style={{ flex: 1 }}>
              <Select
                placeholder={selectedSystem ? '选择BA' : '请先选择系统'}
                loading={usersLoading}                           // 成员加载中
                options={users.filter((u) => u.role === 'BA').map((u) => ({ value: u.id, label: u.displayName }))} // 只显示 BA
                disabled={!selectedSystem}                      // 未选系统时禁用
                showSearch
                filterOption={(input, option) => (option?.label ?? '').includes(input)}
              />
            </Form.Item>
            <Form.Item name="pmId" label="产品经理" style={{ flex: 1 }}>
              <Select
                placeholder={selectedSystem ? '选择PM' : '请先选择系统'}
                loading={usersLoading}
                options={users.filter((u) => u.role === 'PM').map((u) => ({ value: u.id, label: u.displayName }))} // 只显示 PM
                disabled={!selectedSystem}
                allowClear                                       // PM 可选，支持清空
                showSearch
                filterOption={(input, option) => (option?.label ?? '').includes(input)}
              />
            </Form.Item>
          </div>

          {/* 第三行：需求类型 | 来源渠道 */}
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="reqType" label="需求类型" style={{ flex: 1 }}>
              <Select placeholder="可选" options={Object.entries(REQ_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} allowClear />
            </Form.Item>
            <Form.Item name="sourceChannel" label="来源渠道" style={{ flex: 1 }}>
              <Select placeholder="可选" options={Object.entries(SOURCE_CHANNEL_LABELS).map(([v, l]) => ({ value: v, label: l }))} allowClear />
            </Form.Item>
          </div>

          {/* 需求描述 */}
          <Form.Item name="description" label="需求描述" rules={[{ required: true, message: '请输入需求描述' }]}>
            <TextArea rows={6} placeholder="详细描述需求背景、目标、验收标准等" />
          </Form.Item>

          {/* 关联依赖区域 */}
          <Card size="small" title={<span style={{ fontSize: 14 }}>关联依赖（搜索已有需求）</span>}>
            {/* 搜索输入框：输入关键词 → 300ms 防抖 → 展示搜索结果 */}
            <div style={{ marginBottom: 8 }}>
              <Input
                placeholder="输入需求编号或标题搜索..."
                prefix={<SearchOutlined />}
                value={depSearchKeyword}
                onChange={(e) => handleDepSearch(e.target.value)} // 防抖搜索
                allowClear
              />
            </div>
            {/* 搜索结果下拉列表（仅在有输入时显示） */}
            {depSearchKeyword && (
              <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                {depSearchLoading ? (
                  <div style={{ textAlign: 'center', padding: 16 }}><Spin size="small" /></div>
                ) : depSearchResults.length === 0 ? (
                  <div style={{ color: '#999', textAlign: 'center', padding: 12, fontSize: 13 }}>未找到匹配的需求</div>
                ) : (
                  depSearchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddDependency(item)} // 点击添加
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', fontSize: 13,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#e6f7ff')} // 悬停高亮
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Space size={4}>
                        <Tag color="blue" style={{ margin: 0 }}>{item.reqCode}</Tag>
                        <span>{item.title}</span>
                      </Space>
                      <Tag color={STATUS_COLORS[item.status as ReqStatus] || 'default'} style={{ margin: 0, fontSize: 11 }}>
                        {STATUS_LABELS[item.status as ReqStatus] || item.status}
                      </Tag>
                    </div>
                  ))
                )}
              </div>
            )}
            {/* 已添加的依赖列表 */}
            {deps.map((dep) => (
              <div
                key={dep.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 8px', background: '#fafafa', borderRadius: 4,
                  marginBottom: 6, fontSize: 13,
                }}
              >
                <Space size={4}>
                  <Tag color="blue" style={{ margin: 0 }}>{dep.reqCode}</Tag>
                  <span>{dep.title}</span>
                </Space>
                <Space size={4}>
                  <Tag color={STATUS_COLORS[dep.status]} style={{ margin: 0 }}>{STATUS_LABELS[dep.status]}</Tag>
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveDependency(dep.id)} />
                </Space>
              </div>
            ))}
            {/* 空状态提示 */}
            {deps.length === 0 && !depSearchKeyword && (
              <div style={{ color: '#999', textAlign: 'center', padding: 12, fontSize: 13 }}>暂无依赖，上方搜索框搜索已有需求后添加</div>
            )}
          </Card>

          {/* 底部操作按钮 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            {onCancel && <Button onClick={onCancel}>取消</Button>}
            <Button type="default" icon={<SaveOutlined />} onClick={handleSaveDraft}>保存草稿</Button>
            <Button type="primary" icon={<SendOutlined />} htmlType="submit" loading={isSubmitting}>
              {mode === 'create' ? '保存并发起评审' : '发起评审'}
            </Button>
          </div>
        </Form>
      </div>

      {/* ======== 右侧：实时预览区域（sticky 定位，随滚动固定） ======== */}
      <div style={{ width: 360, flexShrink: 0 }}>
        <div style={{ position: 'sticky', top: 16 }}>
          {/* 需求信息预览卡片 */}
          <Card size="small" title={<Space><InfoCircleOutlined /> 实时预览</Space>} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <Tag color="default">草稿</Tag>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>REQ-2026-XXXX</Text>
            </div>
            <Title level={5} style={{ margin: '0 0 12px' }}>{formValues.title || '（未填写标题）'}</Title>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div><Text type="secondary">归属系统</Text><div>{systemLabel}</div></div>
              <div><Text type="secondary">优先级</Text><div><Tag color={formValues.priority === Priority.P0 || formValues.priority === Priority.P1 ? 'red' : 'default'}>{priorityLabel}</Tag></div></div>
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
                <Paragraph ellipsis={{ rows: 4, expandable: false }} style={{ fontSize: 13, marginTop: 4, color: '#333' }}>
                  {formValues.description}
                </Paragraph>
              </>
            )}
          </Card>

          {/* 依赖关系可视化卡片 */}
          <Card size="small" title={<Space><InfoCircleOutlined /> 依赖关系</Space>}>
            {deps.length === 0 ? (
              <div style={{ color: '#999', textAlign: 'center', padding: 16, fontSize: 13 }}>无关联依赖</div>
            ) : (
              <div>
                {deps.map((dep) => (
                  <div
                    key={dep.id}
                    style={{
                      padding: '8px 10px',
                      // 已就绪/已纳版 → 绿色背景（依赖已满足），其他 → 黄色背景（依赖未满足）
                      background: dep.status === ReqStatus.READY || dep.status === ReqStatus.ONBOARDED ? '#f6ffed' : '#fff7e6',
                      borderRadius: 6, marginBottom: 8,
                      borderLeft: `3px solid ${dep.status === ReqStatus.READY || dep.status === ReqStatus.ONBOARDED ? '#52c41a' : '#faad14'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                      {/* 依赖状态图标：满足 ✅ / 未满足 ⚠️ */}
                      {dep.status === ReqStatus.READY || dep.status === ReqStatus.ONBOARDED
                        ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        : <WarningOutlined style={{ color: '#faad14' }} />
                      }
                      <Text strong style={{ fontSize: 12 }}>{dep.reqCode}</Text>
                      <Tag color={STATUS_COLORS[dep.status]} style={{ margin: 0, fontSize: 11 }}>{STATUS_LABELS[dep.status]}</Tag>
                    </div>
                    <div style={{ fontSize: 13, marginTop: 2, paddingLeft: 22 }}>{dep.title}</div>
                  </div>
                ))}
                {/* 分隔线：依赖需求在上方，当前需求在下方 */}
                <div style={{ textAlign: 'center', padding: '8px 0', color: '#999', fontSize: 12, borderTop: '1px dashed #e8e8e8', marginTop: 4 }}>
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

export default RequirementForm;
