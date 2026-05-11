import { AppstoreOutlined, CarOutlined, FileTextOutlined } from '@ant-design/icons';
import { Role } from '@release-train/shared';
import type { SafeUser } from '@release-train/shared';

const allMenuItems = [
  {
    key: '/requirements',
    icon: <FileTextOutlined />,
    label: '需求池',
  },
  {
    key: '/trains',
    icon: <CarOutlined />,
    label: '版本火车',
  },
  {
    key: '/systems',
    icon: <AppstoreOutlined />,
    label: '系统管理',
    roles: [Role.SUPER_ADMIN],
  },
];

export function getVisibleMenuItems(user: SafeUser | null) {
  return allMenuItems
    .filter((item) => !item.roles || (user?.role && item.roles.includes(user.role)))
    .map((item) => ({ key: item.key, icon: item.icon, label: item.label }));
}
