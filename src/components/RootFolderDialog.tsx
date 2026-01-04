import { useState, useEffect, useCallback } from "react";
import { FileNode, GitHubService } from "@/lib/github";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Folder, FolderOpen, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RootFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRootFolder: string;
  onSetRootFolder: (path: string) => void;
  service: GitHubService | null;
}

export function RootFolderDialog({
  open,
  onOpenChange,
  currentRootFolder,
  onSetRootFolder,
  service,
}: RootFolderDialogProps) {
  const [selectedFolder, setSelectedFolder] = useState(currentRootFolder);
  const [customPath, setCustomPath] = useState("");
  const [folders, setFolders] = useState<{ path: string; name: string; level: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 載入目錄列表
  const loadFolders = useCallback(async () => {
    if (!service) return;
    
    setIsLoading(true);
    try {
      const tree = await service.getRepoContent();
      const allFolders = getAllFolders(tree);
      setFolders(allFolders);
    } catch (error) {
      console.error("載入目錄失敗:", error);
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (open) {
      setSelectedFolder(currentRootFolder);
      setCustomPath(currentRootFolder);
      // 開啟對話框時載入目錄
      if (folders.length === 0) {
        loadFolders();
      }
    }
  }, [open, currentRootFolder, folders.length, loadFolders]);

  // 遞迴取得所有資料夾
  const getAllFolders = (nodes: FileNode[], parentPath: string = ""): { path: string; name: string; level: number }[] => {
    const result: { path: string; name: string; level: number }[] = [];
    const level = parentPath ? parentPath.split("/").length : 0;

    for (const node of nodes) {
      if (node.type === "dir") {
        result.push({ path: node.path, name: node.name, level });
        if (node.children) {
          result.push(...getAllFolders(node.children, node.path));
        }
      }
    }
    return result;
  };

  const handleConfirm = () => {
    onSetRootFolder(selectedFolder);
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedFolder("");
    setCustomPath("");
  };

  const handleSelectFolder = (path: string) => {
    setSelectedFolder(path);
    setCustomPath(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>設定預設目錄</DialogTitle>
          <DialogDescription>
            選擇要預設開啟的目錄，檔案樹將只顯示該目錄下的內容
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 手動輸入 */}
          <div className="space-y-2">
            <Label htmlFor="rootPath">目錄路徑</Label>
            <div className="flex gap-2">
              <Input
                id="rootPath"
                value={customPath}
                onChange={(e) => {
                  setCustomPath(e.target.value);
                  setSelectedFolder(e.target.value);
                }}
                placeholder="例如：notes 或 docs/zh"
                className="flex-1"
              />
              {customPath && (
                <Button variant="ghost" size="icon" onClick={handleClear}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 資料夾列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>選擇資料夾</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadFolders}
                disabled={isLoading}
                className="h-7 px-2"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              </Button>
            </div>
            <ScrollArea className="h-48 rounded-md border">
              <div className="p-2 space-y-0.5">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    載入中...
                  </div>
                ) : (
                  <>
                    {/* 根目錄選項 */}
                    <button
                      onClick={() => handleSelectFolder("")}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                        selectedFolder === ""
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <FolderOpen className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">/ （顯示全部）</span>
                    </button>

                    {folders.map((folder) => (
                      <button
                        key={folder.path}
                        onClick={() => handleSelectFolder(folder.path)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                          selectedFolder === folder.path
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        )}
                        style={{ paddingLeft: `${12 + folder.level * 16}px` }}
                      >
                        <Folder className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            確認
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
