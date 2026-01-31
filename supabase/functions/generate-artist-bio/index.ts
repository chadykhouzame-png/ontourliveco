import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    const { artistName, genres, city, style } = await req.json();

    if (!artistName || !city) {
      return new Response(
        JSON.stringify({ error: "Artist name and city are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating bio for ${artistName} from ${city}, genres: ${genres?.join(', ')}, style: ${style}`);

    const genreText = genres && genres.length > 0 
      ? genres.map((g: string) => g.replace(/_/g, ' ')).join(', ')
      : 'various genres';

    const styleInstructions = {
      professional: "Use a formal, polished tone highlighting experience and achievements. Focus on credibility and expertise.",
      energetic: "Use an upbeat, party-focused tone emphasizing crowd energy and creating unforgettable moments. Be exciting and dynamic.",
      underground: "Use a raw, authentic tone focused on the music and scene credibility. Be genuine and unpretentious."
    };

    const systemPrompt = `You are a professional music industry copywriter who writes compelling artist bios for DJs and musicians. 
Your bios are concise (under 280 characters), engaging, and help artists stand out to venues.
Never use clichés like "taking the industry by storm" or "one to watch".
Focus on what makes this artist unique and why venues should book them.
${styleInstructions[style as keyof typeof styleInstructions] || styleInstructions.professional}`;

    const userPrompt = `Write a compelling bio for a DJ/artist with the following details:
- Artist Name: ${artistName}
- Based in: ${city}
- Genres: ${genreText}

The bio should be under 280 characters, punchy, and make venues want to book them. 
Do not include quotation marks around the bio. Just return the bio text directly.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI Gateway error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to generate bio");
    }

    const data = await response.json();
    const generatedBio = data.choices?.[0]?.message?.content?.trim();

    if (!generatedBio) {
      throw new Error("No bio generated");
    }

    console.log(`Successfully generated bio: ${generatedBio.substring(0, 50)}...`);

    return new Response(
      JSON.stringify({ bio: generatedBio }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating bio:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
