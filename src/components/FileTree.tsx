import { useState, useCallback } from "react";
import { FileNode } from "@/lib/github";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, RefreshCw, FolderPlus, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileIcon } from "@/components/FileIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileTreeProps {
  files: FileNode[];
  isLoading: boolean;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onRefresh: () => void;
  onCreateFile?: () => void;
  onCreateFolder?: () => void;
  onUploadFiles?: (files: File[]) => Promise<void>;
  repoBaseUrl?: string;
}

export function FileTree({
  files,
  isLoading,
  selectedPath,
  onSelectFile,
  onRefresh,
  onCreateFile,
  onCreateFolder,
  onUploadFiles,
  repoBaseUrl,
}: FileTreeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!onUploadFiles) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    setIsUploading(true);
    try {
      await onUploadFiles(droppedFiles);
    } finally {
      setIsUploading(false);
    }
  }, [onUploadFiles]);
  return (
    <div 
      className="h-full flex flex-col bg-sidebar relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
        <span className="text-sm font-medium text-sidebar-foreground">檔案</span>
        <div className="flex items-center gap-1">
          {(onCreateFile || onCreateFolder) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onCreateFile && (
                  <DropdownMenuItem onClick={onCreateFile}>
                    <File className="w-4 h-4 mr-2" />
                    新增檔案
                  </DropdownMenuItem>
                )}
                {onCreateFolder && (
                  <DropdownMenuItem onClick={onCreateFolder}>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    新增資料夾
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
            {onUploadFiles && (
              <p className="text-xs mt-2 opacity-70">拖放檔案到此處上傳</p>
            )}
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
                repoBaseUrl={repoBaseUrl}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-card px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-foreground">放開以上傳檔案</span>
          </div>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="bg-card px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-foreground">上傳中...</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  level: number;
  repoBaseUrl?: string;
}

// 判斷是否為圖片檔案
const isImageFile = (fileName: string): boolean => {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext);
};

function FileTreeNode({ node, selectedPath, onSelectFile, level, repoBaseUrl }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSelected = selectedPath === node.path;
  const isDir = node.type === "dir";
  const isImage = !isDir && isImageFile(node.name);

  const handleClick = () => {
    if (isDir) {
      setIsExpanded(!isExpanded);
    } else {
      onSelectFile(node.path);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isDir) {
      e.preventDefault();
      return;
    }
    
    // 設置拖曳資料
    e.dataTransfer.setData("text/plain", node.path);
    e.dataTransfer.setData("application/x-file-path", node.path);
    e.dataTransfer.setData("application/x-file-name", node.name);
    e.dataTransfer.setData("application/x-is-image", isImage ? "true" : "false");
    
    // 如果有 repo base URL，設置完整的圖片 URL
    if (repoBaseUrl && isImage) {
      const imageUrl = `${repoBaseUrl}/${node.path}`;
      e.dataTransfer.setData("application/x-image-url", imageUrl);
    }
    
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="animate-slide-in" style={{ animationDelay: `${level * 30}ms` }}>
      <div
        onClick={handleClick}
        draggable={!isDir}
        onDragStart={handleDragStart}
        className={cn(
          "file-tree-item",
          isSelected && "active",
          !isDir && "cursor-grab active:cursor-grabbing"
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
            <FileIcon fileName={node.name} />
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
              repoBaseUrl={repoBaseUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
