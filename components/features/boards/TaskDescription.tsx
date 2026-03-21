"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

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
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }: ComponentPropsWithoutRef<"a">) => {
            if (href?.startsWith("/")) {
              return (
                <Link href={href} className="text-primary hover:underline" {...props}>
                  {children}
                </Link>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
