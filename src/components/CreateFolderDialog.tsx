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
import { FolderPlus, Loader2 } from "lucide-react";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFolder: (path: string) => Promise<boolean>;
  currentFolder?: string;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreateFolder,
  currentFolder = "",
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      setError("請輸入資料夾名稱");
      return;
    }

    const path = currentFolder
      ? `${currentFolder}/${folderName.trim()}`
      : folderName.trim();

    setIsCreating(true);
    setError(null);

    try {
      const success = await onCreateFolder(path);
      if (success) {
        setFolderName("");
        onOpenChange(false);
      } else {
        setError("建立資料夾失敗");
      }
    } catch (err: any) {
      setError(err.message || "建立資料夾失敗");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFolderName("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            建立新資料夾
          </DialogTitle>
          <DialogDescription>
            在 {currentFolder || "根目錄"} 建立新資料夾
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">資料夾名稱</Label>
            <Input
              id="folderName"
              placeholder="我的筆記"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreating) {
                  handleCreate();
                }
              }}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !folderName.trim()}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                建立中...
              </>
            ) : (
              "建立"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
