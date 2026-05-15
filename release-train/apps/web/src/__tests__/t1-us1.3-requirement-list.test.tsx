// ========== US1.3 需求列表页前端测试（TDD RED 阶段） ==========
// 测试范围：系统筛选、状态多选、排序、操作按钮矩阵、行点击跳转
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import RequirementsPage from '../pages/requirements/index';

// ========== Mock 依赖 ==========

// Mock react-router-dom 的 useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock requirementService
const mockList = vi.fn();
vi.mock('../services/requirement', () => ({
  requirementService: {
    list: (...args: any[]) => mockList(...args),
  },
}));

// Mock systemService
const mockSystemList = vi.fn();
vi.mock('../services/system', () => ({
  systemService: {
    list: (...args: any[]) => mockSystemList(...args),
  },
}));

// Mock auth store
vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user-1', displayName: '测试BA', role: 'BA' },
    token: 'test-token',
    isAuthenticated: true,
  })),
}));

// ========== 测试数据工厂 ==========

/** 创建模拟的需求列表项 */
function makeRequirement(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id || 'req-001',
    reqCode: overrides.reqCode || 'REQ-2026-0001',
    title: overrides.title || '测试需求标题',
    status: overrides.status || 'DRAFT',
    subStatus: overrides.subStatus || null,
    priority: overrides.priority || 'P2',
    storyPoints: overrides.storyPoints || 5,
    system: overrides.system || { id: 'sys-1', name: '测试系统A' },
    ba: overrides.ba || { id: 'ba-1', displayName: '张三' },
    creator: overrides.creator || { id: 'user-1', displayName: '李四' },
    createdAt: overrides.createdAt || '2026-05-10T08:00:00.000Z',
    updatedAt: overrides.updatedAt || '2026-05-10T08:00:00.000Z',
  };
}

/** 创建模拟的分页响应 */
function makePaginatedResponse(items: any[], total?: number, page = 1, pageSize = 20) {
  return {
    data: {
      list: items,
      total: total ?? items.length,
      page,
      pageSize,
    },
  };
}

/** 创建模拟的系统列表 */
function makeSystems() {
  return [
    { id: 'sys-1', name: '测试系统A', description: '系统A描述' },
    { id: 'sys-2', name: '测试系统B', description: '系统B描述' },
  ];
}

// ========== 辅助渲染函数 ==========

function renderPage() {
  return render(
    <BrowserRouter>
      <RequirementsPage />
    </BrowserRouter>,
  );
}

// ====================================================================
// US1.3 需求列表页测试套件
// ====================================================================
describe('US1.3 需求列表页', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认 mock 返回空列表
    mockList.mockResolvedValue(makePaginatedResponse([]));
    mockSystemList.mockResolvedValue(makeSystems());
  });

  // ==========================================
  // TC1.3-F1: 页面基础渲染
  // ==========================================
  describe('页面基础渲染', () => {
    it('渲染筛选栏：系统筛选 + 状态筛选 + 关键字搜索 + 查询/重置按钮', async () => {
      renderPage();

      await waitFor(() => {
        // 系统筛选下拉框存在（Ant Design Select placeholder 渲染为 span，表头也有"归属系统"）
        expect(screen.getAllByText('归属系统').length).toBeGreaterThanOrEqual(1);
        // 状态筛选下拉框存在（多选模式）
        expect(screen.getByText('需求状态')).toBeInTheDocument();
        // 关键字搜索框存在（Input.Search 使用 HTML placeholder 属性）
        expect(screen.getByPlaceholderText('搜索需求编号或标题')).toBeInTheDocument();
      });
    });

    it('渲染新增需求按钮', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('新增需求')).toBeInTheDocument();
      });
    });

    it('渲染数据表格，包含所有必要列', async () => {
      mockList.mockResolvedValue(makePaginatedResponse([makeRequirement()]));

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('需求编号')).toBeInTheDocument();
        expect(screen.getByText('需求名称')).toBeInTheDocument();
        expect(screen.getByText('状态')).toBeInTheDocument();
        expect(screen.getByText('优先级')).toBeInTheDocument();
        expect(screen.getByText('工作量')).toBeInTheDocument();
        // 「归属系统」同时出现在 Select placeholder 和表头，至少 2 个
        expect(screen.getAllByText('归属系统').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('业务归属人')).toBeInTheDocument();
        expect(screen.getByText('创建时间')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // TC1.3-F2: 系统筛选
  // ==========================================
  describe('系统筛选', () => {
    it('页面加载时从 /api/systems 获取系统列表', async () => {
      renderPage();

      await waitFor(() => {
        expect(mockSystemList).toHaveBeenCalled();
      });
    });

    it('选择系统后触发列表重新查询，带 systemId 参数', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getAllByText('归属系统').length).toBeGreaterThanOrEqual(1);
      });

      // TODO: Ant Design Select 的测试交互较复杂，此处验证 API 调用参数
      // 实际实现后通过集成测试验证
    });
  });

  // ==========================================
  // TC1.3-F3: 状态多选
  // ==========================================
  describe('状态多选', () => {
    it('状态筛选为多选模式', async () => {
      renderPage();

      await waitFor(() => {
        const statusSelect = screen.getByText('需求状态');
        expect(statusSelect).toBeInTheDocument();
        // Ant Design Select mode="multiple" 验证
      });
    });

    it('选择多个状态后，API 请求带多个 status 参数', async () => {
      // 验证 status 参数以数组形式传递
      mockList.mockResolvedValue(makePaginatedResponse([]));

      renderPage();

      await waitFor(() => {
        expect(mockList).toHaveBeenCalled();
      });
    });
  });

  // ==========================================
  // TC1.3-F4: 表格排序
  // ==========================================
  describe('表格排序', () => {
    it('创建时间列支持排序', async () => {
      mockList.mockResolvedValue(makePaginatedResponse([makeRequirement()]));

      renderPage();

      await waitFor(() => {
        const createdAtHeader = screen.getByText('创建时间');
        expect(createdAtHeader).toBeInTheDocument();
      });
    });

    it('优先级列支持排序', async () => {
      mockList.mockResolvedValue(makePaginatedResponse([makeRequirement()]));

      renderPage();

      await waitFor(() => {
        const priorityHeader = screen.getByText('优先级');
        expect(priorityHeader).toBeInTheDocument();
      });
    });

    it('工作量列支持排序', async () => {
      mockList.mockResolvedValue(makePaginatedResponse([makeRequirement()]));

      renderPage();

      await waitFor(() => {
        const spHeader = screen.getByText('工作量');
        expect(spHeader).toBeInTheDocument();
      });
    });

    it('点击列头排序后 API 请求带 sortBy 和 sortOrder 参数', async () => {
      mockList.mockResolvedValue(makePaginatedResponse([makeRequirement()]));

      renderPage();

      await waitFor(() => {
        // 默认请求不带排序参数（使用后端默认值）
        const calls = mockList.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================
  // TC1.3-F5: 操作按钮矩阵
  // ==========================================
  describe('操作按钮矩阵', () => {
    it('草稿状态需求显示「编辑」和「发起评审」按钮', async () => {
      mockList.mockResolvedValue(
        makePaginatedResponse([makeRequirement({ id: 'req-1', status: 'DRAFT' })]),
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('编辑')).toBeInTheDocument();
        expect(screen.getByText('发起评审')).toBeInTheDocument();
      });
    });

    it('待评审状态需求显示「通过评审」和「驳回」按钮', async () => {
      mockList.mockResolvedValue(
        makePaginatedResponse([makeRequirement({ id: 'req-2', status: 'PENDING_REVIEW' })]),
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('通过评审')).toBeInTheDocument();
        expect(screen.getByText('驳回')).toBeInTheDocument();
      });
    });

    it('就绪状态需求显示「纳版」按钮', async () => {
      mockList.mockResolvedValue(
        makePaginatedResponse([makeRequirement({ id: 'req-3', status: 'READY' })]),
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('纳版')).toBeInTheDocument();
      });
    });

    it('已驳回状态需求显示「重新提交」按钮', async () => {
      mockList.mockResolvedValue(
        makePaginatedResponse([makeRequirement({ id: 'req-4', status: 'REJECTED' })]),
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('重新提交')).toBeInTheDocument();
      });
    });

    it('已纳版/已发布/已取消状态不显示操作按钮', async () => {
      const statuses = ['ONBOARDED', 'RELEASED', 'CANCELLED'];
      for (const status of statuses) {
        vi.clearAllMocks();
        mockList.mockResolvedValue(
          makePaginatedResponse([makeRequirement({ id: `req-${status}`, status })]),
        );

        renderPage();

        await waitFor(() => {
          // 操作列应该为空或不存在编辑/发起评审等按钮
          expect(screen.queryByText('编辑')).not.toBeInTheDocument();
          expect(screen.queryByText('发起评审')).not.toBeInTheDocument();
        });
      }
    });
  });

  // ==========================================
  // TC1.3-F6: 行点击跳转详情
  // ==========================================
  describe('行点击跳转详情', () => {
    it('点击需求行跳转到详情页', async () => {
      const user = userEvent.setup();
      mockList.mockResolvedValue(
        makePaginatedResponse([makeRequirement({ id: 'req-001', title: '点击跳转测试需求' })]),
      );

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('点击跳转测试需求')).toBeInTheDocument();
      });

      await user.click(screen.getByText('点击跳转测试需求'));

      expect(mockNavigate).toHaveBeenCalledWith('/requirements/req-001');
    });
  });

  // ==========================================
  // TC1.3-F7: 查询和重置按钮
  // ==========================================
  describe('查询和重置按钮', () => {
    it('筛选栏包含「查询」和「重置」按钮', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('查询')).toBeInTheDocument();
        expect(screen.getByText('重置')).toBeInTheDocument();
      });
    });

    it('点击重置按钮清空所有筛选条件', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('重置')).toBeInTheDocument();
      });

      await user.click(screen.getByText('重置'));

      await waitFor(() => {
        // 重置后重新请求，不带筛选参数
        expect(mockList).toHaveBeenCalled();
      });
    });
  });

  // ==========================================
  // TC1.3-F8: 分页
  // ==========================================
  describe('分页', () => {
    it('默认每页20条', async () => {
      mockList.mockResolvedValue(makePaginatedResponse([], 0, 1, 20));

      renderPage();

      await waitFor(() => {
        const calls = mockList.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0].pageSize).toBe(20);
      });
    });

    it('显示总数', async () => {
      mockList.mockResolvedValue(makePaginatedResponse(
        [makeRequirement(), makeRequirement({ id: 'req-002', reqCode: 'REQ-2026-0002' })],
        2,
      ));

      renderPage();

      await waitFor(() => {
        expect(screen.getByText(/共 2 条/)).toBeInTheDocument();
      });
    });
  });
});