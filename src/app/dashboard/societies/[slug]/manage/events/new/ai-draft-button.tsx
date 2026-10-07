"use client";

import { useState } from "react";
import { draftEventDescription } from "@/actions/ai";

export function AiDraftButton({ societyName }: { societyName: string }) {
  const [highlights, setHighlights] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");

  async function handleDraft() {
    const title = (document.getElementById("title") as HTMLInputElement | null)?.value ?? "";
    if (!title.trim()) {
      setError("Enter a title first.");
      return;
    }

    setLoading(true);
    setError("");
    setAnnouncement("");

    try {
      const venueSelect = document.getElementById("venueId") as HTMLSelectElement | null;
      const venueName = venueSelect?.selectedOptions[0]?.textContent ?? "";
      const startAt = (document.getElementById("startAt") as HTMLInputElement | null)?.value ?? "";

      const result = await draftEventDescription({ title, societyName, venueName, startAt, highlights });

      const descriptionField = document.getElementById("description") as HTMLTextAreaElement | null;
      if (descriptionField) descriptionField.value = result.description;
      setAnnouncement(result.announcement);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI drafting failed — enter the description manually.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-foreground/20 p-3">
      <label htmlFor="highlights" className="block text-sm font-medium">
        Key highlights <span className="text-foreground/50">(optional — used only to draft the description below)</span>
      </label>
      <textarea
        id="highlights"
        value={highlights}
        onChange={(e) => setHighlights(e.target.value)}
        rows={2}
        placeholder="e.g. guest speaker from Google, open to all branches, free snacks"
        className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 text-sm"
      />
      <button
        type="button"
        onClick={handleDraft}
        disabled={loading}
        className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5 disabled:opacity-50"
      >
        {loading ? "Drafting…" : "Draft description with AI"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {announcement && (
        <p className="text-xs text-foreground/60">Suggested announcement: &quot;{announcement}&quot;</p>
      )}
    </div>
  );
}
