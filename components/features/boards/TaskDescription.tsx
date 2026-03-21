"use client";

import dynamic from "next/dynamic";

const MarkdownPreview = dynamic(
  () => import("@uiw/react-markdown-preview").then((mod) => mod.default),
  { ssr: false }
);

interface TaskDescriptionProps {
  content: string;
  boardId: string;
}

// Regex to find #<24-char hex objectId> patterns
const TASK_REF_REGEX = /(#[a-f0-9]{24})/gi;

function preprocessTaskRefs(content: string, boardId: string): string {
  return content.replace(TASK_REF_REGEX, (match) => {
    const taskId = match.slice(1);
    return `[${match}](/boards/${boardId}?task=${taskId})`;
  });
}

export function TaskDescription({ content, boardId }: TaskDescriptionProps) {
  const processed = preprocessTaskRefs(content, boardId);

  return (
    <div className="text-foreground/90 w-full" onClick={(e) => e.stopPropagation()}>
      <MarkdownPreview
        source={processed}
        style={{
          backgroundColor: "transparent",
          color: "inherit",
        }}
      />
    </div>
  );
}
