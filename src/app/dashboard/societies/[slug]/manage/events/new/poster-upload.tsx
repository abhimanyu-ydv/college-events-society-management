"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PosterUpload() {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [posterUrl, setPosterUrl] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    const supabase = createClient();
    const path = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage.from("posters").upload(path, file);
    if (error) {
      setStatus("error");
      return;
    }

    const { data } = supabase.storage.from("posters").getPublicUrl(path);
    setPosterUrl(data.publicUrl);
    setStatus("done");
  }

  return (
    <div>
      <label htmlFor="poster" className="block text-sm font-medium">
        Poster <span className="text-foreground/50">(optional)</span>
      </label>
      <input
        id="poster"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="mt-1 w-full text-sm"
      />
      {status === "uploading" && <p className="mt-1 text-xs text-foreground/60">Uploading…</p>}
      {status === "error" && (
        <p className="mt-1 text-xs text-red-600">Upload failed. You can submit without a poster.</p>
      )}
      {status === "done" && <p className="mt-1 text-xs text-foreground/60">Poster uploaded.</p>}
      <input type="hidden" name="posterUrl" value={posterUrl} />
    </div>
  );
}
