import { useEffect, useMemo } from "react";
import {
  hotkeysCoreFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from "@headless-tree/core";
import { useTree } from "@headless-tree/react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Filter } from "lucide-react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

import { useSession } from "~/auth/client";
import { useTRPC } from "~/trpc/react";
import { useCategoryFilter } from "./category-filter-context";
import { Tree, TreeItem } from "./tree";

export function CategoryFilter() {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { data: categories } = useQuery({
    ...trpc.category.all.queryOptions(),
    enabled: !!session?.user,
  });
  const { selectedCategoryIds, setSelectedCategoryIds } = useCategoryFilter();

  console.log("CategoryFilter: categories fetched:", categories?.length);

  const { itemMap, rootChildren } = useMemo(() => {
    if (!categories) return { itemMap: {}, rootChildren: [] };

    const map: Record<string, any> = {};
    const roots: string[] = [];

    // First pass: create items
    categories.forEach((cat) => {
      map[cat.id] = { ...cat, children: [] };
    });

    // Second pass: link parent/children
    categories.forEach((cat) => {
      if (cat.parentId && map[cat.parentId]) {
        map[cat.parentId].children.push(cat.id);
      } else {
        roots.push(cat.id);
      }
    });

    // Sort function (by sortOrder)
    const sortFn = (aId: string, bId: string) =>
      (map[aId]?.sortOrder ?? 0) - (map[bId]?.sortOrder ?? 0);

    roots.sort(sortFn);
    Object.values(map).forEach((item: any) => {
      item.children.sort(sortFn);
    });

    console.log("CategoryFilter: map built, roots:", roots);
    return { itemMap: map, rootChildren: roots };
  }, [categories]);

  const tree = useTree<any>({
    rootItemId: "root",
    features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature],
    dataLoader: {
      getItem: (itemId: string) => {
        console.log("CategoryFilter: getItem called for:", itemId);
        if (itemId === "root")
          return {
            id: "root",
            children: rootChildren,
            isFolder: true,
            name: "Root",
          };
        return itemMap[itemId];
      },
      getChildren: (itemId: string) => {
        console.log("CategoryFilter: getChildren called for:", itemId);
        if (itemId === "root") return rootChildren;
        return itemMap[itemId]?.children || [];
      },
    },
    getItemName: (item: any) => item.name,
    isItemFolder: (item: any) =>
      item.isFolder ||
      (item.children && item.children.length > 0) ||
      item.id === "root",
    initialState: {
      selectedItems: selectedCategoryIds,
      expandedItems: ["root"],
    },
    onSelectChange: (items: string[]) => {
      setSelectedCategoryIds(items);
    },
  });

  // Rebuild the tree whenever categories data changes to ensure the dataLoader's
  // new results (itemMap, rootChildren) are picked up by the tree instance.
  useEffect(() => {
    if (categories && categories.length > 0) {
      console.log(
        "CategoryFilter: Data arrived, rootChildren size:",
        rootChildren.length,
      );
      tree.rebuildTree();
      console.log(
        "CategoryFilter: After rebuild, items count:",
        tree.getItems().length,
      );
    }
  }, [categories, tree, rootChildren.length]);

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1 rounded-full border-dashed"
        >
          <Filter className="mr-2 size-4" />
          Category
          {selectedCategoryIds.length > 0 && (
            <div className="bg-primary text-primary-foreground ml-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
              {selectedCategoryIds.length}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-2" align="start">
        {console.log(
          "CategoryFilter: Rendering items, count:",
          tree.getItems().length,
        )}
        <Tree tree={tree} className="space-y-0.5">
          {tree.getItems().map((item) => (
            <TreeItem key={item.getId()} item={item} asChild>
              <div
                className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center rounded-md px-2 py-1 text-sm"
                onClick={() => item.toggleSelect()}
              >
                {/* Expansion chevron */}
                <div
                  className={cn(
                    "hover:bg-muted/50 mr-1 flex size-4 items-center justify-center rounded-sm transition-colors",
                    !item.isFolder() && "pointer-events-none opacity-0",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.isExpanded() ? item.collapse() : item.expand();
                  }}
                >
                  <ChevronDown
                    className={cn(
                      "size-3 transition-transform",
                      !item.isExpanded() && "-rotate-90",
                    )}
                  />
                </div>

                {/* Color indicator */}
                <div
                  className="mr-2 size-2.5 rounded-full ring-1 ring-black/10 ring-inset dark:ring-white/20"
                  style={{
                    backgroundColor: itemMap[item.getId()]?.color || "gray",
                  }}
                />

                {/* Name */}
                <span className="flex-1 truncate">{item.getItemName()}</span>

                {/* Selection check */}
                {selectedCategoryIds.includes(item.getId()) && (
                  <Check className="text-primary ml-2 size-4" />
                )}
              </div>
            </TreeItem>
          ))}
        </Tree>
      </PopoverContent>
    </Popover>
  );
}
