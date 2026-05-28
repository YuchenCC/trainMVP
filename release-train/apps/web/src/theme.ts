// ========== 全局主题 Token ==========
// 集中管理 Ant Design 与业务样式共用的颜色、圆角、阴影和间距。
import type { ThemeConfig } from 'antd';

export const appColors = {
  pageBg: '#f7f9fc',
  surface: '#ffffff',
  surfaceMuted: '#f8fafc',
  border: '#e4e7ec',
  divider: '#eef1f5',
  text: '#172033',
  textSecondary: '#667085',
  textTertiary: '#98a2b3',
  primary: '#2563eb',
  primaryBg: '#eff6ff',
  success: '#16a34a',
  successBg: '#ecfdf3',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  purple: '#7c3aed',
  purpleBg: '#f5f3ff',
  frozen: '#64748b',
  frozenBg: '#f1f5f9',
};

export const appRadii = {
  control: 6,
  card: 8,
  modal: 10,
};

export const appShadows = {
  card: '0 1px 2px rgba(16, 24, 40, 0.04)',
  hover: '0 4px 12px rgba(16, 24, 40, 0.08)',
};

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: appColors.primary,
    colorSuccess: appColors.success,
    colorWarning: appColors.warning,
    colorError: appColors.danger,
    colorInfo: appColors.primary,
    colorText: appColors.text,
    colorTextSecondary: appColors.textSecondary,
    colorBorder: appColors.border,
    colorBgLayout: appColors.pageBg,
    colorBgContainer: appColors.surface,
    borderRadius: appRadii.control,
    borderRadiusLG: appRadii.card,
    boxShadow: appShadows.card,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  components: {
    Layout: {
      bodyBg: appColors.pageBg,
      headerBg: appColors.surface,
      siderBg: appColors.surface,
    },
    Menu: {
      itemBorderRadius: appRadii.control,
      itemSelectedBg: appColors.primaryBg,
      itemSelectedColor: appColors.primary,
      itemHoverBg: appColors.surfaceMuted,
    },
    Card: {
      borderRadiusLG: appRadii.card,
      headerBg: appColors.surface,
    },
    Table: {
      headerBg: appColors.surfaceMuted,
      headerColor: appColors.textSecondary,
      rowHoverBg: appColors.primaryBg,
      borderColor: appColors.divider,
    },
    Button: {
      borderRadius: appRadii.control,
      controlHeight: 32,
    },
    Input: {
      borderRadius: appRadii.control,
    },
    Select: {
      borderRadius: appRadii.control,
    },
    Modal: {
      borderRadiusLG: appRadii.modal,
    },
  },
};
