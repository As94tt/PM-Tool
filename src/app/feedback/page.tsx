"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bug, Lightbulb, Plus, X, StickyNote, ThumbsUp } from "lucide-react";
import { useAppStore } from "@/store/app-store-provider";
import { useCurrentPerson } from "@/store/hooks";
import { fullName, initials } from "@/lib/data/queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { selectLabel } from "@/lib/select-utils";
import { cn } from "@/lib/utils";
import type { FeedbackType } from "@/lib/types";

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature request" },
];

const TYPE_STYLES: Record<FeedbackType, { bg: string; icon: typeof Bug; label: string }> = {
  bug: { bg: "bg-[#fce4e8] dark:bg-[#3a2530]", icon: Bug, label: "Bug" },
  feature: { bg: "bg-[#fff4d6] dark:bg-[#3a3120]", icon: Lightbulb, label: "Feature request" },
};

const ROTATIONS = ["-rotate-1", "rotate-1", "-rotate-2", "rotate-2", "rotate-0"];

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function FeedbackPage() {
  const feedbackNotes = useAppStore((s) => s.feedbackNotes);
  const people = useAppStore((s) => s.people);
  const addFeedbackNote = useAppStore((s) => s.addFeedbackNote);
  const removeFeedbackNote = useAppStore((s) => s.removeFeedbackNote);
  const toggleFeedbackVote = useAppStore((s) => s.toggleFeedbackVote);
  const currentPerson = useCurrentPerson();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [text, setText] = useState("");

  function handleSubmit() {
    if (!text.trim()) return;
    addFeedbackNote({ type, text: text.trim(), authorPersonId: currentPerson.id });
    toast.success(type === "bug" ? "Bug reported" : "Feature request added");
    setText("");
    setType("bug");
    setOpen(false);
  }

  function handleRemove(id: string) {
    removeFeedbackNote(id);
    toast.success("Removed");
  }

  function handleToggleVote(id: string) {
    toggleFeedbackVote(id, currentPerson.id);
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Bugs & Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Found something broken, or have an idea? Pin a sticky note for the team.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" /> Add sticky
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New sticky note</DialogTitle>
              <DialogDescription>Describe a bug you hit or a feature you&apos;d like to see.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Select value={type} onValueChange={(v) => v && setType(v as FeedbackType)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{selectLabel(TYPE_OPTIONS, "Type")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  type === "bug"
                    ? "What broke? What did you expect to happen instead?"
                    : "What would you like the platform to do?"
                }
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!text.trim()}>
                Pin note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {feedbackNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-24 text-center">
          <StickyNote className="size-8 text-muted-foreground" />
          <div>
            <p className="font-heading text-lg font-semibold">No notes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to pin a bug or feature idea.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {feedbackNotes.map((note, i) => {
            const author = people.find((p) => p.id === note.authorPersonId);
            const style = TYPE_STYLES[note.type];
            const Icon = style.icon;
            const hasVoted = note.votedByPersonIds.includes(currentPerson.id);
            const voteCount = note.votedByPersonIds.length;
            return (
              <div
                key={note.id}
                className={cn(
                  "group relative flex flex-col gap-3 rounded-lg p-4 shadow-elevation-1 transition-transform duration-200 hover:rotate-0 hover:scale-[1.02]",
                  style.bg,
                  ROTATIONS[i % ROTATIONS.length]
                )}
              >
                <button
                  onClick={() => handleRemove(note.id)}
                  aria-label="Remove note"
                  className="absolute top-2 right-2 rounded-full p-1 text-foreground/40 opacity-0 transition-opacity hover:bg-black/5 hover:text-foreground group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-foreground/70 dark:bg-white/10">
                  <Icon className="size-3" /> {style.label}
                </span>
                <p className="min-h-[3rem] flex-1 text-sm whitespace-pre-wrap text-foreground/90">{note.text}</p>
                <div className="flex items-center justify-between gap-2 border-t border-black/5 pt-2 dark:border-white/10">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-5">
                      <AvatarImage src={author?.avatarUrl} alt={author ? fullName(author) : ""} />
                      <AvatarFallback className="text-[9px]">{author ? initials(author) : "?"}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-[11px] text-foreground/60">
                      {author ? fullName(author) : "Unknown"} · {formatWhen(note.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleVote(note.id)}
                    aria-pressed={hasVoted}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                      hasVoted
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/60 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                    )}
                  >
                    <ThumbsUp className={cn("size-3", hasVoted && "fill-current")} /> {voteCount}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
