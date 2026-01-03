import { useCallback, useMemo, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { FileNode, GitHubService } from "@/lib/github";
import { Loader2 } from "lucide-react";

interface WikilinkRendererProps {
  content: string;
  files: FileNode[];
  onNavigate: (path: string) => void;
  githubService?: GitHubService | null;
  repoBaseUrl?: string;
}

function flattenFiles(nodes: FileNode[], result: FileNode[] = []): FileNode[] {
  for (const node of nodes) {
    if (node.type === "file") {
      result.push(node);
    }
    if (node.children) {
      flattenFiles(node.children, result);
    }
  }
  return result;
}

// 圖片元件 - 支援從 GitHub API 載入私有 repo 圖片
function GitHubImage({ 
  src, 
  alt, 
  githubService,
  repoBaseUrl 
}: { 
  src: string; 
  alt: string; 
  githubService?: GitHubService | null;
  repoBaseUrl?: string;
}) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 如果是 raw.githubusercontent.com 的連結且有 service，嘗試用 API 載入
    if (githubService && repoBaseUrl && src.startsWith(repoBaseUrl)) {
      const path = src.replace(repoBaseUrl + '/', '');
      setIsLoading(true);
      setError(false);
      
      githubService.getImageDataUrl(path)
        .then((dataUrl) => {
          if (dataUrl) {
            setImageSrc(dataUrl);
          }
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
          // 保持原始 URL，讓 onError 處理
        });
    }
  }, [src, githubService, repoBaseUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg my-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">載入圖片中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-sm p-2 bg-destructive/10 rounded border border-destructive/20 my-4">
        無法載入圖片: {alt || src}
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt || ""}
      className="max-w-full h-auto rounded-lg my-4"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

export function WikilinkRenderer({
  content,
  files,
  onNavigate,
  githubService,
  repoBaseUrl,
}: WikilinkRendererProps) {
  const flatFiles = useMemo(() => flattenFiles(files), [files]);

  // 找到匹配的檔案
  const findFile = useCallback(
    (linkText: string): FileNode | undefined => {
      const normalizedLink = linkText.toLowerCase().trim();
      
      // 嘗試完全匹配名稱（不含 .md）
      let match = flatFiles.find((f) => {
        const nameWithoutExt = f.name.replace(/\.md$/, "").toLowerCase();
        return nameWithoutExt === normalizedLink;
      });

      if (match) return match;

      // 嘗試匹配路徑
      match = flatFiles.find((f) => {
        const pathWithoutExt = f.path.replace(/\.md$/, "").toLowerCase();
        return pathWithoutExt === normalizedLink || pathWithoutExt.endsWith(`/${normalizedLink}`);
      });

      return match;
    },
    [flatFiles]
  );

  // 將 [[wikilink]] 轉換為可點擊的連結
  const processedContent = useMemo(() => {
    // 匹配 [[連結]] 或 [[連結|顯示文字]]
    const wikilinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    
    return content.replace(wikilinkRegex, (match, link, displayText) => {
      const file = findFile(link);
      const text = displayText || link;
      
      if (file) {
        // 使用特殊標記，稍後在渲染時處理
        return `[${text}](wikilink:${file.path})`;
      } else {
        // 未找到的連結顯示為紅色
        return `[${text}](wikilink-missing:${link})`;
      }
    });
  }, [content, findFile]);

  return (
    <ReactMarkdown
      components={{
        a: ({ href, children }) => {
          if (href?.startsWith("wikilink:")) {
            const path = href.replace("wikilink:", "");
            return (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(path);
                }}
                className="text-primary hover:underline cursor-pointer font-medium"
              >
                {children}
              </button>
            );
          }
          
          if (href?.startsWith("wikilink-missing:")) {
            return (
              <span className="text-destructive opacity-70 cursor-not-allowed">
                {children}
              </span>
            );
          }

          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          );
        },
        img: ({ src, alt }) => {
          if (!src) return null;
          return (
            <GitHubImage 
              src={src} 
              alt={alt || ""} 
              githubService={githubService}
              repoBaseUrl={repoBaseUrl}
            />
          );
        },
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
}
