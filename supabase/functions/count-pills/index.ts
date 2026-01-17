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

    console.log('Processing image with Gemini 2.5 Pro for accurate pill counting...');

    // Use Gemini 2.5 Pro for best multimodal accuracy with pill counting
    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an expert pill counting assistant. Count ALL pills visible in the image and mark each pill's EXACT CENTER position.

CRITICAL RULES:
1. Count EVERY pill - including partially visible or overlapping ones
2. Mark EXACTLY ONE coordinate per pill - the CENTER of each pill
3. NEVER mark the same pill twice - each pill gets ONE marker only
4. Coordinates are percentages: x=0 is left edge, x=100 is right edge, y=0 is top, y=100 is bottom
5. The number of items in "pills" array MUST EQUAL the "count" value

POSITIONING ACCURACY:
- For each pill, identify its visual CENTER point
- Place the marker at the middle of the pill, not at edges
- If pills overlap, mark each pill's center individually
- Be precise - markers should appear directly on each pill

Respond with ONLY valid JSON:
{
  "count": <exact number of pills>,
  "confidence": "<high|medium|low>",
  "notes": "<brief description>",
  "pills": [{"x": <0-100>, "y": <0-100>}, ...]
}

IMPORTANT: The pills array length MUST match the count. One marker per pill, no duplicates.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Count every single pill in this image. Be very careful and thorough. Mark the position of each pill.' },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      
      if (geminiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (geminiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Service temporarily unavailable. Please try again later.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI service error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response:', JSON.stringify(geminiData, null, 2));
    
    const content = geminiData.choices?.[0]?.message?.content || '';
    console.log('Raw content:', content);
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      return new Response(JSON.stringify({
        count: 0,
        confidence: 'low',
        notes: 'Could not parse AI response',
        pills: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    const result = {
      count: parsed.count || 0,
      confidence: parsed.confidence || 'medium',
      notes: parsed.notes || 'Counted via Gemini 2.5 Pro',
      pills: (parsed.pills || []).map((p: any) => ({
        x: Math.min(100, Math.max(0, Number(p.x) || 50)),
        y: Math.min(100, Math.max(0, Number(p.y) || 50)),
      })),
    };

    console.log('Final result:', JSON.stringify(result, null, 2));

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
