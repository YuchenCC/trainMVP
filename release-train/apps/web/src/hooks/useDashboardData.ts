import { useState, useEffect } from 'react';
import { message } from 'antd';
import {
  RequirementStatsResponse,
  MyTodosResponse,
  ScheduleProgressItem,
  RequirementListItem,
  EmergencyChangeItem,
  ReqStatus
} from '@release-train/shared';
import requirementService from '../services/requirement';
import trainService from '../services/train';

interface DashboardData {
  stats: RequirementStatsResponse | null;
  todos: MyTodosResponse;
  schedules: ScheduleProgressItem[];
  emergencyChanges: EmergencyChangeItem[];
  loading: boolean;
}

interface UseDashboardDataOptions {
  systemId?: string;
  filterPendingEmergency?: boolean;
}

export const useDashboardData = (options: UseDashboardDataOptions = {}) => {
  const [data, setData] = useState<DashboardData>({
    stats: null,
    todos: {},
    schedules: [],
    emergencyChanges: [],
    loading: true
  });

  const loadData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }));
      
      const statsParams = options.systemId ? { systemIds: options.systemId } : undefined;
      const [statsRes, todosRes, schedulesRes, emergencyRes] = await Promise.all([
        requirementService.getStats(statsParams),
        requirementService.getMyTodos(),
        trainService.getScheduleProgress(),
        requirementService.getEmergencyChanges()
      ]);

      let emergencyList: EmergencyChangeItem[] = [];
      if (emergencyRes.success && emergencyRes.data) {
        emergencyList = options.filterPendingEmergency
          ? (emergencyRes.data.list || []).filter((e: EmergencyChangeItem) => e.status === 'PENDING')
          : emergencyRes.data.list || [];
      }

      setData({
        stats: statsRes.success && statsRes.data ? statsRes.data : null,
        todos: todosRes.success && todosRes.data ? todosRes.data : {},
        schedules: schedulesRes.success && schedulesRes.data ? schedulesRes.data : [],
        emergencyChanges: emergencyList,
        loading: false
      });
    } catch (error) {
      message.error('加载仪表盘数据失败');
      console.error('Failed to load dashboard data:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadData();
  }, [options.systemId]);

  return {
    ...data,
    refresh: loadData
  };
};

// 获取已就绪需求列表
export const useReadyRequirements = (systemId?: string) => {
  const [requirements, setRequirements] = useState<RequirementListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequirements = async () => {
      try {
        setLoading(true);
        const params = systemId ? { status: 'READY' as ReqStatus, systemId } : { status: 'READY' as ReqStatus };
      const res = await requirementService.list(params);
      if (res.success && res.data) {
        setRequirements(res.data.list || []);
      }
      } catch (error) {
        console.error('Failed to load ready requirements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRequirements();
  }, [systemId]);

  return { requirements, loading };
};

// 获取关键日期
export const useKeyDates = (schedules: ScheduleProgressItem[]) => {
  const getKeyDates = () => {
    if (!schedules.length) return [];
    const activeSchedule = schedules.find(s => s.status === 'IN_PROGRESS' || s.currentPhase === 'testing');
    if (!activeSchedule) return [];

    const dates = [];
    if (activeSchedule.boardingDate) {
      dates.push({
        label: '纳版截止',
        date: new Date(activeSchedule.boardingDate),
        status: 'warning' as const,
        type: 'boarding' as const
      });
    }
    if (activeSchedule.lockdownDate) {
      dates.push({
        label: '封板',
        date: new Date(activeSchedule.lockdownDate),
        status: 'error' as const,
        type: 'lockdown' as const
      });
    }
    if (activeSchedule.releaseDate) {
      dates.push({
        label: '投产',
        date: new Date(activeSchedule.releaseDate),
        status: 'success' as const,
        type: 'release' as const
      });
    }
    return dates;
  };

  return getKeyDates();
};

// 计算纳版截止倒计时
export const useLockdownCountdown = (schedules: ScheduleProgressItem[]) => {
  const getCountdown = () => {
    if (!schedules.length) return null;
    const activeSchedule = schedules.find(s => s.status === 'IN_PROGRESS' || s.currentPhase === 'testing');
    if (!activeSchedule || !activeSchedule.lockdownDate) return null;
    
    const lockdownDate = new Date(activeSchedule.lockdownDate);
    const now = new Date();
    const diffTime = lockdownDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      days: diffDays,
      date: lockdownDate,
      expired: diffDays < 0
    };
  };

  return getCountdown();
};
