"use client";

import * as React from "react";
import { ChevronRight, ChevronDown, Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CategoryItem {
  id: string;
  parent_id: string | null;
  name: string;
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

function TreeNodeItem({
  node,
  level,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  level: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-sm px-2 py-1.5 text-sm cursor-pointer select-none hover:bg-accent hover:text-accent-foreground",
          isSelected && "bg-accent text-accent-foreground font-medium"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (hasChildren) {
            setOpen((v) => !v);
          }
          onSelect(node.id);
        }}
      >
        {hasChildren && (
          <span className="shrink-0 text-muted-foreground">
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        )}
        {!hasChildren && <span className="w-3.5 shrink-0" />}
        <span className="flex-1 truncate">{node.name}</span>
        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
      </div>
      {hasChildren && open && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
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
}

export function CategoryTreeSelect({
  categories,
  value,
  onChange,
  placeholder = "选择分类",
  allowClear = true,
  disabled = false,
}: CategoryTreeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const tree = React.useMemo(() => buildTree(categories), [categories]);
  const selectedName = React.useMemo(
    () => (value ? findNodeName(tree, value) : undefined),
    [value, tree]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
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
            <ChevronRight className="h-4 w-4 shrink-0 opacity-50 rotate-90" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start">
        {tree.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            暂无分类数据
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {allowClear && (
              <div
                className={cn(
                  "flex items-center gap-1 rounded-sm px-2 py-1.5 text-sm cursor-pointer select-none hover:bg-accent hover:text-accent-foreground",
                  !value && "bg-accent text-accent-foreground font-medium"
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
            {tree.map((node) => (
              <TreeNodeItem
                key={node.id}
                node={node}
                level={0}
                selectedId={value}
                onSelect={(id) => {
                  onChange(id);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
