"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "请选择",
  searchPlaceholder = "搜索",
  emptyText = "暂无数据",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [keyword, setKeyword] = React.useState("");

  const filtered = React.useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return options;
    return options.filter((o) => o.label.toLowerCase().includes(kw));
  }, [options, keyword]);

  const label = React.useMemo(() => {
    if (value.length === 0) return undefined;
    const names = value
      .map((v) => options.find((o) => o.value === v)?.label)
      .filter(Boolean) as string[];
    if (names.length === 0) return `已选 ${value.length} 项`;
    return names.length > 1 ? `${names[0]} 等 ${names.length} 项` : names[0];
  }, [value, options]);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setKeyword("");
      }}
    >
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
        className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0"
        align="start"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-7 border-0 p-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            filtered.map((option) => {
              const checked = value.includes(option.value);
              return (
                <div
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    checked && "font-medium",
                  )}
                  onClick={() => toggle(option.value)}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex-1 truncate">{option.label}</span>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
