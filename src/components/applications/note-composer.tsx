"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

interface NoteComposerProps {
  disabled?: boolean;
  onSubmit: (body: string) => Promise<boolean>;
}

export function NoteComposer({
  disabled,
  onSubmit,
}: NoteComposerProps) {
  const [body, setBody] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mentionUsersQuery = api.notes.mentionUsers.useQuery(
    { search: mentionQuery ?? undefined, limit: 8 },
    { enabled: mentionQuery !== null && mentionQuery.length >= 0 },
  );

  function updateMentionState(value: string, cursor: number) {
    const beforeCursor = value.slice(0, cursor);
    const atIndex = beforeCursor.lastIndexOf("@");
    if (atIndex === -1) {
      setMentionQuery(null);
      setMentionStart(null);
      return;
    }

    const charBefore = atIndex > 0 ? beforeCursor[atIndex - 1] : " ";
    if (charBefore && !/\s/.test(charBefore)) {
      setMentionQuery(null);
      setMentionStart(null);
      return;
    }

    const query = beforeCursor.slice(atIndex + 1);
    if (/\s/.test(query)) {
      setMentionQuery(null);
      setMentionStart(null);
      return;
    }

    setMentionStart(atIndex);
    setMentionQuery(query);
  }

  function insertMention(user: { name: string | null; email: string }) {
    if (mentionStart === null || !textareaRef.current) return;
    const label = user.name ?? user.email.split("@")[0] ?? user.email;
    const before = body.slice(0, mentionStart);
    const after = body.slice(textareaRef.current.selectionStart);
    const next = `${before}@${label} ${after}`;
    setBody(next);
    setMentionQuery(null);
    setMentionStart(null);
    textareaRef.current.focus();
  }

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setIsPending(true);
    const success = await onSubmit(trimmed);
    setIsPending(false);
    if (success) {
      setBody("");
      setMentionQuery(null);
      setMentionStart(null);
    }
  }

  useEffect(() => {
    if (mentionQuery === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMentionQuery(null);
        setMentionStart(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mentionQuery]);

  const suggestions = mentionUsersQuery.data ?? [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={body}
          disabled={disabled || isPending}
          placeholder="Add a note… Use @name to mention a teammate"
          rows={3}
          onChange={(event) => {
            setBody(event.target.value);
            updateMentionState(
              event.target.value,
              event.target.selectionStart,
            );
          }}
          onClick={(event) => {
            updateMentionState(
              event.currentTarget.value,
              event.currentTarget.selectionStart,
            );
          }}
          onKeyUp={(event) => {
            updateMentionState(
              event.currentTarget.value,
              event.currentTarget.selectionStart,
            );
          }}
        />
        {mentionQuery !== null && suggestions.length > 0 ? (
          <div className="bg-popover absolute z-10 mt-1 w-full rounded-md border shadow-md">
            <ul className="max-h-40 overflow-y-auto py-1">
              {suggestions.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertMention(user);
                    }}
                  >
                    {user.name ?? user.email}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {user.email}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={disabled || isPending || !body.trim()}
          onClick={() => void handleSubmit()}
        >
          {isPending ? "Posting…" : "Post note"}
        </Button>
      </div>
    </div>
  );
}
