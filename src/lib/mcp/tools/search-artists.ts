import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "search_artists",
  title: "Search artists",
  description:
    "Search approved artists on OnTour by city and/or genre. Returns basic public profile info (name, city, genres, rating, bio).",
  inputSchema: {
    city: z.string().optional().describe("Filter by artist primary city (case-insensitive partial match)."),
    genre: z.string().optional().describe("Filter by a single genre slug (e.g. 'house', 'hip_hop')."),
    limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city, genre, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    );
    let q = supabase
      .from("artists")
      .select("id, artist_name, primary_city, genres, bio, average_rating, total_reviews, profile_image_url")
      .eq("review_status", "approved")
      .limit(limit);
    if (city) q = q.ilike("primary_city", `%${city}%`);
    if (genre) q = q.contains("genres", [genre]);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { artists: data ?? [] },
    };
  },
});
