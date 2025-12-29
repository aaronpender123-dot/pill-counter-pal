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

    console.log('Processing image for pill counting...');

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
            content: `You are an expert pill counting assistant with exceptional attention to detail. Your task is to accurately count every pill, tablet, or capsule in an image.

COUNTING METHOD - Follow these steps precisely:
1. Mentally divide the image into quadrants (top-left, top-right, bottom-left, bottom-right)
2. Count the pills in each quadrant separately
3. Add up the totals from all quadrants
4. Double-check by counting again using a different method (e.g., by rows or columns)
5. If the two counts differ, count a third time and use the most common result

IMPORTANT GUIDELINES:
- Count EVERY pill, even if partially obscured or at the edges
- Pills that are overlapping still count as separate pills
- Shadows are NOT pills - only count actual physical objects
- Reflections are NOT pills - only count once
- Broken pill pieces: count as 1 if more than half visible, 0 if less than half
- Be especially careful with pills of similar colors to the background

CONFIDENCE LEVELS:
- "high": Clear image, pills well separated, easy to count, you are certain
- "medium": Some overlapping or partial visibility, but count is likely accurate
- "low": Poor lighting, many overlapping pills, or unclear image

Respond ONLY with valid JSON:
{
  "count": <exact number>,
  "confidence": "<high|medium|low>",
  "notes": "<brief note about pill type, color, or any counting challenges>"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Count all pills in this image. Use the quadrant method: divide into 4 sections, count each section, then sum the totals. Double-check your count.'
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
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Fallback: try to extract number from text
      const numberMatch = content.match(/\d+/);
      result = {
        count: numberMatch ? parseInt(numberMatch[0]) : 0,
        confidence: 'low',
        notes: 'Could not parse structured response'
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
