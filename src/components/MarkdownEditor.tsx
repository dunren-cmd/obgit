import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileContent, FileNode } from "@/lib/github";
import { Save, Eye, Edit3, Loader2, Check, AlertCircle, Columns, Trash2, ImageIcon, Edit2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { WikilinkRenderer } from "@/components/WikilinkRenderer";
import { FormattingToolbar } from "@/components/FormattingToolbar";
import { ImageInsertDialog } from "@/components/ImageInsertDialog";

interface MarkdownEditorProps {
  file: FileContent | null;
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSave: (content: string) => Promise<boolean>;
  onDelete?: () => void;
  onRename?: () => void;
  files?: FileNode[];
  onNavigate?: (path: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
}

type ViewMode = "edit" | "preview" | "split";

export function MarkdownEditor({
  file,
  isLoading,
  isSaving,
  saveStatus,
  onSave,
  onDelete,
  onRename,
  files = [],
  onNavigate,
  onUploadImage,
}: MarkdownEditorProps) {
  const [content, setContent] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [hasChanges, setHasChanges] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

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

  const handleNavigate = useCallback((path: string) => {
    onNavigate?.(path);
  }, [onNavigate]);

  const handleInsertImage = useCallback((markdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + "\n" + markdown);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.slice(0, start) + markdown + content.slice(end);
    setContent(newContent);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + markdown.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  }, [content]);

  // 拖放上傳處理
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
    // 確保離開的是編輯器區域
    if (editorRef.current && !editorRef.current.contains(e.relatedTarget as Node)) {
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

    if (!onUploadImage) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith("image/"));

    if (imageFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const imageFile of imageFiles) {
        const url = await onUploadImage(imageFile);
        if (url) {
          const markdown = `![${imageFile.name}](${url})\n`;
          handleInsertImage(markdown);
        }
      }
    } finally {
      setIsUploading(false);
    }
  }, [onUploadImage, handleInsertImage]);

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
          <p className="text-xs mt-4 opacity-60">按 Ctrl/Cmd + P 搜尋檔案</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={editorRef}
      className="flex-1 flex flex-col bg-editor relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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

          {/* Image Insert */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsImageDialogOpen(true)}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>

          {/* View Mode Toggles */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("edit")}
              className={cn(
                "h-8 rounded-none border-0",
                viewMode === "edit" && "bg-primary/10 text-primary"
              )}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("split")}
              className={cn(
                "h-8 rounded-none border-0",
                viewMode === "split" && "bg-primary/10 text-primary"
              )}
            >
              <Columns className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("preview")}
              className={cn(
                "h-8 rounded-none border-0",
                viewMode === "preview" && "bg-primary/10 text-primary"
              )}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          {/* Rename Button */}
          {onRename && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRename}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}

          {/* Delete Button */}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

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
      <div className="flex-1 overflow-hidden flex">
        {/* Editor Panel */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className={cn(
            "flex-1 overflow-hidden flex flex-col",
            viewMode === "split" && "border-r border-border"
          )}>
            {/* Formatting Toolbar */}
            <FormattingToolbar
              textareaRef={textareaRef}
              content={content}
              onContentChange={setContent}
            />
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 w-full resize-none border-0 bg-transparent p-6 focus:outline-none editor-content text-foreground font-mono text-sm"
              placeholder="開始輸入你的筆記..."
            />
          </div>
        )}

        {/* Preview Panel */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className={cn(
            "flex-1 overflow-y-auto p-6",
            viewMode === "split" && "bg-background/50"
          )}>
            <div className="max-w-3xl mx-auto markdown-preview animate-fade-in">
              <WikilinkRenderer
                content={content}
                files={files}
                onNavigate={handleNavigate}
              />
            </div>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-card px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
            <Upload className="w-6 h-6 text-primary" />
            <span className="text-lg font-medium text-foreground">放開以上傳圖片</span>
          </div>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="bg-card px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-foreground">上傳中...</span>
          </div>
        </div>
      )}

      {/* Image Insert Dialog */}
      <ImageInsertDialog
        open={isImageDialogOpen}
        onOpenChange={setIsImageDialogOpen}
        onInsertImage={handleInsertImage}
        onUploadImage={onUploadImage}
      />
    </div>
  );
}
