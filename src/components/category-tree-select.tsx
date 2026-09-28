"use client";

import * as React from "react";
import { ChevronRight, ChevronDown, Check, X, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { CategoryType, CategoryTypeOptions } from "@/lib/constant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

  categories.forEach((c) => {
    map.set(c.id, { id: c.id, name: c.name, children: [] });
  });

  categories.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function findNodeName(nodes: TreeNode[], id: string): string | undefined {
  for (const node of nodes) {
    if (node.id === id) return node.name;
    const found = findNodeName(node.children, id);
    if (found) return found;
  }
  return undefined;
}

/** 过滤树：保留命中节点及其所有祖先，命中节点的子孙全部保留 */
function filterTree(nodes: TreeNode[], keyword: string): TreeNode[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return nodes;
  const walk = (list: TreeNode[]): TreeNode[] =>
    list.reduce<TreeNode[]>((acc, node) => {
      const hit = node.name.toLowerCase().includes(kw);
      const children = hit ? node.children : walk(node.children);
      if (hit || children.length > 0) {
        acc.push({ ...node, children });
      }
      return acc;
    }, []);
  return walk(nodes);
}

function collectIds(nodes: TreeNode[], out: Set<string> = new Set()): Set<string> {
  nodes.forEach((n) => {
    if (n.children.length > 0) {
      out.add(n.id);
      collectIds(n.children, out);
    }
  });
  return out;
}

/** 找到某节点的所有祖先 id */
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
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  level: number;
  selectedId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? isOpen : undefined}
        className={cn(
          "flex items-center gap-1 rounded-sm py-1.5 pr-2 text-sm cursor-pointer select-none hover:bg-accent hover:text-accent-foreground",
          isSelected && "bg-accent text-accent-foreground font-medium"
        )}
        style={{ paddingLeft: `${level * 14 + 4}px` }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            type="button"
            tabIndex={-1}
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-background/70"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
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
        <span className="flex-1 truncate">{node.name}</span>
        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CategoryTreeSelectProps {
  categories: CategoryItem[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  /** 限定可选的分类类型；不传则根据 categories 中出现的类型自动生成 */
  categoryTypes?: CategoryType[];
  /** 未选中时默认展示的分类类型 */
  defaultCategoryType?: CategoryType;
  className?: string;
}

export function CategoryTreeSelect({
  categories,
  value,
  onChange,
  placeholder = "选择分类",
  allowClear = true,
  disabled = false,
  categoryTypes,
  defaultCategoryType,
  className,
}: CategoryTreeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [keyword, setKeyword] = React.useState("");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // 可选类型：显式传入优先，否则按数据中存在的类型
  const typeOptions = React.useMemo(() => {
    const present = new Set(
      categories.map((c) => c.category_type).filter((t): t is CategoryType => t != null),
    );
    const allowed = categoryTypes ? new Set(categoryTypes) : present;
    return CategoryTypeOptions.filter((o) => allowed.has(o.value) && present.has(o.value));
  }, [categories, categoryTypes]);

  const selectedType = React.useMemo(
    () => categories.find((c) => c.id === value)?.category_type,
    [categories, value],
  );

  const [activeType, setActiveType] = React.useState<CategoryType | undefined>(undefined);

  const resolvedType = React.useMemo(() => {
    const valid = (t?: CategoryType) => t != null && typeOptions.some((o) => o.value === t);
    if (valid(activeType)) return activeType;
    if (valid(selectedType)) return selectedType;
    if (valid(defaultCategoryType)) return defaultCategoryType;
    return typeOptions[0]?.value;
  }, [activeType, selectedType, defaultCategoryType, typeOptions]);

  const fullTree = React.useMemo(() => buildTree(categories), [categories]);
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
  const selectedName = React.useMemo(
    () => (value ? findNodeName(fullTree, value) : undefined),
    [value, fullTree],
  );

  // 打开时：重置搜索、类型跟随已选项，并展开到已选中节点
  React.useEffect(() => {
    if (!open) return;
    setKeyword("");
    setActiveType(undefined);
    const next = new Set<string>();
    if (value) findAncestors(fullTree, value)?.forEach((id) => next.add(id));
    setExpanded(next);
  }, [open, value, fullTree]);

  React.useEffect(() => {
    if (keyword.trim()) setExpanded(collectIds(filtered));
  }, [keyword, filtered]);

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          <span className={cn("truncate", !selectedName && "text-muted-foreground")}>
            {selectedName ?? placeholder}
          </span>
          <div className="flex items-center gap-1">
            {allowClear && value && (
              <span
                className="rounded-sm hover:bg-muted inline-flex"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-[var(--radix-popover-trigger-width)] min-w-[300px] flex-col p-0"
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
        <div
          className="max-h-[300px] overflow-y-auto overscroll-contain p-1.5"
          role="tree"
        >
          {allowClear && !keyword.trim() && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-sm px-2 py-1.5 text-sm cursor-pointer select-none hover:bg-accent hover:text-accent-foreground",
                !value && "bg-accent text-accent-foreground font-medium",
              )}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <span className="w-3.5 shrink-0" />
              <span className="flex-1 truncate">不选择</span>
              {!value && <Check className="h-3.5 w-3.5 shrink-0" />}
            </div>
          )}
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
                selectedId={value}
                expanded={expanded}
                onToggle={toggle}
                onSelect={(id) => {
                  onChange(id);
                  setOpen(false);
                }}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
