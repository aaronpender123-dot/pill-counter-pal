import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      throw new Error('No image provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing image for pill counting with positions...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are an expert pill detection and counting assistant. Your task is to accurately identify and locate every pill, tablet, or capsule in an image.

CRITICAL TASK: You must return the EXACT position of each pill as a percentage of image dimensions.

DETECTION METHOD - Follow these steps precisely:
1. Scan the entire image systematically from left to right, top to bottom
2. For EACH pill you find, estimate its CENTER position as:
   - x: percentage from left edge (0 = left edge, 100 = right edge)
   - y: percentage from top edge (0 = top edge, 100 = bottom edge)
3. Count every single pill, even partially visible ones
4. Double-check by scanning again in a different pattern

IMPORTANT GUIDELINES:
- Mark EVERY pill, even if partially obscured or at the edges
- Pills that are overlapping still get separate markers
- Shadows are NOT pills - only mark actual physical objects
- Reflections are NOT pills - only mark once
- Be especially careful with pills similar in color to the background
- Position estimates should be as accurate as possible

CONFIDENCE LEVELS:
- "high": Clear image, pills well separated, positions are accurate
- "medium": Some overlapping or partial visibility
- "low": Poor lighting, many overlapping pills, or unclear image

Respond ONLY with valid JSON in this exact format:
{
  "count": <exact number of pills>,
  "confidence": "<high|medium|low>",
  "notes": "<brief note about pill type, color, or any counting challenges>",
  "pills": [
    {"x": <percentage 0-100>, "y": <percentage 0-100>},
    {"x": <percentage 0-100>, "y": <percentage 0-100>}
  ]
}

The "pills" array must have exactly as many entries as the count.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Detect and locate all pills in this image. For each pill, provide its center position as x,y percentages. Be thorough and mark every single pill you can see.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI Response:', content);

    // Parse the JSON response
    let result;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
      
      // Ensure pills array exists
      if (!result.pills || !Array.isArray(result.pills)) {
        result.pills = [];
      }
      
      // Validate pill positions
      result.pills = result.pills.map((pill: any) => ({
        x: Math.min(100, Math.max(0, Number(pill.x) || 50)),
        y: Math.min(100, Math.max(0, Number(pill.y) || 50))
      }));
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Fallback: try to extract number from text
      const numberMatch = content.match(/\d+/);
      result = {
        count: numberMatch ? parseInt(numberMatch[0]) : 0,
        confidence: 'low',
        notes: 'Could not parse structured response',
        pills: []
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in count-pills function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
