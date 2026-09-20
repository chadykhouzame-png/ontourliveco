import { defineMcp, auth } from "@lovable.dev/mcp-js";
import searchArtists from "./tools/search-artists";
import getArtist from "./tools/get-artist";
import searchVenues from "./tools/search-venues";

const supabaseUrl = process.env.SUPABASE_URL ?? "";

export default defineMcp({
  name: "ontour-mcp",
  title: "OnTour",
  version: "0.1.0",
  instructions:
    "Tools for OnTour, a marketplace connecting venues with DJs and live artists. Use search_artists / get_artist to discover talent and search_venues to explore venues. All data returned is public profile information for approved users.",
  auth: auth.oauth.issuer({
    issuer: `${supabaseUrl}/auth/v1`,
    jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
    acceptedAudiences: ["authenticated"],
    resourceName: "OnTour",
  }),
  tools: [searchArtists, getArtist, searchVenues],
});
