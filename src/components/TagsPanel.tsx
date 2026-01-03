import { useState, useMemo } from "react";
import { FileNode } from "@/lib/github";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagsPanelProps {
  files: FileNode[];
  fileContents: Map<string, string>;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onSelectFile: (path: string) => void;
}

function extractTags(content: string): string[] {
  // 匹配 #tag 格式，但排除標題 (# heading)
  const tagRegex = /(?:^|\s)#([a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5_-]*)/g;
  const tags: Set<string> = new Set();
  let match;
  while ((match = tagRegex.exec(content)) !== null) {
    tags.add(match[1]);
  }
  return Array.from(tags);
}

export function TagsPanel({
  files,
  fileContents,
  selectedTag,
  onSelectTag,
  onSelectFile,
}: TagsPanelProps) {
  // 收集所有標籤及其出現次數
  const tagStats = useMemo(() => {
    const stats: Map<string, { count: number; files: string[] }> = new Map();

    fileContents.forEach((content, path) => {
      const tags = extractTags(content);
      tags.forEach((tag) => {
        const existing = stats.get(tag) || { count: 0, files: [] };
        existing.count += 1;
        existing.files.push(path);
        stats.set(tag, existing);
      });
    });

    return Array.from(stats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([tag, data]) => ({ tag, ...data }));
  }, [fileContents]);

  // 根據選中的標籤過濾檔案
  const filteredFiles = useMemo(() => {
    if (!selectedTag) return null;
    const tagData = tagStats.find((t) => t.tag === selectedTag);
    return tagData?.files || [];
  }, [selectedTag, tagStats]);

  if (tagStats.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        <Hash className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>尚無標籤</p>
        <p className="text-xs mt-1">在筆記中使用 #標籤 來組織內容</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 標籤列表 */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">標籤</span>
          {selectedTag && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 ml-auto"
              onClick={() => onSelectTag(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-32">
          <div className="flex flex-wrap gap-1.5">
            {tagStats.map(({ tag, count }) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? "default" : "secondary"}
                className={cn(
                  "cursor-pointer hover:bg-primary/20 transition-colors",
                  selectedTag === tag && "bg-primary text-primary-foreground"
                )}
                onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
              >
                #{tag}
                <span className="ml-1 opacity-60">{count}</span>
              </Badge>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* 過濾結果 */}
      {selectedTag && filteredFiles && (
        <div className="flex-1 overflow-y-auto p-2">
          <p className="text-xs text-muted-foreground px-2 mb-2">
            包含 #{selectedTag} 的檔案：
          </p>
          <div className="space-y-0.5">
            {filteredFiles.map((path) => {
              const name = path.split("/").pop() || path;
              return (
                <button
                  key={path}
                  onClick={() => onSelectFile(path)}
                  className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors truncate"
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// 導出輔助函數供其他組件使用
export { extractTags };
