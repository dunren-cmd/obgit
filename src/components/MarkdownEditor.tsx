import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileContent } from "@/lib/github";
import { Save, Eye, Edit3, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface MarkdownEditorProps {
  file: FileContent | null;
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSave: (content: string) => Promise<boolean>;
}

export function MarkdownEditor({
  file,
  isLoading,
  isSaving,
  saveStatus,
  onSave,
}: MarkdownEditorProps) {
  const [content, setContent] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 同步檔案內容
  useEffect(() => {
    if (file) {
      setContent(file.content);
      setHasChanges(false);
    }
  }, [file]);

  // 監測變更
  useEffect(() => {
    if (file) {
      setHasChanges(content !== file.content);
    }
  }, [content, file]);

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges && !isSaving) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges, isSaving, content]);

  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return;
    await onSave(content);
  }, [content, hasChanges, isSaving, onSave]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>載入中...</span>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor">
        <div className="text-center text-muted-foreground">
          <Edit3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">選擇一個檔案開始編輯</p>
          <p className="text-sm mt-1">從左側檔案樹選擇 Markdown 檔案</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-editor">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <h2 className="font-medium text-foreground truncate max-w-xs">
            {file.name}
          </h2>
          {hasChanges && (
            <span className="text-xs text-warning">• 未儲存</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save Status */}
          <div className="flex items-center gap-2 mr-2">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="status-dot saving" />
                儲存中...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-xs text-success animate-fade-in">
                <Check className="w-3 h-3" />
                已儲存
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-destructive animate-fade-in">
                <AlertCircle className="w-3 h-3" />
                儲存失敗
              </span>
            )}
          </div>

          {/* Toggle Preview */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className={cn(
              "h-8",
              isPreview && "bg-primary/10 text-primary"
            )}
          >
            <Eye className="w-4 h-4 mr-1.5" />
            預覽
          </Button>

          {/* Save Button */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="h-8 bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            儲存
          </Button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="flex-1 overflow-hidden">
        {isPreview ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto markdown-preview animate-fade-in">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-full w-full resize-none border-0 rounded-none bg-transparent p-6 focus-visible:ring-0 focus-visible:ring-offset-0 editor-content text-foreground"
            placeholder="開始輸入你的筆記..."
          />
        )}
      </div>
    </div>
  );
}
