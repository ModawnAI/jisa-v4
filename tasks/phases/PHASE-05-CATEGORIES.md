# Phase 5: Category Management

**Duration**: 2 days
**Dependencies**: Phase 4 complete
**Deliverables**: Dynamic category CRUD with hierarchical support

---

## Task 5.1: Category Service Layer

### 5.1.1 Category Service

**File**: `lib/services/category.service.ts`

```typescript
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { AppError, ERROR_CODES } from '@/lib/errors';

export interface CreateCategoryInput {
  organizationId: string;
  parentId?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  config?: CategoryConfig;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  config?: CategoryConfig;
  isActive?: boolean;
}

interface CategoryConfig {
  extractFields?: string[];
  defaultClearance?: 'basic' | 'standard' | 'advanced';
  ragSettings?: {
    chunkSize?: number;
    chunkOverlap?: number;
  };
}

export class CategoryService {
  /**
   * Create a new category
   */
  async create(input: CreateCategoryInput) {
    // Check for duplicate slug
    const existing = await db.query.categories.findFirst({
      where: and(
        eq(categories.organizationId, input.organizationId),
        eq(categories.slug, input.slug)
      ),
    });

    if (existing) {
      throw new AppError(
        ERROR_CODES.CATEGORY_DUPLICATE,
        `카테고리 슬러그 '${input.slug}'가 이미 존재합니다.`
      );
    }

    // Get next sort order if not provided
    if (input.sortOrder === undefined) {
      const lastCategory = await db.query.categories.findFirst({
        where: and(
          eq(categories.organizationId, input.organizationId),
          input.parentId
            ? eq(categories.parentId, input.parentId)
            : isNull(categories.parentId)
        ),
        orderBy: [asc(categories.sortOrder)],
      });

      input.sortOrder = lastCategory ? lastCategory.sortOrder + 1 : 0;
    }

    const [category] = await db
      .insert(categories)
      .values(input)
      .returning();

    return category;
  }

  /**
   * Get category by ID with children
   */
  async getById(id: string) {
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
      with: {
        children: {
          orderBy: [asc(categories.sortOrder)],
        },
        parent: true,
      },
    });

    if (!category) {
      throw new AppError(ERROR_CODES.CATEGORY_NOT_FOUND, '카테고리를 찾을 수 없습니다.');
    }

    return category;
  }

  /**
   * Get category tree for organization
   */
  async getTree(organizationId: string) {
    // Get all categories
    const allCategories = await db.query.categories.findMany({
      where: and(
        eq(categories.organizationId, organizationId),
        eq(categories.isActive, true)
      ),
      orderBy: [asc(categories.sortOrder)],
    });

    // Build tree structure
    const categoryMap = new Map(allCategories.map((c) => [c.id, { ...c, children: [] as any[] }]));
    const rootCategories: any[] = [];

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
  async list(organizationId: string, includeInactive = false) {
    const conditions = [eq(categories.organizationId, organizationId)];

    if (!includeInactive) {
      conditions.push(eq(categories.isActive, true));
    }

    return db.query.categories.findMany({
      where: and(...conditions),
      orderBy: [asc(categories.sortOrder)],
    });
  }

  /**
   * Update category
   */
  async update(id: string, input: UpdateCategoryInput) {
    // Check if it's a system category
    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.CATEGORY_NOT_FOUND, '카테고리를 찾을 수 없습니다.');
    }

    if (existing.isSystem && input.isActive === false) {
      throw new AppError(
        ERROR_CODES.CATEGORY_SYSTEM,
        '시스템 카테고리는 비활성화할 수 없습니다.'
      );
    }

    const [category] = await db
      .update(categories)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return category;
  }

  /**
   * Delete category (soft delete)
   */
  async delete(id: string) {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
      with: {
        children: true,
      },
    });

    if (!existing) {
      throw new AppError(ERROR_CODES.CATEGORY_NOT_FOUND, '카테고리를 찾을 수 없습니다.');
    }

    if (existing.isSystem) {
      throw new AppError(
        ERROR_CODES.CATEGORY_SYSTEM,
        '시스템 카테고리는 삭제할 수 없습니다.'
      );
    }

    if (existing.children.length > 0) {
      throw new AppError(
        ERROR_CODES.CATEGORY_HAS_CHILDREN,
        '하위 카테고리가 있어 삭제할 수 없습니다.'
      );
    }

    const [category] = await db
      .update(categories)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
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
          .update(categories)
          .set({ sortOrder, updatedAt: new Date() })
          .where(eq(categories.id, id));
      }
    });
  }
}

export const categoryService = new CategoryService();
```

### Tests for 5.1
- [ ] Create category with slug uniqueness
- [ ] Get category tree
- [ ] Update category
- [ ] Delete with children check
- [ ] Reorder categories

---

## Task 5.2: Category API Routes

### 5.2.1 Categories CRUD

**File**: `app/api/categories/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { categoryService } from '@/lib/services/category.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';
import { slugify } from '@/lib/utils';

const createCategorySchema = z.object({
  name: z.string().min(1, '카테고리 이름은 필수입니다'),
  slug: z.string().optional(),
  parentId: z.string().uuid().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  config: z.object({
    extractFields: z.array(z.string()).optional(),
    defaultClearance: z.enum(['basic', 'standard', 'advanced']).optional(),
    ragSettings: z.object({
      chunkSize: z.number().optional(),
      chunkOverlap: z.number().optional(),
    }).optional(),
  }).optional(),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const format = searchParams.get('format'); // 'tree' or 'flat'

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
  }

  const categories = format === 'tree'
    ? await categoryService.getTree(organizationId)
    : await categoryService.list(organizationId);

  return NextResponse.json(categories);
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { organizationId, ...data } = body;

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
  }

  const validated = createCategorySchema.parse(data);

  const category = await categoryService.create({
    organizationId,
    ...validated,
    slug: validated.slug || slugify(validated.name),
  });

  return NextResponse.json(category, { status: 201 });
});
```

**File**: `app/api/categories/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { categoryService } from '@/lib/services/category.service';
import { withErrorHandler } from '@/lib/errors/handler';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
  config: z.object({
    extractFields: z.array(z.string()).optional(),
    defaultClearance: z.enum(['basic', 'standard', 'advanced']).optional(),
    ragSettings: z.object({
      chunkSize: z.number().optional(),
      chunkOverlap: z.number().optional(),
    }).optional(),
  }).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withErrorHandler(async (
  request: NextRequest,
  context: RouteParams
) => {
  const { id } = await context.params;

  const category = await categoryService.getById(id);
  return NextResponse.json(category);
});

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context: RouteParams
) => {
  const { id } = await context.params;
  const body = await request.json();
  const validated = updateCategorySchema.parse(body);

  const category = await categoryService.update(id, validated);
  return NextResponse.json(category);
});

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context: RouteParams
) => {
  const { id } = await context.params;

  await categoryService.delete(id);
  return NextResponse.json({ success: true });
});
```

### Tests for 5.2
- [ ] GET categories tree
- [ ] GET categories flat list
- [ ] POST create category
- [ ] PATCH update category
- [ ] DELETE category

---

## Task 5.3: Category Pages

### 5.3.1 Category List Page

**File**: `app/(admin)/categories/page.tsx`

```typescript
import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/page-header';
import { CategoryTree } from './_components/category-tree';
import { Button } from '@/components/ui/button';
import { Plus } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoriesPage() {
  return (
    <div>
      <PageHeader
        title="카테고리 관리"
        description="문서를 분류하기 위한 카테고리를 관리합니다."
      >
        <Button asChild>
          <Link href="/categories/new">
            <Plus className="mr-2 h-4 w-4" />
            카테고리 추가
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<CategorySkeleton />}>
        <CategoryTree />
      </Suspense>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
```

### 5.3.2 Category Tree Component

**File**: `app/(admin)/categories/_components/category-tree.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DotsThree,
  Pencil,
  Trash,
  CaretRight,
  CaretDown,
  DotsSixVertical,
  Plus,
} from '@phosphor-icons/react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  isSystem: boolean;
  documentCount: number;
  children: Category[];
}

export function CategoryTree() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    if (!user?.organizationId) return;

    try {
      const res = await fetch(
        `/api/categories?organizationId=${user.organizationId}&format=tree`
      );
      const data = await res.json();
      setCategories(data);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reorder logic here
    // Call API to update sort order
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return;

    await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    fetchCategories();
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="mb-4 text-muted-foreground">등록된 카테고리가 없습니다.</p>
          <Button onClick={() => router.push('/categories/new')}>
            <Plus className="mr-2 h-4 w-4" />
            첫 카테고리 만들기
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={categories} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              expanded={expanded}
              onToggle={toggleExpand}
              onDelete={handleDelete}
              level={0}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface CategoryItemProps {
  category: Category;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  level: number;
}

function CategoryItem({
  category,
  expanded,
  onToggle,
  onDelete,
  level,
}: CategoryItemProps) {
  const router = useRouter();
  const hasChildren = category.children.length > 0;
  const isExpanded = expanded.has(category.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="overflow-hidden">
        <div
          className="flex items-center gap-2 p-4"
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground"
          >
            <DotsSixVertical className="h-5 w-5" />
          </button>

          {hasChildren && (
            <button
              onClick={() => onToggle(category.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <CaretDown className="h-4 w-4" />
              ) : (
                <CaretRight className="h-4 w-4" />
              )}
            </button>
          )}

          <div className="flex flex-1 items-center gap-3">
            <span className="font-medium">{category.name}</span>
            <Badge variant="outline">{category.documentCount}개 문서</Badge>
            {category.isSystem && (
              <Badge variant="secondary">시스템</Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <DotsThree className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/categories/${category.id}`)}>
                <Pencil className="mr-2 h-4 w-4" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/categories/new?parentId=${category.id}`)}>
                <Plus className="mr-2 h-4 w-4" />
                하위 카테고리 추가
              </DropdownMenuItem>
              {!category.isSystem && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(category.id)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          {category.children.map((child) => (
            <CategoryItem
              key={child.id}
              category={child}
              expanded={expanded}
              onToggle={onToggle}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 5.3.3 Category Form

**File**: `app/(admin)/categories/new/page.tsx`

```typescript
import { PageHeader } from '@/components/admin/page-header';
import { CategoryForm } from '../_components/category-form';

interface PageProps {
  searchParams: Promise<{ parentId?: string }>;
}

export default async function NewCategoryPage({ searchParams }: PageProps) {
  const { parentId } = await searchParams;

  return (
    <div>
      <PageHeader
        title="카테고리 추가"
        description="새로운 카테고리를 생성합니다."
      />
      <CategoryForm parentId={parentId} />
    </div>
  );
}
```

### Tests for 5.3
- [ ] Category tree rendering
- [ ] Drag and drop reorder
- [ ] Expand/collapse
- [ ] Delete confirmation
- [ ] Category form

---

## Phase Completion Checklist

- [ ] Category service with CRUD
- [ ] API routes working
- [ ] Tree view with drag-drop
- [ ] Hierarchical categories
- [ ] Create/Edit forms
- [ ] System category protection
- [ ] All tests passing

---

## Next Phase

→ [Phase 6: Template Management](./PHASE-06-TEMPLATES.md)
