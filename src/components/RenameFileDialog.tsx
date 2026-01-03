import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit2, Loader2 } from "lucide-react";

interface RenameFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (newPath: string) => Promise<boolean>;
  currentPath: string;
  currentName: string;
}

export function RenameFileDialog({
  open,
  onOpenChange,
  onRename,
  currentPath,
  currentName,
}: RenameFileDialogProps) {
  const [newName, setNewName] = useState(currentName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRename = async () => {
    if (!newName.trim()) {
      setError("請輸入新檔案名稱");
      return;
    }

    if (newName === currentName) {
      onOpenChange(false);
      return;
    }

    let finalName = newName.trim();
    if (!finalName.endsWith(".md")) {
      finalName += ".md";
    }

    // 計算新路徑
    const pathParts = currentPath.split("/");
    pathParts.pop();
    const newPath = pathParts.length > 0 ? `${pathParts.join("/")}/${finalName}` : finalName;

    setIsRenaming(true);
    setError(null);

    try {
      const success = await onRename(newPath);
      if (success) {
        onOpenChange(false);
      } else {
        setError("重新命名失敗");
      }
    } catch (err: any) {
      setError(err.message || "重新命名失敗");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleClose = () => {
    setNewName(currentName);
    setError(null);
    onOpenChange(false);
  };

  // 當對話框打開時重置名稱
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setNewName(currentName);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-primary" />
            重新命名檔案
          </DialogTitle>
          <DialogDescription>
            將 "{currentName}" 重新命名
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="newName">新檔案名稱</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isRenaming) {
                  handleRename();
                }
              }}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isRenaming}>
            取消
          </Button>
          <Button onClick={handleRename} disabled={isRenaming || !newName.trim()}>
            {isRenaming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                重新命名中...
              </>
            ) : (
              "確認"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
