import { useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { FileNode } from "@/lib/github";

interface WikilinkRendererProps {
  content: string;
  files: FileNode[];
  onNavigate: (path: string) => void;
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

export function WikilinkRenderer({
  content,
  files,
  onNavigate,
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
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
}
