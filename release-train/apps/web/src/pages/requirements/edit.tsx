// ========== 编辑需求页面（US1.2） ==========
// 路由 /requirements/:id/edit，复用 RequirementForm 组件
// 加载已有需求数据 → 预填表单 → 保存时带 version 乐观锁
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { RequirementDetail } from '@release-train/shared';
import { requirementService } from '../../services/requirement';
import RequirementForm from '../../components/requirements/RequirementForm';

const RequirementEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [requirement, setRequirement] = useState<RequirementDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRequirement = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await requirementService.getById(id);
      setRequirement(res.data ?? null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequirement();
  }, [fetchRequirement]);

  const handleSuccess = () => {
    navigate(`/requirements/${id}`);
  };

  const handleCancel = () => {
    navigate(`/requirements/${id}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (error || !requirement) {
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle={error || '需求不存在'}
        extra={
          <Button onClick={() => navigate('/requirements')}>
            返回需求列表
          </Button>
        }
      />
    );
  }

  return (
    <RequirementForm
      mode="edit"
      initialData={requirement}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default RequirementEditPage;