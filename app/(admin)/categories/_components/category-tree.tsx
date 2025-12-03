'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  Folder,
  FolderOpen,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { CLEARANCE_LABELS, NAMESPACE_TYPE_LABELS } from '@/lib/constants';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  depth: number;
  path: string;
  minClearanceLevel: string;
  namespaceType: string;
  sortOrder: number;
  isActive: boolean;
  children: Category[];
}

export function CategoryTree() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories?format=tree');
      const result = await res.json();
      if (result.success) {
        setCategories(result.data);
        // Auto-expand top-level categories
        const topLevelIds = result.data.map((c: Category) => c.id);
        setExpanded(new Set(topLevelIds));
      }
    } catch (_error) {
      toast.error('카테고리를 불러오는데 실패했습니다.');
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

    // Find the items and their parent
    const flatCategories = flattenCategories(categories);
    const activeItem = flatCategories.find((c) => c.id === active.id);
    const overItem = flatCategories.find((c) => c.id === over.id);

    if (!activeItem || !overItem) return;

    // Only allow reordering within the same parent level
    if (activeItem.depth !== overItem.depth) {
      toast.error('같은 레벨의 카테고리만 순서를 변경할 수 있습니다.');
      return;
    }

    // Optimistic update
    const siblingCategories = flatCategories.filter(
      (c) => c.depth === activeItem.depth && c.path.split('/').slice(0, -1).join('/') === activeItem.path.split('/').slice(0, -1).join('/')
    );

    const oldIndex = siblingCategories.findIndex((c) => c.id === active.id);
    const newIndex = siblingCategories.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder
    const reordered = [...siblingCategories];
    const [removed] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, removed);

    const orders = reordered.map((c, index) => ({
      id: c.id,
      sortOrder: index,
    }));

    try {
      const res = await fetch('/api/categories/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders }),
      });

      if (!res.ok) {
        throw new Error('Reorder failed');
      }

      toast.success('순서가 변경되었습니다.');
      fetchCategories();
    } catch (_error) {
      toast.error('순서 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error?.message || '삭제에 실패했습니다.');
      }

      toast.success('카테고리가 삭제되었습니다.');
      fetchCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">로딩 중...</div>;
  }

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Folder className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">등록된 카테고리가 없습니다.</p>
          <Button onClick={() => router.push('/categories/new')}>
            <Plus className="mr-2 h-4 w-4" weight="bold" />
            첫 카테고리 만들기
          </Button>
        </CardContent>
      </Card>
    );
  }

  const flatList = flattenCategories(categories);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={flatList.map(c => c.id)} strategy={verticalListSortingStrategy}>
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

function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  const traverse = (cats: Category[]) => {
    for (const cat of cats) {
      result.push(cat);
      if (cat.children.length > 0) {
        traverse(cat.children);
      }
    }
  };
  traverse(categories);
  return result;
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
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`overflow-hidden ${!category.isActive ? 'opacity-60' : ''}`}>
        <div
          className="flex items-center gap-2 p-4"
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <DotsSixVertical className="h-5 w-5" />
          </button>

          {hasChildren ? (
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
          ) : (
            <div className="w-4" />
          )}

          <div className="flex-shrink-0">
            {isExpanded && hasChildren ? (
              <FolderOpen className="h-5 w-5 text-amber-500" weight="fill" />
            ) : (
              <Folder className="h-5 w-5 text-amber-500" weight={hasChildren ? 'fill' : 'regular'} />
            )}
          </div>

          <div className="flex flex-1 items-center gap-3 min-w-0">
            <span className="font-medium truncate">{category.name}</span>
            <Badge variant="outline" className="flex-shrink-0">
              {CLEARANCE_LABELS[category.minClearanceLevel] || category.minClearanceLevel}
            </Badge>
            <Badge variant="secondary" className="flex-shrink-0">
              {NAMESPACE_TYPE_LABELS[category.namespaceType as keyof typeof NAMESPACE_TYPE_LABELS] || category.namespaceType}
            </Badge>
            {!category.isActive && (
              <Badge variant="destructive" className="flex-shrink-0">비활성</Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <DotsThree className="h-4 w-4" weight="bold" />
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(category.id)}
              >
                <Trash className="mr-2 h-4 w-4" />
                삭제
              </DropdownMenuItem>
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
