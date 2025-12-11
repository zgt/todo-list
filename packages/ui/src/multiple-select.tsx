"use client";

import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { useRef, useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@acme/ui";

export interface TCategory {
  key: string;
  name: string;
}

interface MultipleSelectProps {
  categories: TCategory[];
  customCategory?: (item: TCategory) => ReactNode | string;
  onChange?: (value: TCategory[]) => void;
  defaultValue?: TCategory[];
  placeholder?: string;
}

export const MultipleSelect = ({
  categories,
  customCategory,
  onChange,
  defaultValue,
}: MultipleSelectProps) => {
  const [selected, setSelected] = useState<TCategory[]>(defaultValue ?? []);
  const containerRef = useRef<HTMLDivElement>(null);

  const onSelect = (item: TCategory) => {
    const newSelected = [...selected, item];
    setSelected(newSelected);
    onChange?.(newSelected);
  };

  const onDeselect = (item: TCategory) => {
    const newSelected = selected.filter((i) => i !== item);
    setSelected(newSelected);
    onChange?.(newSelected);
  };

  return (
    <AnimatePresence mode={"popLayout"}>
      <div className={"flex w-full items-center gap-3"}>
        {selected.length > 0 && (
          <motion.div
            layout
            ref={containerRef}
            className={cn(
              "selected no-scrollbar flex min-h-[44px] flex-1 items-center gap-2 overflow-x-hidden scroll-smooth rounded-lg border border-[#21716C] bg-[#102A2A] px-3 py-2",
            )}
          >
            <motion.div layout className="flex items-center gap-2">
              {selected.map((item) => (
                <Tag
                  name={item.key}
                  key={item.key}
                  className={
                    "border border-[#50C878]/50 bg-[#50C878]/20 text-[#50C878] shadow-sm"
                  }
                >
                  <div className="flex items-center gap-2">
                    <motion.span
                      layout
                      className={"text-xs font-medium text-nowrap"}
                    >
                      {item.name}
                    </motion.span>
                    <button
                      className={"transition-opacity hover:opacity-70"}
                      onClick={() => onDeselect(item)}
                      type="button"
                    >
                      <Cross2Icon className="h-3 w-3" />
                    </button>
                  </div>
                </Tag>
              ))}
            </motion.div>
          </motion.div>
        )}
        {categories.length > selected.length && (
          <div className="flex flex-wrap gap-2 rounded-lg border border-[#164B49] bg-[#102A2A]/50 p-2 backdrop-blur-sm">
            {categories
              .filter((item) => !selected.some((i) => i.key === item.key))
              .map((item) => (
                <Tag
                  name={item.key}
                  onClick={() => onSelect(item)}
                  key={item.key}
                  className="border border-[#164B49] bg-[#102A2A] text-[#DCE4E4] hover:border-[#21716C] hover:bg-[#102A2A]/80"
                >
                  {customCategory ? (
                    customCategory(item)
                  ) : (
                    <motion.span
                      layout
                      className={"text-xs font-medium text-nowrap"}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </Tag>
              ))}
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

type TagProps = PropsWithChildren &
  Pick<HTMLAttributes<HTMLDivElement>, "onClick"> & {
    name?: string;
    className?: string;
  };

export const Tag = ({ children, className, name, onClick }: TagProps) => {
  return (
    <motion.div
      layout
      layoutId={name}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full px-3 py-1.5 text-sm transition-all",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};
