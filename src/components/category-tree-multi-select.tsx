"use client";

import * as React from "react";
import { Check, ChevronDown, ChevronRight, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { CategoryType, CategoryTypeOptions } from "@/lib/constant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CategoryItem {
  id: string;
  parent_id: string | null;
  name: string;
  category_type?: CategoryType;
}

interface TreeNode {
  id: string;
  name: string;
  children: TreeNode[];
}

function buildTree(categories: CategoryItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  categories.forEach((c) => map.set(c.id, { id: c.id, name: c.name, children: [] }));
  categories.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) map.get(c.parent_id)!.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function filterTree(nodes: TreeNode[], keyword: string): TreeNode[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return nodes;
  const walk = (list: TreeNode[]): TreeNode[] =>
    list.reduce<TreeNode[]>((acc, node) => {
      const hit = node.name.toLowerCase().includes(kw);
      const children = hit ? node.children : walk(node.children);
      if (hit || children.length > 0) acc.push({ ...node, children });
      return acc;
    }, []);
  return walk(nodes);
}

function collectParentIds(nodes: TreeNode[], out: Set<string> = new Set()): Set<string> {
  nodes.forEach((n) => {
    if (n.children.length > 0) {
      out.add(n.id);
      collectParentIds(n.children, out);
    }
  });
  return out;
}

function findAncestors(nodes: TreeNode[], id: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.id === id) return path;
    const found = findAncestors(node.children, id, [...path, node.id]);
    if (found) return found;
  }
  return null;
}

function TreeNodeItem({
  node,
  level,
  selected,
  expanded,
  onToggleExpand,
  onToggleSelect,
}: {
  node: TreeNode;
  level: number;
  selected: string[];
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const checked = selected.includes(node.id);

  return (
    <div>
      <div
        role="treeitem"
        aria-selected={checked}
        aria-expanded={hasChildren ? isOpen : undefined}
        className={cn(
          "flex cursor-pointer select-none items-center gap-1 rounded-sm py-1.5 pr-2 text-sm hover:bg-accent hover:text-accent-foreground",
          checked && "font-medium",
        )}
        style={{ paddingLeft: `${level * 14 + 4}px` }}
        onClick={() => onToggleSelect(node.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            tabIndex={-1}
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-background/70"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-[1.125rem] shrink-0" />
        )}
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
            checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
          )}
        >
          {checked && <Check className="h-3 w-3" />}
        </span>
        <span className="flex-1 truncate">{node.name}</span>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              selected={selected}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CategoryTreeMultiSelectProps {
  categories: CategoryItem[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** 限定可选的分类类型；不传则根据 categories 中出现的类型自动生成 */
  categoryTypes?: CategoryType[];
  /** 未选中任何分类时默认展示的分类类型 */
  defaultCategoryType?: CategoryType;
}

export function CategoryTreeMultiSelect({
  categories,
  value,
  onChange,
  placeholder = "全部分类",
  className,
  disabled = false,
  categoryTypes,
  defaultCategoryType,
}: CategoryTreeMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [keyword, setKeyword] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [activeType, setActiveType] = React.useState<CategoryType | undefined>(undefined);

  // 可选类型：显式传入优先，否则按数据中存在的类型
  const typeOptions = React.useMemo(() => {
    const present = new Set(
      categories.map((c) => c.category_type).filter((t): t is CategoryType => t != null),
    );
    const allowed = categoryTypes ? new Set(categoryTypes) : present;
    return CategoryTypeOptions.filter((o) => allowed.has(o.value) && present.has(o.value));
  }, [categories, categoryTypes]);

  // 已选项中第一个分类所属的类型
  const selectedType = React.useMemo(() => {
    const first = value.map((id) => categories.find((c) => c.id === id)).find(Boolean);
    return first?.category_type;
  }, [categories, value]);

  const resolvedType = React.useMemo(() => {
    const valid = (t?: CategoryType) => t != null && typeOptions.some((o) => o.value === t);
    if (valid(activeType)) return activeType;
    if (valid(selectedType)) return selectedType;
    if (valid(defaultCategoryType)) return defaultCategoryType;
    return typeOptions[0]?.value;
  }, [activeType, selectedType, defaultCategoryType, typeOptions]);

  const tree = React.useMemo(() => buildTree(categories), [categories]);
  const typedTree = React.useMemo(
    () =>
      buildTree(
        resolvedType == null
          ? categories
          : categories.filter((c) => c.category_type == null || c.category_type === resolvedType),
      ),
    [categories, resolvedType],
  );
  const filtered = React.useMemo(() => filterTree(typedTree, keyword), [typedTree, keyword]);

  const label = React.useMemo(() => {
    if (value.length === 0) return undefined;
    const nameOf = (id: string) => categories.find((c) => c.id === id)?.name;
    const first = nameOf(value[0]);
    if (!first) return `已选 ${value.length} 项`;
    return value.length > 1 ? `${first} 等 ${value.length} 项` : first;
  }, [value, categories]);

  // 打开时：重置搜索、类型跟随已选项，并展开到已选中节点
  React.useEffect(() => {
    if (!open) return;
    setKeyword("");
    setActiveType(undefined);
    const next = new Set<string>();
    value.forEach((id) => findAncestors(tree, id)?.forEach((p) => next.add(p)));
    setExpanded(next);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (keyword.trim()) setExpanded(collectParentIds(filtered));
  }, [keyword, filtered]);

  const toggleExpand = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelect = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !label && "text-muted-foreground")}>
            {label ?? placeholder}
          </span>
          <span className="flex items-center gap-1">
            {value.length > 0 && (
              <span
                className="inline-flex rounded-sm hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-[var(--radix-popover-trigger-width)] min-w-[260px] flex-col p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-2 py-2">
          {typeOptions.length > 1 && (
            <select
              aria-label="分类类型"
              value={resolvedType ?? ""}
              onChange={(e) => {
                setActiveType(Number(e.target.value) as CategoryType);
                setKeyword("");
              }}
              className="h-7 shrink-0 rounded-md border border-input bg-background px-1.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索分类"
            className="h-7 border-0 p-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto overscroll-contain p-1.5" role="tree">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {keyword.trim() ? "未找到匹配分类" : "暂无分类数据"}
            </div>
          ) : (
            filtered.map((node) => (
              <TreeNodeItem
                key={node.id}
                node={node}
                level={0}
                selected={value}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                onToggleSelect={toggleSelect}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
