import { useState, useEffect, useCallback } from "react";
import {
  GitHubService,
  GitHubConfig,
  FileNode,
  FileContent,
  initGitHubService,
  getGitHubService,
  clearGitHubService,
} from "@/lib/github";

const STORAGE_KEY = "obsidian-web-github-config";

interface UseGitHubReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  config: GitHubConfig | null;
  connect: (config: GitHubConfig) => Promise<boolean>;
  disconnect: () => void;
  service: GitHubService | null;
}

export function useGitHub(): UseGitHubReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GitHubConfig | null>(null);
  const [service, setService] = useState<GitHubService | null>(null);

  // 初始化時嘗試從本地存儲恢復連接
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as GitHubConfig;
        connect(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const connect = useCallback(async (newConfig: GitHubConfig): Promise<boolean> => {
    setIsConnecting(true);
    setError(null);

    try {
      const newService = initGitHubService(newConfig);
      const isValid = await newService.validateConnection();

      if (isValid) {
        setConfig(newConfig);
        setService(newService);
        setIsConnected(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
        return true;
      } else {
        setError("無法連接到儲存庫，請檢查設定");
        clearGitHubService();
        return false;
      }
    } catch (err: any) {
      const message = err.message || "連接失敗";
      if (err.status === 401) {
        setError("Token 無效或已過期");
      } else if (err.status === 404) {
        setError("找不到儲存庫，請確認擁有者和儲存庫名稱");
      } else {
        setError(message);
      }
      clearGitHubService();
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    clearGitHubService();
    setConfig(null);
    setService(null);
    setIsConnected(false);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    config,
    connect,
    disconnect,
    service,
  };
}

interface UseFileTreeReturn {
  files: FileNode[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFileTree(service: GitHubService | null): UseFileTreeReturn {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!service) return;

    setIsLoading(true);
    setError(null);

    try {
      const tree = await service.getRepoContent();
      setFiles(tree);
    } catch (err: any) {
      setError(err.message || "載入檔案失敗");
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (service) {
      refresh();
    }
  }, [service, refresh]);

  return { files, isLoading, error, refresh };
}

interface UseFileContentReturn {
  content: FileContent | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  load: (path: string) => Promise<void>;
  save: (content: string) => Promise<boolean>;
  saveStatus: "idle" | "saving" | "saved" | "error";
}

export function useFileContent(service: GitHubService | null): UseFileContentReturn {
  const [content, setContent] = useState<FileContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const load = useCallback(async (path: string) => {
    if (!service) return;

    setIsLoading(true);
    setError(null);
    setSaveStatus("idle");

    try {
      const fileContent = await service.getFileContent(path);
      setContent(fileContent);
    } catch (err: any) {
      setError(err.message || "載入檔案失敗");
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const save = useCallback(async (newContent: string): Promise<boolean> => {
    if (!service || !content) return false;

    setIsSaving(true);
    setSaveStatus("saving");
    setError(null);

    try {
      const result = await service.saveFile(content.path, newContent, content.sha);
      setContent(prev => prev ? { ...prev, content: newContent, sha: result.sha } : null);
      setSaveStatus("saved");
      
      // 3秒後重置狀態
      setTimeout(() => setSaveStatus("idle"), 3000);
      
      return true;
    } catch (err: any) {
      setError(err.message || "儲存失敗");
      setSaveStatus("error");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [service, content]);

  return { content, isLoading, isSaving, error, load, save, saveStatus };
}
