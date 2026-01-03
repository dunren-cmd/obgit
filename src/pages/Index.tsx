import { useState } from "react";
import { useGitHub, useFileTree, useFileContent } from "@/hooks/useGitHub";
import { ConnectForm } from "@/components/ConnectForm";
import { FileTree } from "@/components/FileTree";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { LogOut, Github, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const { isConnected, isConnecting, error, config, connect, disconnect, service } = useGitHub();
  const { files, isLoading: isLoadingFiles, refresh } = useFileTree(service);
  const { content, isLoading: isLoadingContent, isSaving, saveStatus, load, save } = useFileContent(service);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleSelectFile = async (path: string) => {
    setSelectedPath(path);
    await load(path);
  };

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

        <Button
          variant="ghost"
          size="sm"
          onClick={disconnect}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">登出</span>
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "w-64 border-r border-sidebar-border flex-shrink-0 transition-all duration-300",
            "absolute lg:relative z-10 h-[calc(100vh-49px)] lg:h-auto",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
          )}
        >
          <FileTree
            files={files}
            isLoading={isLoadingFiles}
            selectedPath={selectedPath}
            onSelectFile={handleSelectFile}
            onRefresh={refresh}
          />
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
          />
        </main>
      </div>
    </div>
  );
};

export default Index;
