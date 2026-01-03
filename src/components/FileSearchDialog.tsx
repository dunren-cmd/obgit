import { useState, useMemo, useEffect } from "react";
import { FileNode } from "@/lib/github";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { File, Folder } from "lucide-react";

interface FileSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: FileNode[];
  onSelectFile: (path: string) => void;
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

export function FileSearchDialog({
  open,
  onOpenChange,
  files,
  onSelectFile,
}: FileSearchDialogProps) {
  const [search, setSearch] = useState("");

  const flatFiles = useMemo(() => flattenFiles(files), [files]);

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return flatFiles;
    const lowerSearch = search.toLowerCase();
    return flatFiles.filter(
      (file) =>
        file.name.toLowerCase().includes(lowerSearch) ||
        file.path.toLowerCase().includes(lowerSearch)
    );
  }, [flatFiles, search]);

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleSelect = (path: string) => {
    onSelectFile(path);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="搜尋檔案..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>找不到檔案</CommandEmpty>
        <CommandGroup heading="檔案">
          {filteredFiles.map((file) => (
            <CommandItem
              key={file.path}
              value={file.path}
              onSelect={() => handleSelect(file.path)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <File className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm">{file.name}</span>
                {file.path !== file.name && (
                  <span className="text-xs text-muted-foreground">
                    {file.path}
                  </span>
                )}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
