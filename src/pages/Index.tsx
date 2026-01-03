import { useState, useCallback, useEffect } from "react";
import { useGitHub, useFileTree, useFileContent } from "@/hooks/useGitHub";
import { ConnectForm } from "@/components/ConnectForm";
import { FileTree } from "@/components/FileTree";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { CreateFileDialog } from "@/components/CreateFileDialog";
import { DeleteFileDialog } from "@/components/DeleteFileDialog";
import { FileSearchDialog } from "@/components/FileSearchDialog";
import { RenameFileDialog } from "@/components/RenameFileDialog";
import { CreateFolderDialog } from "@/components/CreateFolderDialog";
import { TagsPanel } from "@/components/TagsPanel";
import { Button } from "@/components/ui/button";
import { LogOut, Github, Menu, X, Search, Hash, FolderPlus, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const { isConnected, isConnecting, error, config, connect, disconnect, service } = useGitHub();
  const { files, isLoading: isLoadingFiles, refresh } = useFileTree(service);
  const { content, isLoading: isLoadingContent, isSaving, saveStatus, load, save } = useFileContent(service);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showTagsPanel, setShowTagsPanel] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);

  // 當檔案內容變更時更新快取（用於標籤面板）
  useEffect(() => {
    if (content && selectedPath) {
      setFileContents((prev) => {
        const newMap = new Map(prev);
        newMap.set(selectedPath, content.content);
        return newMap;
      });
    }
  }, [content, selectedPath]);

  const handleSelectFile = useCallback(async (path: string) => {
    setSelectedPath(path);
    await load(path);
  }, [load]);

  const handleCreateFile = useCallback(async (path: string): Promise<boolean> => {
    if (!service) return false;
    try {
      await service.createFile(path);
      await refresh();
      await handleSelectFile(path);
      return true;
    } catch (error) {
      console.error("建立檔案失敗:", error);
      return false;
    }
  }, [service, refresh, handleSelectFile]);

  const handleDeleteFile = useCallback(async (): Promise<boolean> => {
    if (!service || !content) return false;
    try {
      const success = await service.deleteFile(content.path, content.sha);
      if (success) {
        setSelectedPath(null);
        setFileContents((prev) => {
          const newMap = new Map(prev);
          newMap.delete(content.path);
          return newMap;
        });
        await refresh();
      }
      return success;
    } catch (error) {
      console.error("刪除檔案失敗:", error);
      return false;
    }
  }, [service, content, refresh]);

  const handleRenameFile = useCallback(async (newPath: string): Promise<boolean> => {
    if (!service || !content) return false;
    try {
      await service.renameFile(content.path, newPath);
      // 更新快取
      setFileContents((prev) => {
        const newMap = new Map(prev);
        const oldContent = newMap.get(content.path);
        if (oldContent) {
          newMap.delete(content.path);
          newMap.set(newPath, oldContent);
        }
        return newMap;
      });
      await refresh();
      await handleSelectFile(newPath);
      return true;
    } catch (error) {
      console.error("重新命名失敗:", error);
      return false;
    }
  }, [service, content, refresh, handleSelectFile]);

  const handleCreateFolder = useCallback(async (path: string): Promise<boolean> => {
    if (!service) return false;
    try {
      const success = await service.createFolder(path);
      if (success) {
        await refresh();
      }
      return success;
    } catch (error) {
      console.error("建立資料夾失敗:", error);
      return false;
    }
  }, [service, refresh]);

  const handleUploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!service) return null;
    try {
      const url = await service.uploadImage(file);
      return url;
    } catch (error) {
      console.error("上傳圖片失敗:", error);
      return null;
    }
  }, [service]);

  // 顯示連接表單
  if (!isConnected) {
    return <ConnectForm onConnect={connect} isConnecting={isConnecting} error={error} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">
              {config?.owner}/{config?.repo}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tags Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTagsPanel(!showTagsPanel)}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              showTagsPanel && "bg-primary/10 text-primary"
            )}
          >
            <Hash className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">標籤</span>
          </Button>

          {/* Search Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchDialogOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Search className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">搜尋</span>
            <kbd className="hidden md:inline ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">
              ⌘P
            </kbd>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={disconnect}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">登出</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "w-64 border-r border-sidebar-border flex-shrink-0 transition-all duration-300 flex flex-col",
            "absolute lg:relative z-10 h-[calc(100vh-49px)] lg:h-auto",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
          )}
        >
          {/* Tags Panel (Collapsible) */}
          {showTagsPanel && (
            <div className="h-48 border-b border-sidebar-border bg-sidebar overflow-hidden">
              <TagsPanel
                files={files}
                fileContents={fileContents}
                selectedTag={selectedTag}
                onSelectTag={setSelectedTag}
                onSelectFile={handleSelectFile}
              />
            </div>
          )}

          {/* File Tree */}
          <div className="flex-1 overflow-hidden">
            <FileTree
              files={files}
              isLoading={isLoadingFiles}
              selectedPath={selectedPath}
              onSelectFile={handleSelectFile}
              onRefresh={refresh}
              onCreateFile={() => setIsCreateDialogOpen(true)}
              onCreateFolder={() => setIsCreateFolderDialogOpen(true)}
            />
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-[5] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Editor */}
        <main className="flex-1 flex overflow-hidden">
          <MarkdownEditor
            file={content}
            isLoading={isLoadingContent}
            isSaving={isSaving}
            saveStatus={saveStatus}
            onSave={save}
            onDelete={content ? () => setIsDeleteDialogOpen(true) : undefined}
            onRename={content ? () => setIsRenameDialogOpen(true) : undefined}
            files={files}
            onNavigate={handleSelectFile}
            onUploadImage={handleUploadImage}
          />
        </main>
      </div>

      {/* Dialogs */}
      <CreateFileDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateFile={handleCreateFile}
      />

      <DeleteFileDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleteFile={handleDeleteFile}
        fileName={content?.name || ""}
      />

      <FileSearchDialog
        open={isSearchDialogOpen}
        onOpenChange={setIsSearchDialogOpen}
        files={files}
        onSelectFile={handleSelectFile}
      />

      <RenameFileDialog
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        onRename={handleRenameFile}
        currentPath={content?.path || ""}
        currentName={content?.name || ""}
      />

      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onOpenChange={setIsCreateFolderDialogOpen}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  );
};

export default Index;
