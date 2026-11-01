"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { startTransition, useOptimistic } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/shared/category-icon";
import { cn } from "@/lib/utils";
import { en } from "@/messages/en";
import type { CategoryKind, ManagedCategory } from "../domain/types";
import { reorderCategories } from "../server/actions";

// One pass over the text, so a name that looks like a placeholder stays as typed
function fill(template: string, values: Record<string, string>): string {
  return template.replace(
    /\{(name|position|count)\}/g,
    (_match, key: string) => values[key] ?? "",
  );
}

function SortableRow({ category }: { category: ManagedCategory }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex min-h-14 items-center justify-between gap-3 rounded-lg px-3 py-2",
        isDragging && "relative z-10 bg-card shadow-md",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          aria-label={en.categories.order.move.replace(
            "{name}",
            () => category.name,
          )}
          className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <GripVertical aria-hidden="true" className="size-5" />
        </button>
        <CategoryIcon icon={category.icon} color={category.color} />
        <span className="block min-w-0 text-base font-medium break-words">
          {category.name}
        </span>
      </span>
      <Link
        href={`/settings/categories/${category.id}`}
        className="inline-flex min-h-12 shrink-0 items-center text-base underline underline-offset-4"
      >
        {en.categories.edit}
      </Link>
    </li>
  );
}

// A titled list the person can reorder by dragging a handle; the new order is saved at once
export function SortableCategoryList({
  id,
  title,
  kind,
  categories,
}: {
  id: string;
  title: string;
  kind: CategoryKind;
  categories: readonly ManagedCategory[];
}) {
  const [items, setItems] = useOptimistic(categories);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const text = (
    template: string,
    activeId: string | number,
    placeId: string | number,
  ) =>
    fill(template, {
      name: items.find((item) => item.id === activeId)?.name ?? "",
      position: String(items.findIndex((item) => item.id === placeId) + 1),
      count: String(items.length),
    });

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      text(en.categories.order.pickedUp, active.id, active.id),
    onDragOver: ({ active, over }) =>
      text(
        over ? en.categories.order.movedTo : en.categories.order.noTarget,
        active.id,
        over?.id ?? active.id,
      ),
    onDragEnd: ({ active, over }) =>
      text(
        over ? en.categories.order.droppedAt : en.categories.order.noTarget,
        active.id,
        over?.id ?? active.id,
      ),
    onDragCancel: ({ active }) =>
      text(en.categories.order.cancelled, active.id, active.id),
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || over.id === active.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove([...items], oldIndex, newIndex);
    startTransition(async () => {
      setItems(next);
      const result = await reorderCategories(
        kind,
        next.map((item) => item.id),
      );
      if (!result.ok) toast.error(en.categories.order.saveFailed);
    });
  }

  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="px-3 text-base text-muted-foreground">
          {en.categories.empty}
        </p>
      ) : (
        <DndContext
          id={id}
          sensors={sensors}
          collisionDetection={closestCenter}
          accessibility={{
            screenReaderInstructions: {
              draggable: en.categories.order.instructions,
            },
            announcements,
          }}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul>
              {items.map((category) => (
                <SortableRow key={category.id} category={category} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
