import { Octokit } from "octokit";

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  sha?: string;
  children?: FileNode[];
}

export interface FileContent {
  content: string;
  sha: string;
  path: string;
  name: string;
}

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  
  // 快取機制
  private fileContentCache: Map<string, { content: FileContent; timestamp: number }> = new Map();
  private fileTreeCache: { tree: FileNode[]; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分鐘快取

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.fileContentCache.clear();
    this.fileTreeCache = null;
  }

  /**
   * 使快取的檔案內容失效
   */
  invalidateFileCache(path: string): void {
    this.fileContentCache.delete(path);
  }

  /**
   * 使檔案樹快取失效
   */
  invalidateTreeCache(): void {
    this.fileTreeCache = null;
  }

  /**
   * 驗證連接是否有效
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      return true;
    } catch (error) {
      console.error("連接驗證失敗:", error);
      return false;
    }
  }

  /**
   * 使用 Git Trees API 一次性獲取完整目錄結構（優化版本）
   */
  async getRepoContent(path: string = ""): Promise<FileNode[]> {
    // 檢查快取
    if (this.fileTreeCache && Date.now() - this.fileTreeCache.timestamp < this.CACHE_TTL) {
      if (path === "") {
        return this.fileTreeCache.tree;
      }
      // 如果請求子路徑，從快取的樹中提取
      return this.getSubtreeFromCache(path) || [];
    }

    try {
      // 獲取預設分支
      const repoInfo = await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      const defaultBranch = repoInfo.data.default_branch;

      // 使用 Git Trees API 一次性獲取完整目錄結構
      const treeResponse = await this.octokit.rest.git.getTree({
        owner: this.owner,
        repo: this.repo,
        tree_sha: defaultBranch,
        recursive: "1", // 遞迴獲取所有檔案
      });

      // 將扁平結構轉換為樹狀結構
      const tree = this.buildTreeFromFlatList(treeResponse.data.tree);
      
      // 更新快取
      this.fileTreeCache = { tree, timestamp: Date.now() };

      if (path === "") {
        return tree;
      }
      return this.getSubtreeFromCache(path) || [];
    } catch (error: any) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * 從快取的樹中獲取子樹
   */
  private getSubtreeFromCache(path: string): FileNode[] | null {
    if (!this.fileTreeCache) return null;
    
    const parts = path.split("/").filter(Boolean);
    let current: FileNode[] = this.fileTreeCache.tree;
    
    for (const part of parts) {
      const found = current.find(node => node.name === part && node.type === "dir");
      if (!found || !found.children) return null;
      current = found.children;
    }
    
    return current;
  }

  /**
   * 將 GitHub API 返回的扁平列表轉換為樹狀結構
   */
  private buildTreeFromFlatList(items: { path?: string; type?: string; sha?: string }[]): FileNode[] {
    const root: FileNode[] = [];
    const nodeMap = new Map<string, FileNode>();

    // 過濾並排序項目
    const sortedItems = items
      .filter(item => item.path && (item.type === "blob" || item.type === "tree"))
      .sort((a, b) => (a.path || "").localeCompare(b.path || ""));

    for (const item of sortedItems) {
      if (!item.path) continue;

      const parts = item.path.split("/");
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join("/");
      const type = item.type === "tree" ? "dir" : "file";

      const node: FileNode = {
        name,
        path: item.path,
        type,
        sha: item.sha,
        children: type === "dir" ? [] : undefined,
      };

      nodeMap.set(item.path, node);

      if (parentPath === "") {
        root.push(node);
      } else {
        const parent = nodeMap.get(parentPath);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      }
    }

    // 遞迴排序每個層級
    const sortNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.sort((a, b) => {
        if (a.type === "dir" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "dir") return 1;
        return a.name.localeCompare(b.name);
      }).map(node => {
        if (node.children && node.children.length > 0) {
          node.children = sortNodes(node.children);
        }
        return node;
      });
    };

    // 移除空目錄
    const removeEmptyDirs = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => {
        if (node.type === "dir") {
          if (node.children) {
            node.children = removeEmptyDirs(node.children);
          }
          return node.children && node.children.length > 0;
        }
        return true;
      });
    };

    return removeEmptyDirs(sortNodes(root));
  }

  /**
   * 獲取檔案內容（帶快取）
   */
  async getFileContent(path: string, skipCache: boolean = false): Promise<FileContent> {
    // 檢查快取
    if (!skipCache) {
      const cached = this.fileContentCache.get(path);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.content;
      }
    }

    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });

      if (Array.isArray(response.data) || response.data.type !== "file") {
        throw new Error("路徑不是檔案");
      }

      const content = atob(response.data.content.replace(/\n/g, ""));
      
      const fileContent: FileContent = {
        content: decodeURIComponent(escape(content)),
        sha: response.data.sha,
        path: response.data.path,
        name: response.data.name,
      };

      // 更新快取
      this.fileContentCache.set(path, { content: fileContent, timestamp: Date.now() });

      return fileContent;
    } catch (error: any) {
      if (error.status === 404) {
        // 新檔案
        const name = path.split("/").pop() || path;
        return {
          content: "",
          sha: "",
          path,
          name,
        };
      }
      throw error;
    }
  }

  /**
   * 獲取圖片檔案的 Data URL
   */
  async getImageDataUrl(path: string): Promise<string | null> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });

      if (Array.isArray(response.data) || response.data.type !== "file") {
        return null;
      }

      const base64Content = response.data.content.replace(/\n/g, "");
      const ext = path.split('.').pop()?.toLowerCase() || 'png';
      
      // 根據副檔名判斷 MIME type
      const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'ico': 'image/x-icon',
        'bmp': 'image/bmp',
      };
      
      const mimeType = mimeTypes[ext] || 'image/png';
      return `data:${mimeType};base64,${base64Content}`;
    } catch (error) {
      console.error('Failed to load image:', path, error);
      return null;
    }
  }

  /**
   * 儲存檔案（建立或更新）
   */
  async saveFile(
    path: string,
    content: string,
    sha?: string,
    message?: string
  ): Promise<{ sha: string; committed: boolean }> {
    try {
      // 如果沒有提供 sha，嘗試獲取當前檔案的 sha
      let currentSha = sha;
      if (!currentSha) {
        try {
          const existing = await this.getFileContent(path);
          currentSha = existing.sha;
        } catch {
          // 新檔案，不需要 sha
        }
      }

      const encodedContent = btoa(unescape(encodeURIComponent(content)));
      const commitMessage = message || `更新 ${path.split("/").pop()} via Web`;

      const response = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message: commitMessage,
        content: encodedContent,
        sha: currentSha || undefined,
      });

      const newSha = response.data.content?.sha || "";

      // 更新快取中的檔案內容
      const fileContent: FileContent = {
        content,
        sha: newSha,
        path,
        name: path.split("/").pop() || path,
      };
      this.fileContentCache.set(path, { content: fileContent, timestamp: Date.now() });
      
      // 使檔案樹快取失效（因為可能是新檔案）
      this.invalidateTreeCache();

      return {
        sha: newSha,
        committed: true,
      };
    } catch (error: any) {
      console.error("儲存檔案失敗:", error);
      throw error;
    }
  }

  /**
   * 刪除檔案
   */
  async deleteFile(path: string, sha: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path,
        message: `刪除 ${path.split("/").pop()} via Web`,
        sha,
      });
      
      // 清除快取
      this.invalidateFileCache(path);
      this.invalidateTreeCache();
      
      return true;
    } catch (error) {
      console.error("刪除檔案失敗:", error);
      return false;
    }
  }

  /**
   * 建立新檔案
   */
  async createFile(path: string, content: string = ""): Promise<FileContent> {
    const result = await this.saveFile(path, content, undefined, `建立 ${path.split("/").pop()} via Web`);
    return {
      content,
      sha: result.sha,
      path,
      name: path.split("/").pop() || path,
    };
  }

  /**
   * 重新命名檔案（透過建立新檔案並刪除舊檔案）
   */
  async renameFile(oldPath: string, newPath: string): Promise<FileContent> {
    try {
      // 獲取原始檔案內容
      const oldContent = await this.getFileContent(oldPath);
      
      // 建立新檔案
      const newFile = await this.createFile(newPath, oldContent.content);
      
      // 刪除舊檔案
      if (oldContent.sha) {
        await this.deleteFile(oldPath, oldContent.sha);
      }
      
      return newFile;
    } catch (error) {
      console.error("重新命名檔案失敗:", error);
      throw error;
    }
  }

  /**
   * 移動檔案到新位置
   */
  async moveFile(sourcePath: string, targetPath: string): Promise<FileContent> {
    return this.renameFile(sourcePath, targetPath);
  }

  /**
   * 遞迴獲取目錄下所有檔案路徑
   */
  private async getAllFilesInDirectory(path: string): Promise<{ path: string; sha: string }[]> {
    const files: { path: string; sha: string }[] = [];
    
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });

      if (!Array.isArray(response.data)) {
        return files;
      }

      for (const item of response.data) {
        if (item.type === "file") {
          files.push({ path: item.path, sha: item.sha });
        } else if (item.type === "dir") {
          const subFiles = await this.getAllFilesInDirectory(item.path);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error("Failed to get directory contents:", path);
    }
    
    return files;
  }

  /**
   * 移動整個目錄到新位置
   */
  async moveDirectory(sourcePath: string, targetPath: string): Promise<boolean> {
    try {
      // 獲取目錄下所有檔案
      const files = await this.getAllFilesInDirectory(sourcePath);
      
      // 移動每個檔案
      for (const file of files) {
        const relativePath = file.path.substring(sourcePath.length);
        const newFilePath = targetPath + relativePath;
        
        // 獲取檔案內容
        const content = await this.getFileContent(file.path);
        
        // 在新位置建立檔案
        await this.createFile(newFilePath, content.content);
        
        // 刪除原檔案
        await this.deleteFile(file.path, file.sha);
      }
      
      return true;
    } catch (error) {
      console.error("移動目錄失敗:", error);
      throw error;
    }
  }

  /**
   * 建立資料夾（透過建立一個 .gitkeep 或 placeholder 檔案）
   */
  async createFolder(path: string): Promise<boolean> {
    try {
      // GitHub 不支援空資料夾，需要建立一個佔位檔案
      const placeholderPath = `${path}/.gitkeep`;
      await this.saveFile(placeholderPath, "", undefined, `建立資料夾 ${path} via Web`);
      return true;
    } catch (error) {
      console.error("建立資料夾失敗:", error);
      return false;
    }
  }

  /**
   * 上傳圖片到儲存庫
   */
  async uploadImage(file: File, folder: string = "attachments"): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
      
      // 生成唯一檔名
      const timestamp = Date.now();
      const extension = file.name.split(".").pop() || "png";
      const fileName = `${timestamp}.${extension}`;
      const path = `${folder}/${fileName}`;

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message: `上傳圖片 ${fileName} via Web`,
        content: base64,
      });

      // 返回 raw GitHub URL
      return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/${path}`;
    } catch (error) {
      console.error("上傳圖片失敗:", error);
      throw error;
    }
  }

  /**
   * 上傳任意檔案到儲存庫
   */
  async uploadFile(file: File, targetFolder: string = ""): Promise<{ path: string; sha: string }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
      
      // 使用原始檔名
      const fileName = file.name;
      const path = targetFolder ? `${targetFolder}/${fileName}` : fileName;

      // 檢查檔案是否已存在，取得 sha
      let existingSha: string | undefined;
      try {
        const existingFile = await this.octokit.rest.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path,
        });
        if (!Array.isArray(existingFile.data) && existingFile.data.type === "file") {
          existingSha = existingFile.data.sha;
        }
      } catch {
        // 檔案不存在，不需要 sha
      }

      const response = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message: `上傳檔案 ${fileName} via Web`,
        content: base64,
        sha: existingSha,
      });

      return {
        path,
        sha: response.data.content?.sha || "",
      };
    } catch (error) {
      console.error("上傳檔案失敗:", error);
      throw error;
    }
  }
}

// 全域實例管理
let githubServiceInstance: GitHubService | null = null;

export function initGitHubService(config: GitHubConfig): GitHubService {
  githubServiceInstance = new GitHubService(config);
  return githubServiceInstance;
}

export function getGitHubService(): GitHubService | null {
  return githubServiceInstance;
}

export function clearGitHubService(): void {
  githubServiceInstance = null;
}
