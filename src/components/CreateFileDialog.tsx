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
import { FilePlus, Loader2 } from "lucide-react";

interface CreateFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFile: (path: string) => Promise<boolean>;
  currentFolder?: string;
}

export function CreateFileDialog({
  open,
  onOpenChange,
  onCreateFile,
  currentFolder = "",
}: CreateFileDialogProps) {
  const [fileName, setFileName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!fileName.trim()) {
      setError("請輸入檔案名稱");
      return;
    }

    let finalName = fileName.trim();
    if (!finalName.endsWith(".md")) {
      finalName += ".md";
    }

    const path = currentFolder ? `${currentFolder}/${finalName}` : finalName;

    setIsCreating(true);
    setError(null);

    try {
      const success = await onCreateFile(path);
      if (success) {
        setFileName("");
        onOpenChange(false);
      } else {
        setError("建立檔案失敗");
      }
    } catch (err: any) {
      setError(err.message || "建立檔案失敗");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFileName("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="w-5 h-5 text-primary" />
            建立新檔案
          </DialogTitle>
          <DialogDescription>
            在 {currentFolder || "根目錄"} 建立新的 Markdown 檔案
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fileName">檔案名稱</Label>
            <Input
              id="fileName"
              placeholder="我的筆記.md"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCreating) {
                  handleCreate();
                }
              }}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !fileName.trim()}>
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
