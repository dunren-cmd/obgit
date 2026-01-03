import {
  FileText,
  FileCode,
  FileJson,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  FileType,
  Globe,
  Palette,
  Database,
  Settings,
  FileArchive,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileIconProps {
  fileName: string;
  className?: string;
}

// 根據副檔名取得對應的圖示和顏色
const getFileIconConfig = (fileName: string) => {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  // Markdown
  if (ext === 'md' || ext === 'mdx' || ext === 'markdown') {
    return { icon: FileText, color: 'text-blue-500' };
  }
  
  // HTML
  if (ext === 'html' || ext === 'htm') {
    return { icon: Globe, color: 'text-orange-500' };
  }
  
  // CSS/SCSS/LESS
  if (ext === 'css' || ext === 'scss' || ext === 'sass' || ext === 'less') {
    return { icon: Palette, color: 'text-purple-500' };
  }
  
  // JavaScript/TypeScript
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs') {
    return { icon: FileCode, color: 'text-yellow-500' };
  }
  if (ext === 'ts' || ext === 'tsx') {
    return { icon: FileCode, color: 'text-blue-600' };
  }
  
  // JSON/YAML/TOML
  if (ext === 'json' || ext === 'jsonc') {
    return { icon: FileJson, color: 'text-yellow-600' };
  }
  if (ext === 'yaml' || ext === 'yml' || ext === 'toml') {
    return { icon: Settings, color: 'text-red-400' };
  }
  
  // 圖片
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext)) {
    return { icon: FileImage, color: 'text-green-500' };
  }
  
  // 影片
  if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) {
    return { icon: FileVideo, color: 'text-pink-500' };
  }
  
  // 音訊
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
    return { icon: FileAudio, color: 'text-indigo-500' };
  }
  
  // 壓縮檔
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { icon: FileArchive, color: 'text-amber-600' };
  }
  
  // 試算表
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return { icon: FileSpreadsheet, color: 'text-green-600' };
  }
  
  // 簡報
  if (['pptx', 'ppt'].includes(ext)) {
    return { icon: Presentation, color: 'text-red-500' };
  }
  
  // 文件
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return { icon: FileType, color: 'text-red-600' };
  }
  
  // 資料庫
  if (['sql', 'db', 'sqlite'].includes(ext)) {
    return { icon: Database, color: 'text-cyan-600' };
  }
  
  // 預設
  return { icon: File, color: 'text-muted-foreground' };
};

export function FileIcon({ fileName, className }: FileIconProps) {
  const { icon: Icon, color } = getFileIconConfig(fileName);
  
  return <Icon className={cn("w-4 h-4 flex-shrink-0", color, className)} />;
}
