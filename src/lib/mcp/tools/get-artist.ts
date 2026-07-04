import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "get_artist",
  title: "Get artist",
  description: "Fetch a single approved artist's public profile by artist id.",
  inputSchema: {
    id: z.string().uuid().describe("Artist id (uuid)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    );
    const { data, error } = await supabase
      .from("artists")
      .select(
        "id, artist_name, primary_city, genres, bio, average_rating, total_reviews, profile_image_url, spotify_url, soundcloud_url, instagram_url, tiktok_url",
      )
      .eq("id", id)
      .eq("review_status", "approved")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Artist not found." }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { artist: data },
    };
  },
});
