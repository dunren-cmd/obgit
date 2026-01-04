import { useState, useCallback } from "react";
import { FileNode } from "@/lib/github";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, RefreshCw, FolderPlus, Upload, Loader2, MoreHorizontal, Trash2, Edit2, FilePlus, FolderInput } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileIcon } from "@/components/FileIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FileTreeProps {
  files: FileNode[];
  isLoading: boolean;
  isLoaded?: boolean;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  onRefresh: () => void;
  onCreateFile?: () => void;
  onCreateFolder?: () => void;
  onUploadFiles?: (files: File[], targetFolder?: string) => Promise<void>;
  onDeleteFile?: (path: string, sha: string) => Promise<boolean>;
  onRenameFile?: (oldPath: string) => void;
  onMoveFile?: (sourcePath: string, targetPath: string) => Promise<boolean>;
  onCreateFileInFolder?: (folderPath: string) => void;
  onCreateFolderInFolder?: (folderPath: string) => void;
  repoBaseUrl?: string;
}

export function FileTree({
  files,
  isLoading,
  isLoaded = true,
  selectedPath,
  onSelectFile,
  onRefresh,
  onCreateFile,
  onCreateFolder,
  onUploadFiles,
  onDeleteFile,
  onRenameFile,
  onMoveFile,
  onCreateFileInFolder,
  onCreateFolderInFolder,
  repoBaseUrl,
}: FileTreeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 本地檔案或內部檔案都可以拖入
    if (e.dataTransfer.types.includes("Files") || e.dataTransfer.types.includes("application/x-file-path")) {
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
      setIsDragOverRoot(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 判斷是否在根區域（檔案列表區域但不在任何節點上）
    if (e.dataTransfer.types.includes("application/x-file-path") || e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = e.dataTransfer.types.includes("Files") ? "copy" : "move";
    }
  }, []);

  // 根區域專用的拖放處理
  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("application/x-file-path") || e.dataTransfer.types.includes("Files")) {
      setIsDragOverRoot(true);
      setDragOverPath(null); // 清除子目錄的 dragOver 狀態
    }
  }, []);

  const handleRootDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverRoot(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setIsDragOverRoot(false);

    // 檢查是否為本地檔案
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0 && onUploadFiles) {
      setIsUploading(true);
      try {
        await onUploadFiles(droppedFiles);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // 內部檔案移動到根目錄
    if (onMoveFile) {
      const sourcePath = e.dataTransfer.getData("application/x-file-path");
      const fileName = e.dataTransfer.getData("application/x-file-name");
      
      if (sourcePath && fileName) {
        // 計算目標路徑（根目錄）
        const targetPath = fileName;
        
        // 如果已經在根目錄，不需要移動
        if (sourcePath === targetPath || !sourcePath.includes("/")) {
          return;
        }

        setIsUploading(true);
        try {
          await onMoveFile(sourcePath, targetPath);
        } finally {
          setIsUploading(false);
        }
      }
    }
  }, [onUploadFiles, onMoveFile]);

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
      <div 
        className="flex-1 overflow-y-auto py-2 px-2"
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleDrop}
      >
        {!isLoaded && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
            <Folder className="w-8 h-8 mb-3 opacity-50" />
            <p className="mb-3">點擊載入檔案列表</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              載入檔案
            </Button>
          </div>
        ) : isLoading && files.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
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
          <>
            <div className="space-y-0.5">
              {files.map((node) => (
                <FileTreeNode
                  key={node.path}
                  node={node}
                  selectedPath={selectedPath}
                  onSelectFile={onSelectFile}
                  level={0}
                  repoBaseUrl={repoBaseUrl}
                  onDeleteFile={onDeleteFile}
                  onRenameFile={onRenameFile}
                  onMoveFile={onMoveFile}
                  onCreateFileInFolder={onCreateFileInFolder}
                  onCreateFolderInFolder={onCreateFolderInFolder}
                  onUploadFiles={onUploadFiles}
                  dragOverPath={dragOverPath}
                  setDragOverPath={setDragOverPath}
                  setIsUploading={setIsUploading}
                />
              ))}
            </div>
          </>
        )}
      </div>


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
  onDeleteFile?: (path: string, sha: string) => Promise<boolean>;
  onRenameFile?: (oldPath: string) => void;
  onMoveFile?: (sourcePath: string, targetPath: string) => Promise<boolean>;
  onCreateFileInFolder?: (folderPath: string) => void;
  onCreateFolderInFolder?: (folderPath: string) => void;
  onUploadFiles?: (files: File[], targetFolder?: string) => Promise<void>;
  dragOverPath: string | null;
  setDragOverPath: (path: string | null) => void;
  setIsUploading: (uploading: boolean) => void;
}

// 判斷是否為圖片檔案
const isImageFile = (fileName: string): boolean => {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext);
};

function FileTreeNode({ 
  node, 
  selectedPath, 
  onSelectFile, 
  level, 
  repoBaseUrl,
  onDeleteFile,
  onRenameFile,
  onMoveFile,
  onCreateFileInFolder,
  onCreateFolderInFolder,
  onUploadFiles,
  dragOverPath,
  setDragOverPath,
  setIsUploading,
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const isSelected = selectedPath === node.path;
  const isDir = node.type === "dir";
  const isImage = !isDir && isImageFile(node.name);
  const isDragOver = dragOverPath === node.path && isDir;

  const handleClick = () => {
    if (isDir) {
      setIsExpanded(!isExpanded);
    } else {
      onSelectFile(node.path);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    // 設置拖曳資料
    e.dataTransfer.setData("text/plain", node.path);
    e.dataTransfer.setData("application/x-file-path", node.path);
    e.dataTransfer.setData("application/x-file-name", node.name);
    e.dataTransfer.setData("application/x-is-image", isImage ? "true" : "false");
    e.dataTransfer.setData("application/x-is-dir", isDir ? "true" : "false");
    e.dataTransfer.setData("application/x-node-sha", node.sha || "");
    
    // 如果有 repo base URL，設置完整的圖片 URL
    if (repoBaseUrl && isImage) {
      const imageUrl = `${repoBaseUrl}/${node.path}`;
      e.dataTransfer.setData("application/x-image-url", imageUrl);
    }
    
    e.dataTransfer.effectAllowed = "copyMove";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 只有目錄可以接受拖放
    if (isDir) {
      // 判斷是本地檔案還是內部移動
      if (e.dataTransfer.types.includes("Files")) {
        e.dataTransfer.dropEffect = "copy";
      } else {
        e.dataTransfer.dropEffect = "move";
      }
      setDragOverPath(node.path);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverPath === node.path) {
      setDragOverPath(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPath(null);

    if (!isDir) return;

    // 檢查是否為本地檔案拖放
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0 && onUploadFiles) {
      // 本地檔案上傳到此資料夾
      setIsUploading(true);
      try {
        await onUploadFiles(droppedFiles, node.path);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // 內部檔案移動
    if (!onMoveFile) return;

    const sourcePath = e.dataTransfer.getData("application/x-file-path");
    const fileName = e.dataTransfer.getData("application/x-file-name");
    
    if (!sourcePath || !fileName) return;
    
    // 不能移動到自己或子目錄
    if (sourcePath === node.path || node.path.startsWith(sourcePath + "/")) {
      return;
    }

    const targetPath = `${node.path}/${fileName}`;
    
    // 避免移動到相同位置
    if (sourcePath === targetPath) return;

    setIsMoving(true);
    try {
      await onMoveFile(sourcePath, targetPath);
    } finally {
      setIsMoving(false);
    }
  };

  const handleDelete = async () => {
    if (onDeleteFile && node.sha) {
      await onDeleteFile(node.path, node.sha);
    }
  };

  const handleRename = () => {
    if (onRenameFile) {
      onRenameFile(node.path);
    }
  };

  const handleCreateFileInFolder = () => {
    if (onCreateFileInFolder && isDir) {
      onCreateFileInFolder(node.path);
    }
  };

  const handleCreateFolderInFolder = () => {
    if (onCreateFolderInFolder && isDir) {
      onCreateFolderInFolder(node.path);
    }
  };

  const nodeContent = (
    <div
      onClick={handleClick}
      draggable={true}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "file-tree-item group",
        isSelected && "active",
        "cursor-grab active:cursor-grabbing",
        isDragOver && "bg-primary/20 ring-2 ring-primary ring-inset",
        isMoving && "opacity-50"
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
      <span className="truncate text-sm flex-1">{node.name}</span>
      
      {/* 操作選單按鈕 */}
      {(onDeleteFile || onRenameFile || (isDir && (onCreateFileInFolder || onCreateFolderInFolder))) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {isDir && onCreateFileInFolder && (
              <DropdownMenuItem onClick={handleCreateFileInFolder}>
                <FilePlus className="w-4 h-4 mr-2" />
                新增檔案
              </DropdownMenuItem>
            )}
            {isDir && onCreateFolderInFolder && (
              <DropdownMenuItem onClick={handleCreateFolderInFolder}>
                <FolderPlus className="w-4 h-4 mr-2" />
                新增子資料夾
              </DropdownMenuItem>
            )}
            {isDir && (onCreateFileInFolder || onCreateFolderInFolder) && (onRenameFile || onDeleteFile) && (
              <DropdownMenuSeparator />
            )}
            {onRenameFile && !isDir && (
              <DropdownMenuItem onClick={handleRename}>
                <Edit2 className="w-4 h-4 mr-2" />
                重新命名
              </DropdownMenuItem>
            )}
            {onDeleteFile && !isDir && (
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                刪除
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <div className="animate-slide-in" style={{ animationDelay: `${level * 30}ms` }}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {nodeContent}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {isDir && onCreateFileInFolder && (
            <ContextMenuItem onClick={handleCreateFileInFolder}>
              <FilePlus className="w-4 h-4 mr-2" />
              新增檔案
            </ContextMenuItem>
          )}
          {isDir && onCreateFolderInFolder && (
            <ContextMenuItem onClick={handleCreateFolderInFolder}>
              <FolderPlus className="w-4 h-4 mr-2" />
              新增子資料夾
            </ContextMenuItem>
          )}
          {isDir && (onCreateFileInFolder || onCreateFolderInFolder) && (
            <ContextMenuSeparator />
          )}
          {onRenameFile && !isDir && (
            <ContextMenuItem onClick={handleRename}>
              <Edit2 className="w-4 h-4 mr-2" />
              重新命名
            </ContextMenuItem>
          )}
          {onDeleteFile && !isDir && (
            <ContextMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              刪除
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>

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
              onDeleteFile={onDeleteFile}
              onRenameFile={onRenameFile}
              onMoveFile={onMoveFile}
              onCreateFileInFolder={onCreateFileInFolder}
              onCreateFolderInFolder={onCreateFolderInFolder}
              onUploadFiles={onUploadFiles}
              dragOverPath={dragOverPath}
              setDragOverPath={setDragOverPath}
              setIsUploading={setIsUploading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
