import { useState, useRef, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Upload, Link, Loader2 } from "lucide-react";

interface ImageInsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsertImage: (markdown: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
}

export function ImageInsertDialog({
  open,
  onOpenChange,
  onInsertImage,
  onUploadImage,
}: ImageInsertDialogProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInsertUrl = () => {
    if (!imageUrl.trim()) {
      setError("請輸入圖片網址");
      return;
    }

    const markdown = `![${altText || "image"}](${imageUrl.trim()})`;
    onInsertImage(markdown);
    handleClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("請選擇圖片檔案");
      return;
    }

    if (!onUploadImage) {
      // 如果沒有上傳功能，轉換為 base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const markdown = `![${altText || file.name}](${base64})`;
        onInsertImage(markdown);
        handleClose();
      };
      reader.readAsDataURL(file);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const url = await onUploadImage(file);
      if (url) {
        const markdown = `![${altText || file.name}](${url})`;
        onInsertImage(markdown);
        handleClose();
      } else {
        setError("圖片上傳失敗");
      }
    } catch (err: any) {
      setError(err.message || "圖片上傳失敗");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setImageUrl("");
    setAltText("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            插入圖片
          </DialogTitle>
          <DialogDescription>
            從網址插入圖片或上傳本地圖片
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">
              <Link className="w-4 h-4 mr-2" />
              網址
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" />
              上傳
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">圖片網址</Label>
              <Input
                id="imageUrl"
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="altText">替代文字 (選填)</Label>
              <Input
                id="altText"
                placeholder="圖片描述"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button onClick={handleInsertUrl}>插入</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="altTextUpload">替代文字 (選填)</Label>
              <Input
                id="altTextUpload"
                placeholder="圖片描述"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </div>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">上傳中...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    點擊選擇圖片或拖放到此處
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    支援 JPG、PNG、GIF、WebP
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
