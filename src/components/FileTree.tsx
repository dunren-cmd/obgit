import { useState } from "react";
import { FileNode } from "@/lib/github";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileTreeProps {
  files: FileNode[];
  isLoading: boolean;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onRefresh: () => void;
  onCreateFile?: () => void;
}

export function FileTree({
  files,
  isLoading,
  selectedPath,
  onSelectFile,
  onRefresh,
  onCreateFile,
}: FileTreeProps) {
  return (
    <div className="h-full flex flex-col bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
        <span className="text-sm font-medium text-sidebar-foreground">檔案</span>
        <div className="flex items-center gap-1">
          {onCreateFile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onCreateFile}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {isLoading && files.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            載入中...
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
            <File className="w-8 h-8 mb-2 opacity-50" />
            <p>沒有找到 Markdown 檔案</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {files.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                level={0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  level: number;
}

function FileTreeNode({ node, selectedPath, onSelectFile, level }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSelected = selectedPath === node.path;
  const isDir = node.type === "dir";

  const handleClick = () => {
    if (isDir) {
      setIsExpanded(!isExpanded);
    } else {
      onSelectFile(node.path);
    }
  };

  return (
    <div className="animate-slide-in" style={{ animationDelay: `${level * 30}ms` }}>
      <div
        onClick={handleClick}
        className={cn(
          "file-tree-item",
          isSelected && "active"
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {isDir ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-4" />
            <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </>
        )}
        <span className="truncate text-sm">{node.name}</span>
      </div>

      {isDir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
