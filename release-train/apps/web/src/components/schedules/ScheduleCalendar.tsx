import React, { useCallback } from 'react';
import { Calendar, Typography, Tag, Tooltip, Card, Row, Col, Button, Space } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

const { Text } = Typography;

/**
 * 班次日历数据接口
 */
interface ScheduleCalendarData {
  id: string;
  name: string;
  scheduleName?: string; // 兼容 ScheduleProgressItem
  startDate: string | null;
  endDate: string | null;
  boardingDate: string | null;  // 纳版日（第一节点）
  sitDate: string | null;       // SIT提测日（第三节点）
  uatDate: string | null;       // UAT提测日（第四节点）
  lockdownDate: string | null;  // 封板日（第五节点）
  releaseDate: string | null;   // 投产日（第六节点）
}

/**
 * 班次日历组件 - 显示单个班次的月历视图
 * 支持：班次彩色时间条、里程碑事件标记（纳版/SIT/UAT/封板/投产）、月份切换
 */
interface ScheduleCalendarProps {
  schedule: ScheduleCalendarData;
}

/**
 * 事件类型对应的颜色
 */
const EVENT_COLORS: Record<string, string> = {
  boarding: '#faad14',   // 纳版 - 黄色
  sit: '#722ed1',        // SIT提测 - 紫色
  uat: '#eb2f96',        // UAT提测 - 粉红
  lockdown: '#1890ff',   // 封板 - 蓝色
  release: '#52c41a',    // 投产 - 绿色
};

/**
 * 事件类型对应的中文标签
 */
const EVENT_LABELS: Record<string, string> = {
  boarding: '纳版',
  sit: 'SIT',
  uat: 'UAT',
  lockdown: '封板',
  release: '投产',
};

/**
 * 班次颜色
 */
const SCHEDULE_COLOR = '#1677ff';

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ schedule }) => {
  const [viewDate, setViewDate] = React.useState(dayjs(schedule.startDate || dayjs()));

  // 上一个月份
  const goToPrevMonth = useCallback(() => {
    setViewDate(prev => prev.subtract(1, 'month'));
  }, []);

  // 下一个月份
  const goToNextMonth = useCallback(() => {
    setViewDate(prev => prev.add(1, 'month'));
  }, []);

  // 回到班次开始日期所在月份
  const goToStartMonth = useCallback(() => {
    setViewDate(dayjs(schedule.startDate || dayjs()));
  }, [schedule.startDate]);

  /**
   * 获取指定日期上的里程碑事件（纳版/SIT/UAT/封板/投产）
   * 顺序：纳版 -> 开始 -> SIT提测 -> UAT提测 -> 封板 -> 投产 -> 结束
   */
  const getEventsForDate = useCallback((date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    const events: { type: string; label: string }[] = [];

    // 检查纳版日（第一节点）
    if (schedule.boardingDate && schedule.boardingDate.startsWith(dateStr)) {
      events.push({ type: 'boarding', label: '纳版' });
    }
    // 检查SIT提测日（第三节点）
    if (schedule.sitDate && schedule.sitDate.startsWith(dateStr)) {
      events.push({ type: 'sit', label: 'SIT' });
    }
    // 检查UAT提测日（第四节点）
    if (schedule.uatDate && schedule.uatDate.startsWith(dateStr)) {
      events.push({ type: 'uat', label: 'UAT' });
    }
    // 检查封板日（第五节点）
    if (schedule.lockdownDate && schedule.lockdownDate.startsWith(dateStr)) {
      events.push({ type: 'lockdown', label: '封板' });
    }
    // 检查投产日（第六节点）
    if (schedule.releaseDate && schedule.releaseDate.startsWith(dateStr)) {
      events.push({ type: 'release', label: '投产' });
    }

    return events;
  }, [schedule]);

  /**
   * 判断日期是否在班次区间内
   */
  const isInScheduleRange = useCallback((date: Dayjs): boolean => {
    if (!schedule.startDate || !schedule.endDate) return false;
    const start = dayjs(schedule.startDate);
    const end = dayjs(schedule.endDate);
    return !date.isBefore(start, 'day') && !date.isAfter(end, 'day');
  }, [schedule.startDate, schedule.endDate]);

  /**
   * Ant Design Calendar 的 cellRender 回调
   * 每格渲染：日期数字 + 班次彩色条 + 事件标签
   */
  const cellRender = useCallback((current: Dayjs, info: { type: string }) => {
    if (info.type !== 'date') return null;

    const events = getEventsForDate(current);
    const dateStr = current.format('YYYY-MM-DD');
    const isToday = dateStr === dayjs().format('YYYY-MM-DD');
    const inRange = isInScheduleRange(current);
    const isStart = schedule.startDate && dateStr === dayjs(schedule.startDate).format('YYYY-MM-DD');
    const isEnd = schedule.endDate && dateStr === dayjs(schedule.endDate).format('YYYY-MM-DD');

    // 显示的行高
    const showBar = inRange || events.length > 0;
    const rowHeight = events.length > 0 ? events.length * 18 : 18;

    return (
      <div style={{ position: 'relative', height: '100%', minHeight: 60, padding: '4px 0' }}>
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

        {/* 班次条 + 事件标签 */}
        {showBar && (
          <div style={{ position: 'relative', paddingTop: rowHeight }}>
            {/* 班次时间条 - 仅在区间内显示 */}
            {inRange && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 16,
                  backgroundColor: SCHEDULE_COLOR,
                  borderRadius: isStart && isEnd ? 4 : (isStart ? '4px 0 0 4px' : (isEnd ? '0 4px 4px 0' : 0)),
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: isStart ? 6 : 0,
                  paddingRight: 4,
                  overflow: 'hidden',
                }}
              >
                {/* 首日显示班次名称 */}
                {isStart && (
                  <span
                    style={{
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '16px',
                      flexShrink: 1,
                      minWidth: 0,
                    }}
                  >
                    {schedule.scheduleName}
                  </span>
                )}
              </div>
            )}

            {/* 里程碑事件标签 - 可能在区间外 */}
            {events.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: inRange ? 0 : 0 }}>
                {events.map((ev, i) => (
                  <Tooltip key={i} title={`${schedule.scheduleName} · ${EVENT_LABELS[ev.type]}`}>
                    <Tag
                      color={EVENT_COLORS[ev.type]}
                      style={{ fontSize: 10, margin: 0, cursor: 'pointer', lineHeight: '14px', padding: '0 4px' }}
                    >
                      {ev.label}
                    </Tag>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [getEventsForDate, isInScheduleRange, schedule]);

  return (
    <>
      <style>{`
        .schedule-calendar-view .ant-picker-cell-inner,
        .schedule-calendar-view .ant-picker-calendar-date {
          padding-left: 0 !important;
          padding-right: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        .schedule-calendar-view .ant-picker-calendar-date-value {
          display: none !important;
        }
      `}</style>
      <Card
        title={
          <Row justify="space-between" align="middle">
            <Col>
              <Text strong style={{ fontSize: 15 }}>班次月历视图</Text>
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
        {/* 月份切换器 */}
        <div style={{ marginBottom: 12 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Button size="small" onClick={goToPrevMonth}>&lt;</Button>
                <Text strong style={{ fontSize: 15, minWidth: 120, textAlign: 'center', display: 'inline-block' }}>
                  {viewDate.format('YYYY年M月')}
                </Text>
                <Button size="small" onClick={goToNextMonth}>&gt;</Button>
                <Button size="small" type="text" onClick={goToStartMonth}>起始月</Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 单月日历 */}
        <div className="schedule-calendar-view">
          <Calendar
            value={viewDate.date(1)}
            headerRender={() => null}
            cellRender={cellRender}
            onChange={() => {}}
          />
        </div>
      </Card>
    </>
  );
};

export default ScheduleCalendar;
