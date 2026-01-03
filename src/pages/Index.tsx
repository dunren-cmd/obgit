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
import { toast } from "sonner";

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
  
  // 目標資料夾（用於在特定目錄下建立檔案/資料夾）
  const [targetFolder, setTargetFolder] = useState<string>("");
  // 重命名時的原始路徑
  const [renameTargetPath, setRenameTargetPath] = useState<string>("");

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
      toast.success("檔案建立成功");
      return true;
    } catch (error) {
      console.error("建立檔案失敗:", error);
      toast.error("建立檔案失敗");
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
        toast.success("檔案刪除成功");
      }
      return success;
    } catch (error) {
      console.error("刪除檔案失敗:", error);
      toast.error("刪除檔案失敗");
      return false;
    }
  }, [service, content, refresh]);

  // 從檔案樹直接刪除檔案
  const handleDeleteFileFromTree = useCallback(async (path: string, sha: string): Promise<boolean> => {
    if (!service) return false;
    try {
      const success = await service.deleteFile(path, sha);
      if (success) {
        if (selectedPath === path) {
          setSelectedPath(null);
        }
        setFileContents((prev) => {
          const newMap = new Map(prev);
          newMap.delete(path);
          return newMap;
        });
        await refresh();
        toast.success("檔案刪除成功");
      }
      return success;
    } catch (error) {
      console.error("刪除檔案失敗:", error);
      toast.error("刪除檔案失敗");
      return false;
    }
  }, [service, selectedPath, refresh]);

  const handleRenameFile = useCallback(async (newPath: string): Promise<boolean> => {
    if (!service) return false;
    
    // 使用 renameTargetPath 或 content.path
    const oldPath = renameTargetPath || content?.path;
    if (!oldPath) return false;
    
    try {
      await service.renameFile(oldPath, newPath);
      // 更新快取
      setFileContents((prev) => {
        const newMap = new Map(prev);
        const oldContent = newMap.get(oldPath);
        if (oldContent) {
          newMap.delete(oldPath);
          newMap.set(newPath, oldContent);
        }
        return newMap;
      });
      await refresh();
      // 如果當前選中的是被重命名的檔案，更新選中路徑
      if (selectedPath === oldPath) {
        await handleSelectFile(newPath);
      }
      toast.success("檔案重新命名成功");
      return true;
    } catch (error) {
      console.error("重新命名失敗:", error);
      toast.error("重新命名失敗");
      return false;
    }
  }, [service, content, renameTargetPath, selectedPath, refresh, handleSelectFile]);

  // 從檔案樹觸發重命名
  const handleRenameFromTree = useCallback((path: string) => {
    setRenameTargetPath(path);
    setIsRenameDialogOpen(true);
  }, []);

  // 移動檔案
  const handleMoveFile = useCallback(async (sourcePath: string, targetPath: string): Promise<boolean> => {
    if (!service) return false;
    try {
      await service.moveFile(sourcePath, targetPath);
      // 更新快取
      setFileContents((prev) => {
        const newMap = new Map(prev);
        const oldContent = newMap.get(sourcePath);
        if (oldContent) {
          newMap.delete(sourcePath);
          newMap.set(targetPath, oldContent);
        }
        return newMap;
      });
      await refresh();
      // 如果當前選中的是被移動的檔案，更新選中路徑
      if (selectedPath === sourcePath) {
        setSelectedPath(targetPath);
      }
      toast.success("檔案移動成功");
      return true;
    } catch (error) {
      console.error("移動檔案失敗:", error);
      toast.error("移動檔案失敗");
      return false;
    }
  }, [service, selectedPath, refresh]);

  const handleCreateFolder = useCallback(async (path: string): Promise<boolean> => {
    if (!service) return false;
    try {
      const success = await service.createFolder(path);
      if (success) {
        await refresh();
        toast.success("資料夾建立成功");
      }
      return success;
    } catch (error) {
      console.error("建立資料夾失敗:", error);
      toast.error("建立資料夾失敗");
      return false;
    }
  }, [service, refresh]);

  // 在特定資料夾下建立檔案
  const handleCreateFileInFolder = useCallback((folderPath: string) => {
    setTargetFolder(folderPath);
    setIsCreateDialogOpen(true);
  }, []);

  // 在特定資料夾下建立子資料夾
  const handleCreateFolderInFolder = useCallback((folderPath: string) => {
    setTargetFolder(folderPath);
    setIsCreateFolderDialogOpen(true);
  }, []);

  // 關閉對話框時重置目標資料夾
  const handleCreateDialogChange = useCallback((open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      setTargetFolder("");
    }
  }, []);

  const handleCreateFolderDialogChange = useCallback((open: boolean) => {
    setIsCreateFolderDialogOpen(open);
    if (!open) {
      setTargetFolder("");
    }
  }, []);

  const handleRenameDialogChange = useCallback((open: boolean) => {
    setIsRenameDialogOpen(open);
    if (!open) {
      setRenameTargetPath("");
    }
  }, []);

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

  const handleUploadFiles = useCallback(async (uploadedFiles: File[], targetFolder?: string): Promise<void> => {
    if (!service) return;
    try {
      for (const file of uploadedFiles) {
        await service.uploadFile(file, targetFolder);
      }
      await refresh();
      const folderMsg = targetFolder ? ` 到 ${targetFolder}` : "";
      toast.success(`成功上傳 ${uploadedFiles.length} 個檔案${folderMsg}`);
    } catch (error) {
      console.error("上傳檔案失敗:", error);
      toast.error("上傳檔案失敗");
    }
  }, [service, refresh]);

  // 顯示連接表單
  if (!isConnected) {
    return <ConnectForm onConnect={connect} isConnecting={isConnecting} error={error} />;
  }

  // 獲取重命名對話框需要的資訊
  const getRenameInfo = () => {
    if (renameTargetPath) {
      const name = renameTargetPath.split("/").pop() || "";
      return { path: renameTargetPath, name };
    }
    return { path: content?.path || "", name: content?.name || "" };
  };

  const renameInfo = getRenameInfo();

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
              onCreateFile={() => {
                setTargetFolder("");
                setIsCreateDialogOpen(true);
              }}
              onCreateFolder={() => {
                setTargetFolder("");
                setIsCreateFolderDialogOpen(true);
              }}
              onUploadFiles={handleUploadFiles}
              onDeleteFile={handleDeleteFileFromTree}
              onRenameFile={handleRenameFromTree}
              onMoveFile={handleMoveFile}
              onCreateFileInFolder={handleCreateFileInFolder}
              onCreateFolderInFolder={handleCreateFolderInFolder}
              repoBaseUrl={config ? `https://raw.githubusercontent.com/${config.owner}/${config.repo}/main` : undefined}
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
            onRename={content ? () => {
              setRenameTargetPath("");
              setIsRenameDialogOpen(true);
            } : undefined}
            files={files}
            onNavigate={handleSelectFile}
            onUploadImage={handleUploadImage}
            githubService={service}
            repoBaseUrl={config ? `https://raw.githubusercontent.com/${config.owner}/${config.repo}/main` : undefined}
          />
        </main>
      </div>

      {/* Dialogs */}
      <CreateFileDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogChange}
        onCreateFile={handleCreateFile}
        currentFolder={targetFolder}
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
        onOpenChange={handleRenameDialogChange}
        onRename={handleRenameFile}
        currentPath={renameInfo.path}
        currentName={renameInfo.name}
      />

      <CreateFolderDialog
        open={isCreateFolderDialogOpen}
        onOpenChange={handleCreateFolderDialogChange}
        onCreateFolder={handleCreateFolder}
        currentFolder={targetFolder}
      />
    </div>
  );
};

export default Index;
