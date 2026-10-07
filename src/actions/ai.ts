"use server";

import { requireAuth } from "@/lib/auth";

export async function draftEventDescription(input: {
  title: string;
  societyName: string;
  venueName: string;
  startAt: string;
  highlights: string;
}) {
  await requireAuth();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("AI drafting isn't configured for this deployment — enter the description manually.");
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            'You write concise, factual event listings for a university events platform. Respond with strict JSON only, no markdown fencing: {"description": string, "announcement": string}. "description" is 2-3 short paragraphs for the event page. "announcement" is a 1-2 sentence blurb suitable for a notification.',
        },
        {
          role: "user",
          content: `Society: ${input.societyName}\nEvent title: ${input.title}\nVenue: ${input.venueName || "TBA"}\nDate: ${input.startAt || "TBA"}\nKey highlights: ${input.highlights || "none given"}`,
        },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error("The AI drafting service is unavailable right now — enter the description manually.");
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(content);
    return {
      description: String(parsed.description ?? "").trim(),
      announcement: String(parsed.announcement ?? "").trim(),
    };
  } catch {
    return { description: content.trim(), announcement: "" };
  }
}
