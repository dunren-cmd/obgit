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
import { encrypt, decrypt, isEncrypted, clearEncryptionKey } from "@/lib/crypto";

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

// 安全儲存設定（加密 token）
async function saveConfigSecurely(config: GitHubConfig): Promise<void> {
  try {
    const configJson = JSON.stringify(config);
    const encryptedData = await encrypt(configJson);
    localStorage.setItem(STORAGE_KEY, encryptedData);
  } catch (error) {
    console.error("Failed to save config securely");
    throw error;
  }
}

// 安全讀取設定（解密 token）
async function loadConfigSecurely(): Promise<GitHubConfig | null> {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) return null;

    // 檢查是否為舊格式（未加密的 JSON）
    if (!isEncrypted(savedData)) {
      // 遷移舊資料：解析後重新加密儲存
      const config = JSON.parse(savedData) as GitHubConfig;
      await saveConfigSecurely(config);
      return config;
    }

    // 解密資料
    const decryptedJson = await decrypt(savedData);
    return JSON.parse(decryptedJson) as GitHubConfig;
  } catch (error) {
    console.error("Failed to load config");
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function useGitHub(): UseGitHubReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GitHubConfig | null>(null);
  const [service, setService] = useState<GitHubService | null>(null);

  // 初始化時嘗試從本地存儲恢復連接（使用加密）
  useEffect(() => {
    const initConnection = async () => {
      const savedConfig = await loadConfigSecurely();
      if (savedConfig) {
        connect(savedConfig);
      }
    };
    initConnection();
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
        // 使用加密儲存
        await saveConfigSecurely(newConfig);
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

  const disconnect = useCallback(async () => {
    clearGitHubService();
    setConfig(null);
    setService(null);
    setIsConnected(false);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    // 可選：清除加密金鑰（完全清除痕跡）
    // await clearEncryptionKey();
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
  isLoaded: boolean;
  refresh: () => Promise<void>;
}

export function useFileTree(service: GitHubService | null, autoLoad: boolean = false): UseFileTreeReturn {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!service) return;

    setIsLoading(true);
    setError(null);

    try {
      const tree = await service.getRepoContent();
      setFiles(tree);
      setIsLoaded(true);
    } catch (err: any) {
      setError(err.message || "載入檔案失敗");
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (service && autoLoad && !isLoaded) {
      refresh();
    }
  }, [service, autoLoad, isLoaded, refresh]);

  // 重置狀態當 service 變更
  useEffect(() => {
    if (!service) {
      setFiles([]);
      setIsLoaded(false);
    }
  }, [service]);

  return { files, isLoading, error, isLoaded, refresh };
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
