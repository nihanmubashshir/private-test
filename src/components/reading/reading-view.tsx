"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import type { Book } from "@/lib/reading/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateBookSheet } from "./create-book-sheet";

export interface ReadingViewProps {
  books: Book[];
}

export function ReadingView({ books }: ReadingViewProps) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {books.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-neutral-800">
            <BookOpen className="size-6 text-neutral-400" strokeWidth={1.75} aria-hidden />
          </span>
          <h2 className="text-h2 text-neutral-50">No books yet</h2>
          <p className="text-body-sm max-w-xs text-neutral-400">Add a book to start tracking your reading.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {books.map((book) => {
            const percent = book.totalPages > 0 ? Math.round((book.pagesRead / book.totalPages) * 100) : 0;
            return (
              <Link
                key={book.id}
                href={`/reading/${book.id}`}
                className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3 active:bg-neutral-800"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-base text-neutral-50">{book.title}</span>
                  <span className="text-body-sm text-neutral-500">
                    {book.pagesRead} / {book.totalPages} pages
                  </span>
                </div>
                <Badge tone={book.status === "finished" ? "success" : "neutral"}>
                  {book.status === "finished" ? "Finished" : `${percent}%`}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}

      <Button fullWidth size="lg" className="h-13" onClick={() => setCreateOpen(true)}>
        <Plus className="size-4" strokeWidth={2} aria-hidden />
        Add a book
      </Button>

      <CreateBookSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
