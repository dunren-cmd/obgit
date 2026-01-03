import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  CheckSquare,
  Minus,
} from "lucide-react";

interface FormatAction {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  action: (text: string, selectionStart: number, selectionEnd: number) => {
    newText: string;
    newCursorStart: number;
    newCursorEnd: number;
  };
}

const formatActions: FormatAction[] = [
  {
    icon: <Bold className="w-4 h-4" />,
    label: "粗體",
    shortcut: "Ctrl+B",
    action: (text, start, end) => {
      const selected = text.slice(start, end);
      const newText = text.slice(0, start) + `**${selected}**` + text.slice(end);
      return {
        newText,
        newCursorStart: start + 2,
        newCursorEnd: end + 2,
      };
    },
  },
  {
    icon: <Italic className="w-4 h-4" />,
    label: "斜體",
    shortcut: "Ctrl+I",
    action: (text, start, end) => {
      const selected = text.slice(start, end);
      const newText = text.slice(0, start) + `*${selected}*` + text.slice(end);
      return {
        newText,
        newCursorStart: start + 1,
        newCursorEnd: end + 1,
      };
    },
  },
  {
    icon: <Strikethrough className="w-4 h-4" />,
    label: "刪除線",
    action: (text, start, end) => {
      const selected = text.slice(start, end);
      const newText = text.slice(0, start) + `~~${selected}~~` + text.slice(end);
      return {
        newText,
        newCursorStart: start + 2,
        newCursorEnd: end + 2,
      };
    },
  },
  {
    icon: <Heading1 className="w-4 h-4" />,
    label: "標題 1",
    action: (text, start, end) => {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const newText = text.slice(0, lineStart) + "# " + text.slice(lineStart);
      return {
        newText,
        newCursorStart: start + 2,
        newCursorEnd: end + 2,
      };
    },
  },
  {
    icon: <Heading2 className="w-4 h-4" />,
    label: "標題 2",
    action: (text, start, end) => {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const newText = text.slice(0, lineStart) + "## " + text.slice(lineStart);
      return {
        newText,
        newCursorStart: start + 3,
        newCursorEnd: end + 3,
      };
    },
  },
  {
    icon: <Heading3 className="w-4 h-4" />,
    label: "標題 3",
    action: (text, start, end) => {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const newText = text.slice(0, lineStart) + "### " + text.slice(lineStart);
      return {
        newText,
        newCursorStart: start + 4,
        newCursorEnd: end + 4,
      };
    },
  },
  {
    icon: <List className="w-4 h-4" />,
    label: "無序列表",
    action: (text, start, end) => {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const newText = text.slice(0, lineStart) + "- " + text.slice(lineStart);
      return {
        newText,
        newCursorStart: start + 2,
        newCursorEnd: end + 2,
      };
    },
  },
  {
    icon: <ListOrdered className="w-4 h-4" />,
    label: "有序列表",
    action: (text, start, end) => {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const newText = text.slice(0, lineStart) + "1. " + text.slice(lineStart);
      return {
        newText,
        newCursorStart: start + 3,
        newCursorEnd: end + 3,
      };
    },
  },
  {
    icon: <CheckSquare className="w-4 h-4" />,
    label: "任務列表",
    action: (text, start, end) => {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const newText = text.slice(0, lineStart) + "- [ ] " + text.slice(lineStart);
      return {
        newText,
        newCursorStart: start + 6,
        newCursorEnd: end + 6,
      };
    },
  },
  {
    icon: <Quote className="w-4 h-4" />,
    label: "引用",
    action: (text, start, end) => {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const newText = text.slice(0, lineStart) + "> " + text.slice(lineStart);
      return {
        newText,
        newCursorStart: start + 2,
        newCursorEnd: end + 2,
      };
    },
  },
  {
    icon: <Code className="w-4 h-4" />,
    label: "程式碼",
    action: (text, start, end) => {
      const selected = text.slice(start, end);
      if (selected.includes("\n")) {
        const newText = text.slice(0, start) + "```\n" + selected + "\n```" + text.slice(end);
        return {
          newText,
          newCursorStart: start + 4,
          newCursorEnd: end + 4,
        };
      }
      const newText = text.slice(0, start) + "`" + selected + "`" + text.slice(end);
      return {
        newText,
        newCursorStart: start + 1,
        newCursorEnd: end + 1,
      };
    },
  },
  {
    icon: <Link className="w-4 h-4" />,
    label: "連結",
    action: (text, start, end) => {
      const selected = text.slice(start, end);
      const newText = text.slice(0, start) + `[${selected}](url)` + text.slice(end);
      return {
        newText,
        newCursorStart: end + 3,
        newCursorEnd: end + 6,
      };
    },
  },
  {
    icon: <Image className="w-4 h-4" />,
    label: "圖片",
    action: (text, start, end) => {
      const selected = text.slice(start, end);
      const newText = text.slice(0, start) + `![${selected}](url)` + text.slice(end);
      return {
        newText,
        newCursorStart: end + 4,
        newCursorEnd: end + 7,
      };
    },
  },
  {
    icon: <Minus className="w-4 h-4" />,
    label: "分隔線",
    action: (text, start, end) => {
      const newText = text.slice(0, start) + "\n---\n" + text.slice(end);
      return {
        newText,
        newCursorStart: start + 5,
        newCursorEnd: start + 5,
      };
    },
  },
];

interface FormattingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  onContentChange: (newContent: string) => void;
}

export function FormattingToolbar({
  textareaRef,
  content,
  onContentChange,
}: FormattingToolbarProps) {
  const applyFormat = useCallback(
    (action: FormatAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const result = action.action(content, start, end);

      onContentChange(result.newText);

      // 恢復游標位置
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.newCursorStart, result.newCursorEnd);
      });
    },
    [content, onContentChange, textareaRef]
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-card/30 overflow-x-auto">
        {formatActions.map((action, index) => (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={() => applyFormat(action)}
              >
                {action.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>{action.label}</p>
              {action.shortcut && (
                <p className="text-muted-foreground">{action.shortcut}</p>
              )}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
