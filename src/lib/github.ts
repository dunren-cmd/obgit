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

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.owner = config.owner;
    this.repo = config.repo;
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
   * 獲取儲存庫內容（遞迴）
   */
  async getRepoContent(path: string = ""): Promise<FileNode[]> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });

      if (!Array.isArray(response.data)) {
        return [];
      }

      const nodes: FileNode[] = [];

      for (const item of response.data) {
        // 只處理 .md 檔案和目錄
        if (item.type === "file" && !item.name.endsWith(".md")) {
          continue;
        }

        const node: FileNode = {
          name: item.name,
          path: item.path,
          type: item.type as "file" | "dir",
          sha: item.sha,
        };

        if (item.type === "dir") {
          // 遞迴獲取子目錄內容
          node.children = await this.getRepoContent(item.path);
          // 只添加包含 .md 檔案的目錄
          if (node.children.length > 0) {
            nodes.push(node);
          }
        } else {
          nodes.push(node);
        }
      }

      // 排序：目錄優先，然後按名稱排序
      return nodes.sort((a, b) => {
        if (a.type === "dir" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "dir") return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error: any) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * 獲取檔案內容
   */
  async getFileContent(path: string): Promise<FileContent> {
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
      
      return {
        content: decodeURIComponent(escape(content)),
        sha: response.data.sha,
        path: response.data.path,
        name: response.data.name,
      };
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

      return {
        sha: response.data.content?.sha || "",
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
