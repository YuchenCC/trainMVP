// ========== 认证模块业务服务 ==========
// 路由层只做协议适配，认证、查询、安全用户视图在此集中处理。
import bcrypt from 'bcrypt';
import { Role } from '@release-train/shared';
import type { JwtPayload, LoginRequest, SafeUser } from '@release-train/shared';
import { errors } from '../../common/errors/index.js';
import { prisma } from '../../prisma/index.js';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

interface EnvLike {
  NODE_ENV?: string;
  ENABLE_DEV_SEED?: string;
}
interface SafeUserSource {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
}

export interface SeedAdminRequest {
  username: string;
  password: string;
  displayName: string;
  email: string;
}

export interface LoginResult {
  user: SafeUser;
  payload: JwtPayload;
}

export function toSafeUser(user: SafeUserSource): SafeUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    role: user.role as Role,
  };
}

export function buildJwtPayload(user: SafeUser): JwtPayload {
  return {
    sub: user.id,
    username: user.username,
    role: user.role,
  };
}

export function assertStrongPassword(password: string): void {
  if (!PASSWORD_RULE.test(password)) {
    throw errors.badRequest('密码至少8位，且必须包含大写字母、小写字母和数字');
  }
}

export function assertDevSeedEnabled(env: EnvLike = process.env): void {
  if (env.NODE_ENV === 'production') {
    throw errors.forbidden('生产环境禁止使用此接口');
  }

  if (env.ENABLE_DEV_SEED !== 'true') {
    throw errors.forbidden('初始化管理员接口未启用');
  }
}

export async function loginUser(body: LoginRequest): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { username: body.username },
  });

  if (!user?.password) {
    throw errors.unauthorized('用户名或密码错误');
  }

  const isPasswordValid = await bcrypt.compare(body.password, user.password);
  if (!isPasswordValid) {
    throw errors.unauthorized('用户名或密码错误');
  }

  const safeUser = toSafeUser(user);
  return {
    user: safeUser,
    payload: buildJwtPayload(safeUser),
  };
}

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw errors.unauthorized();
  }

  return toSafeUser(user);
}

export async function seedAdmin(body: SeedAdminRequest): Promise<SafeUser> {
  assertDevSeedEnabled();
  assertStrongPassword(body.password);

  const existing = await prisma.user.findUnique({
    where: { username: body.username },
  });

  if (existing) {
    throw errors.conflict('用户名已存在');
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      username: body.username,
      password: hashedPassword,
      displayName: body.displayName,
      email: body.email,
      role: Role.SUPER_ADMIN,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
    },
  });

  return toSafeUser(user);
}
