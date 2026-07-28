import type { Prisma, PrismaClient, Role } from "@/lib/prisma";
import argon2 from "argon2";

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListInput,
} from "@/lib/validations/user";

type Db = PrismaClient | Prisma.TransactionClient;

export const USER_PAGE_SIZE = 20;

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type UserListItem = Prisma.UserGetPayload<{ select: typeof userListSelect }>;

/** Pure builder for the list `where` clause — unit tested without a DB. */
export function buildUserListWhere(
  input: Pick<UserListInput, "search" | "role" | "isActive">,
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (input.role) {
    where.role = input.role;
  }
  if (input.isActive !== undefined) {
    where.isActive = input.isActive;
  }
  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { email: { contains: input.search, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function countActiveAdmins(db: Db, excludeUserId?: string) {
  return db.user.count({
    where: {
      role: "ADMIN",
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

export async function listUsers(db: Db, input: UserListInput) {
  const limit = input.limit ?? USER_PAGE_SIZE;
  const where = buildUserListWhere(input);

  const rows = await db.user.findMany({
    where,
    select: userListSelect,
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });

  let nextCursor: string | undefined;
  if (rows.length > limit) {
    nextCursor = rows.pop()!.id;
  }

  return { items: rows, nextCursor };
}

export async function createUser(db: Db, input: CreateUserInput) {
  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError("A user with this email already exists", existing.id);
  }

  const passwordHash = await argon2.hash(input.password);

  return db.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash,
      isActive: input.isActive,
    },
    select: userListSelect,
  });
}

async function getUserForUpdate(db: Db, id: string) {
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!user) {
    throw new NotFoundError("User");
  }
  return user;
}

export function assertUserModificationAllowed(
  actorId: string,
  target: { id: string; role: Role; isActive: boolean },
  changes: Pick<UpdateUserInput, "role" | "isActive">,
  remainingActiveAdmins: number,
) {
  const isSelf = actorId === target.id;

  if (isSelf && changes.isActive === false) {
    throw new ForbiddenError("You cannot deactivate your own account");
  }

  if (isSelf && changes.role && changes.role !== "ADMIN") {
    throw new ForbiddenError("You cannot change your own role");
  }

  const willLoseAdmin =
    target.role === "ADMIN" &&
    target.isActive &&
    ((changes.role !== undefined && changes.role !== "ADMIN") ||
      changes.isActive === false);

  if (willLoseAdmin && remainingActiveAdmins === 0) {
    throw new ValidationError(
      "Cannot remove or deactivate the last active administrator",
    );
  }
}

export async function updateUser(
  db: Db,
  actorId: string,
  input: UpdateUserInput,
) {
  const target = await getUserForUpdate(db, input.id);

  if (input.email && input.email !== target.email) {
    const existing = await db.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing && existing.id !== input.id) {
      throw new ConflictError(
        "A user with this email already exists",
        existing.id,
      );
    }
  }

  const remainingActiveAdmins = await countActiveAdmins(db, target.id);

  assertUserModificationAllowed(
    actorId,
    target,
    { role: input.role, isActive: input.isActive },
    remainingActiveAdmins,
  );

  const data: Prisma.UserUpdateInput = {};

  if (input.email !== undefined) {
    data.email = input.email;
  }
  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.role !== undefined) {
    data.role = input.role;
  }
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }
  if (input.password) {
    data.passwordHash = await argon2.hash(input.password);
  }

  return db.user.update({
    where: { id: input.id },
    data,
    select: userListSelect,
  });
}
