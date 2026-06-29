import type { Prisma, PrismaClient } from "@prisma/client";

import { NotFoundError } from "@/lib/errors";
import type {
  ClientListInput,
  CreateClientInput,
  UpdateClientInput,
} from "@/lib/validations/client";

type Db = PrismaClient | Prisma.TransactionClient;

export const CLIENT_PAGE_SIZE = 20;

/** Pure builder for the list `where` clause — unit tested without a DB. */
export function buildClientListWhere(
  input: Pick<ClientListInput, "status" | "search">,
): Prisma.ClientWhereInput {
  const where: Prisma.ClientWhereInput = {};
  if (input.status) {
    where.status = input.status;
  }
  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { contactEmail: { contains: input.search, mode: "insensitive" } },
      { industry: { contains: input.search, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listClients(db: Db, input: ClientListInput) {
  const limit = input.limit ?? CLIENT_PAGE_SIZE;
  const where = buildClientListWhere(input);

  const rows = await db.client.findMany({
    where,
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ name: "asc" }, { id: "asc" }],
    include: { _count: { select: { jobs: true } } },
  });

  let nextCursor: string | undefined;
  if (rows.length > limit) {
    nextCursor = rows.pop()!.id;
  }

  return { items: rows, nextCursor };
}

export async function getClient(db: Db, id: string) {
  const client = await db.client.findUnique({
    where: { id },
    include: {
      _count: { select: { jobs: true } },
      jobs: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          openings: true,
          createdAt: true,
        },
      },
    },
  });
  if (!client) {
    throw new NotFoundError("Client");
  }
  return client;
}

export async function createClient(db: Db, input: CreateClientInput) {
  return db.client.create({
    data: {
      name: input.name,
      contactEmail: input.contactEmail ?? null,
      industry: input.industry ?? null,
      status: input.status,
    },
  });
}

export async function updateClient(db: Db, input: UpdateClientInput) {
  const { id, ...rest } = input;
  await ensureClientExists(db, id);

  return db.client.update({
    where: { id },
    data: {
      ...(rest.name !== undefined ? { name: rest.name } : {}),
      ...(rest.contactEmail !== undefined
        ? { contactEmail: rest.contactEmail ?? null }
        : {}),
      ...(rest.industry !== undefined
        ? { industry: rest.industry ?? null }
        : {}),
      ...(rest.status !== undefined ? { status: rest.status } : {}),
    },
  });
}

async function ensureClientExists(db: Db, id: string) {
  const existing = await db.client.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError("Client");
  }
}
