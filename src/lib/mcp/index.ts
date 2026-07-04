import { defineMcp } from "@lovable.dev/mcp-js";
import searchArtists from "./tools/search-artists";
import getArtist from "./tools/get-artist";
import searchVenues from "./tools/search-venues";

export default defineMcp({
  name: "ontour-mcp",
  title: "OnTour",
  version: "0.1.0",
  instructions:
    "Tools for OnTour, a marketplace connecting venues with DJs and live artists. Use search_artists / get_artist to discover talent and search_venues to explore venues. All data returned is public profile information for approved users.",
  tools: [searchArtists, getArtist, searchVenues],
});
