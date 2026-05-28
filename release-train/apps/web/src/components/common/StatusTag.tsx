// ========== 统一状态标签 ==========
// 集中处理需求状态、子状态、优先级和班次状态的颜色语义。
import React from 'react';
import { Tag } from 'antd';
import {
  REQ_STATUS_LABELS,
  REQ_SUB_STATUS_LABELS,
  ReqStatus,
  ReqSubStatus,
} from '@release-train/shared';

type StatusTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple';

interface StatusTagProps {
  value: string;
  label?: React.ReactNode;
  type?: 'requirement' | 'subStatus' | 'priority' | 'schedule' | 'custom';
}

const REQUIREMENT_TONES: Record<string, StatusTone> = {
  [ReqStatus.DRAFT]: 'default',
  [ReqStatus.PENDING_REVIEW]: 'warning',
  [ReqStatus.READY]: 'success',
  [ReqStatus.ONBOARDED]: 'purple',
  [ReqStatus.RELEASED]: 'success',
  [ReqStatus.REJECTED]: 'danger',
  [ReqStatus.CANCELLED]: 'default',
};

const SUB_STATUS_TONES: Record<string, StatusTone> = {
  [ReqSubStatus.DEV_IN_PROGRESS]: 'primary',
  [ReqSubStatus.SIT_TESTING]: 'warning',
  [ReqSubStatus.UAT_TESTING]: 'purple',
  [ReqSubStatus.FROZEN]: 'default',
};

const PRIORITY_TONES: Record<string, StatusTone> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'primary',
  P3: 'default',
};

const SCHEDULE_TONES: Record<string, StatusTone> = {
  PLANNING: 'default',
  IN_PROGRESS: 'primary',
  LOCKED_DOWN: 'warning',
  RELEASED: 'success',
  CANCELLED: 'danger',
};

const SCHEDULE_LABELS: Record<string, string> = {
  PLANNING: '规划中',
  IN_PROGRESS: '进行中',
  LOCKED_DOWN: '已封板',
  RELEASED: '已投产',
  CANCELLED: '已取消',
};

function getTone(type: StatusTagProps['type'], value: string): StatusTone {
  if (type === 'requirement') return REQUIREMENT_TONES[value] || 'default';
  if (type === 'subStatus') return SUB_STATUS_TONES[value] || 'default';
  if (type === 'priority') return PRIORITY_TONES[value] || 'default';
  if (type === 'schedule') return SCHEDULE_TONES[value] || 'default';
  return 'default';
}

function getLabel(type: StatusTagProps['type'], value: string): React.ReactNode {
  if (type === 'requirement') return REQ_STATUS_LABELS[value as ReqStatus] || value;
  if (type === 'subStatus') return REQ_SUB_STATUS_LABELS[value as ReqSubStatus] || value;
  if (type === 'priority') return value;
  if (type === 'schedule') return SCHEDULE_LABELS[value] || value;
  return value;
}

const StatusTag: React.FC<StatusTagProps> = ({ value, label, type = 'custom' }) => {
  const tone = getTone(type, value);
  return (
    <Tag className={`rt-status-tag rt-status-${tone}`}>
      {label || getLabel(type, value)}
    </Tag>
  );
};

export default StatusTag;
