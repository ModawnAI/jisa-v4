import { db } from '@/lib/db';
import { documentCategories } from '@/lib/db/schema';
import { eq, and, asc, isNull, sql } from 'drizzle-orm';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { ClearanceLevel, NamespaceType } from '@/lib/constants';

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  minClearanceLevel?: ClearanceLevel;
  namespaceType?: NamespaceType;
  sortOrder?: number;
  color?: string;
  createdBy?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  minClearanceLevel?: ClearanceLevel;
  namespaceType?: NamespaceType;
  isActive?: boolean;
}

interface CategoryWithChildren {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  depth: number;
  path: string;
  minClearanceLevel: ClearanceLevel;
  namespaceType: NamespaceType;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  children: CategoryWithChildren[];
}

export class CategoryService {
  /**
   * Create a new category
   */
  async create(input: CreateCategoryInput) {
    // Check for duplicate slug
    const existing = await db.query.documentCategories.findFirst({
      where: eq(documentCategories.slug, input.slug),
    });

    if (existing) {
      throw new AppError(
        ERROR_CODES.CATEGORY_DUPLICATE,
        `카테고리 슬러그 '${input.slug}'가 이미 존재합니다.`,
        409
      );
    }

    // Calculate depth and path
    let depth = 0;
    let path = '';

    if (input.parentId) {
      const parent = await db.query.documentCategories.findFirst({
        where: eq(documentCategories.id, input.parentId),
      });

      if (!parent) {
        throw new AppError(
          ERROR_CODES.CATEGORY_NOT_FOUND,
          '상위 카테고리를 찾을 수 없습니다.',
          404
        );
      }

      depth = parent.depth + 1;
      path = parent.path ? `${parent.path}/${input.slug}` : input.slug;
    } else {
      path = input.slug;
    }

    // Get next sort order if not provided
    if (input.sortOrder === undefined) {
      const [{ maxOrder }] = await db
        .select({ maxOrder: sql<number>`COALESCE(MAX(${documentCategories.sortOrder}), -1)` })
        .from(documentCategories)
        .where(
          input.parentId
            ? eq(documentCategories.parentId, input.parentId)
            : isNull(documentCategories.parentId)
        );

      input.sortOrder = (maxOrder ?? -1) + 1;
    }

    const [category] = await db
      .insert(documentCategories)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        icon: input.icon,
        color: input.color,
        parentId: input.parentId,
        depth,
        path,
        minClearanceLevel: input.minClearanceLevel || 'basic',
        namespaceType: input.namespaceType || 'company',
        sortOrder: input.sortOrder,
        createdBy: input.createdBy,
      })
      .returning();

    return category;
  }

  /**
   * Get category by ID with children
   */
  async getById(id: string) {
    const category = await db.query.documentCategories.findFirst({
      where: eq(documentCategories.id, id),
      with: {
        children: {
          orderBy: [asc(documentCategories.sortOrder)],
        },
        parent: true,
      },
    });

    if (!category) {
      throw new AppError(ERROR_CODES.CATEGORY_NOT_FOUND, '카테고리를 찾을 수 없습니다.', 404);
    }

    return category;
  }

  /**
   * Get category tree
   */
  async getTree(includeInactive = false): Promise<CategoryWithChildren[]> {
    const conditions = includeInactive ? [] : [eq(documentCategories.isActive, true)];

    const allCategories = await db.query.documentCategories.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [asc(documentCategories.sortOrder)],
    });

    // Build tree structure
    const categoryMap = new Map<string, CategoryWithChildren>(
      allCategories.map((c) => [
        c.id,
        {
          ...c,
          minClearanceLevel: c.minClearanceLevel as ClearanceLevel,
          namespaceType: c.namespaceType as NamespaceType,
          children: [],
        },
      ])
    );

    const rootCategories: CategoryWithChildren[] = [];

    for (const category of categoryMap.values()) {
      if (category.parentId && categoryMap.has(category.parentId)) {
        categoryMap.get(category.parentId)!.children.push(category);
      } else if (!category.parentId) {
        rootCategories.push(category);
      }
    }

    return rootCategories;
  }

  /**
   * Get flat list of categories
   */
  async list(includeInactive = false) {
    const conditions = includeInactive ? [] : [eq(documentCategories.isActive, true)];

    return db.query.documentCategories.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [asc(documentCategories.depth), asc(documentCategories.sortOrder)],
    });
  }

  /**
   * Update category
   */
  async update(id: string, input: UpdateCategoryInput) {
    const existing = await db.query.documentCategories.findFirst({
      where: eq(documentCategories.id, id),
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.CATEGORY_NOT_FOUND, '카테고리를 찾을 수 없습니다.', 404);
    }

    const [category] = await db
      .update(documentCategories)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(documentCategories.id, id))
      .returning();

    return category;
  }

  /**
   * Delete category (soft delete by setting isActive = false)
   */
  async delete(id: string) {
    const existing = await db.query.documentCategories.findFirst({
      where: eq(documentCategories.id, id),
      with: {
        children: true,
      },
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.CATEGORY_NOT_FOUND, '카테고리를 찾을 수 없습니다.', 404);
    }

    if (existing.children.length > 0) {
      throw new AppError(
        ERROR_CODES.CATEGORY_HAS_CHILDREN,
        '하위 카테고리가 있어 삭제할 수 없습니다. 먼저 하위 카테고리를 삭제해주세요.',
        400
      );
    }

    // TODO: Check for documents using this category

    const [category] = await db
      .update(documentCategories)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(documentCategories.id, id))
      .returning();

    return category;
  }

  /**
   * Reorder categories
   */
  async reorder(categoryOrders: { id: string; sortOrder: number }[]) {
    await db.transaction(async (tx) => {
      for (const { id, sortOrder } of categoryOrders) {
        await tx
          .update(documentCategories)
          .set({ sortOrder, updatedAt: new Date() })
          .where(eq(documentCategories.id, id));
      }
    });
  }

  /**
   * Get categories for select dropdown (flat list with indentation info)
   */
  async getSelectOptions(includeInactive = false) {
    const categories = await this.list(includeInactive);

    return categories.map((c) => ({
      value: c.id,
      label: c.depth > 0 ? `${'　'.repeat(c.depth)}└ ${c.name}` : c.name,
      depth: c.depth,
    }));
  }
}

export const categoryService = new CategoryService();
