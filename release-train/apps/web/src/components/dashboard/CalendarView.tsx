import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Calendar, Typography, Tag, Space, Button, Row, Col, Tooltip, Select } from 'antd';
import { ScheduleProgressItem } from '@release-train/shared';
import trainService from '../../services/train';
import { systemService, SystemOption } from '../../services/system';
import dayjs, { Dayjs } from 'dayjs';

const { Text, Title } = Typography;

/**
 * 月历视图组件 - 双月显示版本火车的班次进度
 * 支持：火车下拉切换、月份切换、班次条连续显示、里程碑事件标记
 */
interface CalendarViewProps {
  schedules?: ScheduleProgressItem[];
}

/**
 * 日历事件 - 班次里程碑（纳版/封板/投产）
 */
interface CalendarEvent {
  type: 'boarding' | 'lockdown' | 'release';
  schedule: ScheduleProgressItem;
  label: string;
}

/**
 * 班次条 - 月历中渲染的彩色时间条
 * rowIndex: 多班次重叠时的行号，0 为第一行
 */
interface ScheduleBar {
  id: string;
  name: string;
  color: string;
  startDate: Dayjs;
  endDate: Dayjs;
  rowIndex: number;
}

/**
 * 事件类型对应的颜色（纳版蓝 / 封板橙 / 投产绿）
 */
const EVENT_COLORS: Record<CalendarEvent['type'], string> = {
  boarding: '#1677ff',
  lockdown: '#fa8c16',
  release: '#52c41a',
};

/**
 * 事件类型对应的中文标签
 */
const EVENT_LABELS: Record<CalendarEvent['type'], string> = {
  boarding: '纳版',
  lockdown: '封板',
  release: '投产',
};

/**
 * 班次条颜色池，按索引轮询分配
 */
const SCHEDULE_COLORS = [
  '#1677ff',
  '#52c41a',
  '#fa8c16',
  '#722ed1',
  '#eb2f96',
  '#13c2c2',
  '#faad14',
  '#f5222d',
];

const CalendarView: React.FC<CalendarViewProps> = ({ schedules: propSchedules }) => {
  // 当前火车下所有班次进度数据
  const [allSchedules, setAllSchedules] = useState<ScheduleProgressItem[]>([]);
  // 可用的火车列表（id + name）
  const [trains, setTrains] = useState<{ id: string; name: string }[]>([]);
  // 可用的系统列表
  const [systems, setSystems] = useState<SystemOption[]>([]);
  // 数据加载状态
  const [loading, setLoading] = useState(true);
  // 当前选中的火车 ID
  const [activeTrainId, setActiveTrainId] = useState<string | null>(null);
  // 当前选中的系统 ID
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  // 双月视图的起始月份
  const [viewDate, setViewDate] = useState<Dayjs>(dayjs());

  // 左月历切换到上一个双月
  const goToPrevMonth = useCallback(() => {
    setViewDate(prev => prev.subtract(1, 'month'));
  }, []);

  // 右月历切换到下一个双月
  const goToNextMonth = useCallback(() => {
    setViewDate(prev => prev.add(1, 'month'));
  }, []);

  // 回到当前月
  const goToToday = useCallback(() => {
    setViewDate(dayjs());
  }, []);

  // 初始化：如果父组件已有数据则直接使用，否则加载
  useEffect(() => {
    if (propSchedules) {
      setAllSchedules(propSchedules);
      setLoading(false);
    } else {
      loadData();
    }
  }, [propSchedules]);

  /**
   * 初始化加载火车列表和系统列表，并加载第一个火车的班次数据
   */
  const loadData = async () => {
    try {
      const [trainsRes, systemsRes] = await Promise.all([
        trainService.list({ pageSize: 100 }),
        systemService.list()
      ]);
      
      let firstTrainId: string | null = null;
      let firstSystemId: string | null = null;
      
      if (trainsRes.success && trainsRes.data?.list) {
        const trainList = trainsRes.data.list.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }));
        setTrains(trainList);
        if (trainList.length > 0) {
          firstTrainId = trainList[0].id;
          setActiveTrainId(firstTrainId);
        }
      }
      
      if (systemsRes) {
        setSystems(systemsRes);
        if (systemsRes.length > 0) {
          firstSystemId = systemsRes[0].id;
          setSelectedSystemId(firstSystemId);
        }
      }
      
      // 加载默认火车的班次进度数据
      if (firstTrainId) {
        const params: Record<string, string> = { trainId: firstTrainId };
        if (firstSystemId) {
          params.systemId = firstSystemId;
        }
        const res = await trainService.getScheduleProgress(params);
        if (res.success && res.data) {
          setAllSchedules(res.data);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoading(false);
    }
  };

  /**
   * 切换火车：根据火车 ID 和系统 ID 重新请求班次进度数据
   */
  const switchTrain = useCallback(async (trainId: string) => {
    setActiveTrainId(trainId);
    setLoading(true);
    try {
      const params: Record<string, string> = { trainId };
      if (selectedSystemId) {
        params.systemId = selectedSystemId;
      }
      const res = await trainService.getScheduleProgress(params);
      if (res.success && res.data) {
        setAllSchedules(res.data);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSystemId]);

  /**
   * 切换系统：重新加载当前选中火车的班次进度数据
   */
  const switchSystem = useCallback(async (systemId: string) => {
    setSelectedSystemId(systemId);
    if (activeTrainId) {
      await switchTrain(activeTrainId);
    }
  }, [activeTrainId, switchTrain]);

  /**
   * 计算班次条的渲染数据
   * - 过滤无 startDate 或 endDate 的班次
   * - 检测时间重叠，分配到不同行（rowIndex）
   * - 按索引从颜色池分配颜色
   */
  const scheduleBars = useMemo((): ScheduleBar[] => {
    const bars: ScheduleBar[] = [];
    // rows[i] = 第 i 行的班次条列表，用于检测重叠
    const rows: ScheduleBar[][] = [];

    allSchedules.forEach((schedule, index) => {
      // 必须有开始日期
      if (!schedule.startDate) return;
      // 结束日期优先用 endDate，回退到 lockdownDate / releaseDate
      const endDateStr = schedule.endDate || schedule.lockdownDate || schedule.releaseDate;
      if (!endDateStr) return;

      const startDate = dayjs(schedule.startDate);
      const endDate = dayjs(endDateStr);

      // 查找第一个不与当前班次重叠的行
      let rowIndex = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const hasOverlap = row.some(bar =>
          !(endDate.isBefore(bar.startDate, 'day') || startDate.isAfter(bar.endDate, 'day'))
        );
        if (!hasOverlap) { rowIndex = i; break; }
        rowIndex = i + 1;
      }

      const bar: ScheduleBar = {
        id: schedule.id,
        name: schedule.scheduleName,
        color: SCHEDULE_COLORS[index % SCHEDULE_COLORS.length], // 轮询取色
        startDate,
        endDate,
        rowIndex,
      };

      // 初始化新行
      if (!rows[rowIndex]) rows[rowIndex] = [];
      rows[rowIndex].push(bar);
      bars.push(bar);
    });

    return bars;
  }, [allSchedules]);

  /**
   * 获取指定日期上的所有里程碑事件（纳版/封板/投产）
   * 不校验事件日期是否在班次区间内，允许孤儿事件
   */
  const getEventsForDate = useCallback((date: Dayjs): CalendarEvent[] => {
    const dateStr = date.format('YYYY-MM-DD');
    const events: CalendarEvent[] = [];

    allSchedules.forEach(schedule => {
      // 检查纳版日（boardingDate）
      if (schedule.boardingDate && schedule.boardingDate.startsWith(dateStr)) {
        events.push({ type: 'boarding', schedule, label: `${schedule.scheduleName} 纳版` });
      }
      // 检查封板日（lockdownDate）
      if (schedule.lockdownDate && schedule.lockdownDate.startsWith(dateStr)) {
        events.push({ type: 'lockdown', schedule, label: `${schedule.scheduleName} 封板` });
      }
      // 检查投产日（releaseDate）
      if (schedule.releaseDate && schedule.releaseDate.startsWith(dateStr)) {
        events.push({ type: 'release', schedule, label: `${schedule.scheduleName} 投产` });
      }
    });

    return events;
  }, [allSchedules]);

  /**
   * Ant Design Calendar 的 cellRender 回调
   * 每格渲染：日期数字 + 班次彩色条 + 事件标签（纳版/封板/投产）
   */
  const cellRender = useCallback((current: Dayjs, info: { type: string }) => {
    if (info.type !== 'date') return null;

    const events = getEventsForDate(current);
    const dateStr = current.format('YYYY-MM-DD');
    const isToday = dateStr === dayjs().format('YYYY-MM-DD');

    // 当前日期上需要渲染的班次条（日期在 startDate ~ endDate 范围内）
    const barsForDate = scheduleBars.filter(bar =>
      !current.isBefore(bar.startDate, 'day') && !current.isAfter(bar.endDate, 'day')
    );

    return (
      <div style={{ position: 'relative', height: '100%', minHeight: 80, padding: '4px 0' }}>
        {/* 日期数字区域 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 4, marginBottom: 2 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              fontSize: 13,
              fontWeight: isToday ? 700 : 400,
              color: isToday ? '#fff' : '#333',
              background: isToday ? '#1677ff' : 'transparent',
              borderRadius: '50%',
            }}
          >
            {current.format('D')}
          </span>
        </div>

        {/* 班次条区域 + 孤儿事件标签 */}
        {/* paddingTop = 最大行数 × 单行高度，为 absolute 的班次条撑出空间 */}
        <div style={{ position: 'relative', paddingTop: barsForDate.length > 0 ? (Math.max(...barsForDate.map(b => b.rowIndex)) + 1) * 20 : 0 }}>
          {barsForDate.map(bar => {
            const isStart = dateStr === bar.startDate.format('YYYY-MM-DD'); // 首日加左圆角 + 班次名
            const isEnd = dateStr === bar.endDate.format('YYYY-MM-DD');     // 末日加右圆角
            const topOffset = bar.rowIndex * 20; // 按行向下偏移

            // 该班次条上的里程碑事件（纳版/封板/投产）
            const barEvents = events.filter(ev => ev.schedule.id === bar.id);

            return (
              <Tooltip
                key={bar.id}
                title={`${bar.name} · ${bar.startDate.format('M/D')} - ${bar.endDate.format('M/D')}${barEvents.length ? ' · ' + barEvents.map(ev => EVENT_LABELS[ev.type]).join(' ') : ''}`}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: topOffset,
                    left: 0,
                    right: 0,
                    height: 18,
                    backgroundColor: bar.color,
                    borderRadius: isStart && isEnd ? 4 : (isStart ? '4px 0 0 4px' : (isEnd ? '0 4px 4px 0' : 0)),
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: isStart ? 6 : 0,
                    paddingRight: 4,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    zIndex: 1,
                  }}
                >
                  {/* 首日显示班次名称 */}
                  {isStart && (
                    <span
                      style={{
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: '18px',
                        flexShrink: 1,
                        minWidth: 0,
                      }}
                    >
                      {bar.name}
                    </span>
                  )}
                  {/* 班次条上的里程碑事件标签（纳版/封板/投产） */}
                  {barEvents.map((ev, i) => (
                    <span
                      key={i}
                      style={{
                        marginLeft: 'auto',
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        background: 'rgba(255,255,255,0.25)',
                        borderRadius: 3,
                        padding: '0 4px',
                        lineHeight: '14px',
                      }}
                    >
                      {EVENT_LABELS[ev.type]}
                    </span>
                  ))}
                </div>
              </Tooltip>
            );
          })}
          {/* 孤儿事件：事件日期不在班次区间内，独立渲染为 Tag，flex 两列排列 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {events
              .filter(ev => !barsForDate.some(bar => bar.id === ev.schedule.id))
              .map((ev, i) => (
                <Tooltip
                  key={`orphan-${i}`}
                  title={`${ev.schedule.scheduleName} · ${ev.schedule.startDate ? dayjs(ev.schedule.startDate).format('M/D') : '?'} - ${ev.schedule.endDate ? dayjs(ev.schedule.endDate).format('M/D') : '?'} · ${EVENT_LABELS[ev.type]}`}
                >
                  <Tag
                    color={EVENT_COLORS[ev.type]}
                    style={{ fontSize: 10, margin: 0, cursor: 'pointer', lineHeight: '16px', padding: '0 4px' }}
                  >
                    {EVENT_LABELS[ev.type]}
                  </Tag>
                </Tooltip>
              ))}
          </div>
        </div>
      </div>
    );
  }, [getEventsForDate, scheduleBars]);

  /**
   * 班次状态 → Tag 颜色映射
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING': return 'default';
      case 'IN_PROGRESS': return 'blue';
      case 'LOCKED_DOWN': return 'orange';
      case 'RELEASED': return 'green';
      default: return 'default';
    }
  };

  /**
   * 班次状态 → 中文文本映射
   */
  const getStatusText = (status: string) => {
    switch (status) {
      case 'PLANNING': return '规划中';
      case 'IN_PROGRESS': return '进行中';
      case 'LOCKED_DOWN': return '已封板';
      case 'RELEASED': return '已投产';
      default: return status;
    }
  };

  if (loading) {
    return <Card loading style={{ minHeight: 400 }} />;
  }

  return (
    <div>
      <style>{`
        .calendar-schedule-view .ant-picker-cell-inner,
              .calendar-schedule-view .ant-picker-calendar-date {
                padding-left: 0 !important;
                padding-right: 0 !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
              }
              .calendar-schedule-view .ant-picker-calendar-date-value {
                display: none !important;
              }
      `}</style>
      <Card
        title={
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={5} style={{ margin: 0 }}>版本火车月历视图</Title>
            </Col>
            <Col>
              <Space size={12}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#666' }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#1677ff' }} />
                  纳版
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#666' }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#fa8c16' }} />
                  封板
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#666' }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#52c41a' }} />
                  投产
                </span>
              </Space>
            </Col>
          </Row>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space size={8}>
                <Text type="secondary" style={{ fontSize: 13 }}>选择系统：</Text>
                <Select
                  value={selectedSystemId}
                  onChange={(value) => switchSystem(value)}
                  style={{ width: 150 }}
                  options={[
                    ...systems.map(system => ({ label: system.name, value: system.id })),
                  ]}
                />
                <Text type="secondary" style={{ fontSize: 13 }}>选择火车：</Text>
                <Select
                  value={activeTrainId || ''}
                  onChange={(value) => switchTrain(value)}
                  style={{ width: 180 }}
                  options={[
                    ...trains.map(train => ({ label: train.name, value: train.id })),
                  ]}
                />
              </Space>
            </Col>
            <Col>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {allSchedules.length} 个班次
              </Text>
            </Col>
          </Row>
        </div>

        <div className="calendar-schedule-view">
          <div style={{ marginBottom: 12 }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <Button size="small" onClick={goToPrevMonth}>&lt;</Button>
                  <Text strong style={{ fontSize: 15, minWidth: 180, textAlign: 'center', display: 'inline-block' }}>
                    {viewDate.format('YYYY年M月')} - {viewDate.add(1, 'month').format('M月')}
                  </Text>
                  <Button size="small" onClick={goToNextMonth}>&gt;</Button>
                  <Button size="small" type="text" onClick={goToToday}>今天</Button>
                </Space>
              </Col>
            </Row>
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <Calendar value={viewDate.date(1)} headerRender={() => null} cellRender={cellRender} onChange={() => {}} />
            </Col>
            <Col span={12}>
              <Calendar value={viewDate.add(1, 'month').date(1)} headerRender={() => null} cellRender={cellRender} onChange={() => {}} />
            </Col>
          </Row>
        </div>
      </Card>

      <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {allSchedules.map(schedule => (
          <Card
            key={schedule.id}
            size="small"
            style={{ flex: 1, minWidth: 320 }}
            title={
              <Space>
                <Text strong>{schedule.scheduleName}</Text>
                <Tag color={getStatusColor(schedule.status)}>{getStatusText(schedule.status)}</Tag>
              </Space>
            }
          >
            <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#666' }}>
              <div>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#1677ff', marginRight: 6 }} />
                纳版日：{schedule.boardingDate ? dayjs(schedule.boardingDate).format('M月D日') : '待定'}
              </div>
              <div>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#fa8c16', marginRight: 6 }} />
                封板日：{schedule.lockdownDate ? dayjs(schedule.lockdownDate).format('M月D日') : '待定'}
              </div>
              <div>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#52c41a', marginRight: 6 }} />
                投产日：{schedule.releaseDate ? dayjs(schedule.releaseDate).format('M月D日') : '待定'}
              </div>
              <div>需求数：{schedule.totalRequirements}</div>
            </div>
          </Card>
        ))}
        {allSchedules.length === 0 && (
          <Card size="small" style={{ flex: 1 }}>
            <Text type="secondary">暂无班次数据</Text>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CalendarView;