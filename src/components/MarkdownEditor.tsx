import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileContent, FileNode, GitHubService } from "@/lib/github";
import { Save, Eye, Edit3, Loader2, Check, AlertCircle, Columns, Trash2, ImageIcon, Edit2, Upload, Undo2, Redo2, RefreshCw } from "lucide-react";
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
  githubService?: GitHubService | null;
  repoBaseUrl?: string;
}

type ViewMode = "edit" | "preview" | "split";

// 判斷檔案是否為 HTML
const isHtmlFile = (fileName: string): boolean => {
  const ext = fileName.toLowerCase();
  return ext.endsWith(".html") || ext.endsWith(".htm");
};

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
  githubService,
  repoBaseUrl,
}: MarkdownEditorProps) {
  const [content, setContent] = useState("");
  // 行動裝置預設使用 edit 模式，桌面預設 split 模式
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "edit";
    }
    return "split";
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Undo/Redo 歷史記錄
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // 同步檔案內容
  useEffect(() => {
    if (file) {
      setContent(file.content);
      setHasChanges(false);
      // 重置歷史記錄
      setHistory([file.content]);
      setHistoryIndex(0);
    }
  }, [file]);

  // 追蹤內容變更到歷史記錄（防抖）
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    
    if (history.length === 0 || content === history[historyIndex]) return;
    
    const timer = setTimeout(() => {
      setHistory(prev => {
        // 如果不在歷史末端，截斷後面的記錄
        const newHistory = prev.slice(0, historyIndex + 1);
        // 限制歷史記錄數量
        if (newHistory.length >= 100) {
          newHistory.shift();
        }
        return [...newHistory, content];
      });
      setHistoryIndex(prev => Math.min(prev + 1, 99));
    }, 500);
    
    return () => clearTimeout(timer);
  }, [content]);

  // 監測變更
  useEffect(() => {
    if (file) {
      setHasChanges(content !== file.content);
    }
  }, [content, file]);

  // Undo/Redo 函數
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    isUndoRedoRef.current = true;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setContent(history[newIndex]);
  }, [canUndo, historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    isUndoRedoRef.current = true;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setContent(history[newIndex]);
  }, [canRedo, historyIndex, history]);

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

  // 鍵盤快捷鍵和剪貼簿貼上
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasChanges && !isSaving) {
          handleSave();
        }
      }
      // Ctrl/Cmd + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y = Redo
      if ((e.metaKey || e.ctrlKey) && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault();
        handleRedo();
      }
    };

    // 處理剪貼簿貼上圖片
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || !onUploadImage) return;

      const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;

      e.preventDefault();
      setIsUploading(true);

      try {
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file) {
            // 生成檔名：screenshot_日期時間.png
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const namedFile = new File([file], `screenshot_${timestamp}.png`, { type: file.type });
            
            const url = await onUploadImage(namedFile);
            if (url) {
              const markdown = `![screenshot](${url})\n`;
              handleInsertImage(markdown);
            }
          }
        }
      } finally {
        setIsUploading(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("paste", handlePaste);
    };
  }, [hasChanges, isSaving, handleSave, handleUndo, handleRedo, onUploadImage, handleInsertImage]);

  // 拖放上傳處理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 檢查是否為檔案或從檔案樹拖曳
    if (e.dataTransfer.types.includes("Files") || e.dataTransfer.types.includes("application/x-file-path")) {
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
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // 檢查是否從檔案樹拖曳
    const filePath = e.dataTransfer.getData("application/x-file-path");
    const fileName = e.dataTransfer.getData("application/x-file-name");
    const isImage = e.dataTransfer.getData("application/x-is-image") === "true";
    const imageUrl = e.dataTransfer.getData("application/x-image-url");

    if (filePath) {
      // 從檔案樹拖曳的檔案
      if (isImage && imageUrl) {
        // 圖片檔案 - 插入圖片 markdown
        const markdown = `![${fileName}](${imageUrl})\n`;
        handleInsertImage(markdown);
      } else {
        // 其他檔案 - 插入 wikilink
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
        const markdown = `[[${nameWithoutExt}]]\n`;
        handleInsertImage(markdown);
      }
      return;
    }

    // 處理從系統拖曳的檔案
    const droppedFiles = Array.from(e.dataTransfer.files);
    const imageFiles = droppedFiles.filter(file => file.type.startsWith("image/"));
    const htmlFiles = droppedFiles.filter(file => 
      file.type === "text/html" || file.name.endsWith(".html") || file.name.endsWith(".htm")
    );

    // 處理 HTML 檔案 - 讀取內容並插入
    for (const htmlFile of htmlFiles) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const htmlContent = event.target?.result as string;
        // 將 HTML 包裝在程式碼區塊中插入
        const markdown = `\n\`\`\`html\n${htmlContent}\n\`\`\`\n`;
        handleInsertImage(markdown);
      };
      reader.readAsText(htmlFile);
    }

    // 處理圖片檔案 - 上傳並插入
    if (imageFiles.length > 0 && onUploadImage) {
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
      <div className="flex flex-wrap items-center justify-between px-2 sm:px-4 py-2 border-b border-border bg-card/50 gap-2">
        {/* 第一行：檔名和狀態 */}
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-medium text-foreground truncate text-sm max-w-[150px] sm:max-w-xs">
            {file.name}
          </h2>
          {/* 同步圖示 */}
          <div 
            className={cn(
              "flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all duration-300 flex-shrink-0",
              saveStatus === "saving" && "bg-primary/20",
              saveStatus === "saved" && "bg-green-500/20",
              saveStatus === "error" && "bg-destructive/20",
              hasChanges && saveStatus === "idle" && "bg-warning/20",
              !hasChanges && saveStatus === "idle" && "bg-muted"
            )}
          >
            <RefreshCw 
              className={cn(
                "w-3 h-3 sm:w-3.5 sm:h-3.5 transition-all duration-300",
                saveStatus === "saving" && "text-primary animate-spin",
                saveStatus === "saved" && "text-green-500",
                saveStatus === "error" && "text-destructive",
                hasChanges && saveStatus === "idle" && "text-warning",
                !hasChanges && saveStatus === "idle" && "text-muted-foreground/50"
              )} 
            />
          </div>
          {/* 狀態文字 - 只在桌面顯示 */}
          <span className="hidden sm:inline text-xs whitespace-nowrap">
            {saveStatus === "saving" ? (
              <span className="text-muted-foreground animate-pulse">同步中...</span>
            ) : saveStatus === "saved" ? (
              <span className="text-green-500 animate-fade-in">已同步</span>
            ) : saveStatus === "error" ? (
              <span className="text-destructive animate-fade-in">同步失敗</span>
            ) : hasChanges ? (
              <span className="text-warning">未同步</span>
            ) : (
              <span className="text-muted-foreground">無變更</span>
            )}
          </span>
        </div>

        {/* 右側：核心操作按鈕（會自動換行） */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {/* Undo/Redo - 只在桌面顯示 */}
          <div className="hidden md:flex items-center border border-border rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
              className="h-8 rounded-none border-0"
              title="還原 (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={!canRedo}
              className="h-8 rounded-none border-0"
              title="重做 (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Image Insert - 只在桌面顯示 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsImageDialogOpen(true)}
            className="hidden md:flex h-8 text-muted-foreground hover:text-foreground"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>

          {/* View Mode Toggle - 始終顯示 */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("edit")}
              className={cn(
                "h-8 w-8 p-0 rounded-none border-0",
                viewMode === "edit" && "bg-primary/10 text-primary"
              )}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            {/* Split - 只在大螢幕顯示 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("split")}
              className={cn(
                "hidden md:flex h-8 w-8 p-0 rounded-none border-0",
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
                "h-8 w-8 p-0 rounded-none border-0",
                viewMode === "preview" && "bg-primary/10 text-primary"
              )}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          {/* Rename - 只在桌面顯示 */}
          {onRename && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRename}
              className="hidden md:flex h-8 text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}

          {/* Delete - 只在桌面顯示 */}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="hidden md:flex h-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          {/* Save Button - 始終顯示 */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="h-8 px-3 bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="ml-1.5">儲存</span>
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
              className="flex-1 w-full resize-none border-0 bg-transparent p-4 sm:p-6 focus:outline-none editor-content text-foreground font-mono text-sm leading-relaxed touch-manipulation"
              placeholder="開始輸入你的筆記..."
              style={{ fontSize: '16px' }} // 防止 iOS 自動縮放
            />
          </div>
        )}

        {/* Preview Panel */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className={cn(
            "flex-1 overflow-hidden",
            viewMode === "split" && "bg-background/50"
          )}>
            {isHtmlFile(file.name) ? (
              // HTML 檔案預覽 - 使用 iframe 渲染
              <iframe
                srcDoc={content}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin"
                title="HTML Preview"
              />
            ) : (
              // Markdown 檔案預覽
              <div className="h-full overflow-y-auto p-4 sm:p-6 overscroll-contain">
                <div className="max-w-3xl mx-auto markdown-preview animate-fade-in text-sm sm:text-base">
                  <WikilinkRenderer
                    content={content}
                    files={files}
                    onNavigate={handleNavigate}
                    githubService={githubService}
                    repoBaseUrl={repoBaseUrl}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-card px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
            <Upload className="w-6 h-6 text-primary" />
            <span className="text-lg font-medium text-foreground">放開以上傳圖片或 HTML</span>
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
