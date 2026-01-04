import { useState, useEffect } from "react";
import { FileNode } from "@/lib/github";
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
import { Folder, FolderOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RootFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FileNode[];
  currentRootFolder: string;
  onSetRootFolder: (path: string) => void;
}

export function RootFolderDialog({
  open,
  onOpenChange,
  folders,
  currentRootFolder,
  onSetRootFolder,
}: RootFolderDialogProps) {
  const [selectedFolder, setSelectedFolder] = useState(currentRootFolder);
  const [customPath, setCustomPath] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedFolder(currentRootFolder);
      setCustomPath(currentRootFolder);
    }
  }, [open, currentRootFolder]);

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

  const allFolders = getAllFolders(folders);

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
          {allFolders.length > 0 && (
            <div className="space-y-2">
              <Label>或選擇資料夾</Label>
              <ScrollArea className="h-48 rounded-md border">
                <div className="p-2 space-y-0.5">
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

                  {allFolders.map((folder) => (
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
                </div>
              </ScrollArea>
            </div>
          )}
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
