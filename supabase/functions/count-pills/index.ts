import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VisionAPIResponse {
  responses: Array<{
    localizedObjectAnnotations?: Array<{
      name: string;
      score: number;
      boundingPoly: {
        normalizedVertices: Array<{ x: number; y: number }>;
      };
    }>;
    error?: { message: string };
  }>;
}

interface PillPosition {
  x: number;
  y: number;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      throw new Error('No image provided');
    }

    const GOOGLE_CLOUD_VISION_API_KEY = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!GOOGLE_CLOUD_VISION_API_KEY) {
      throw new Error('GOOGLE_CLOUD_VISION_API_KEY is not configured');
    }

    console.log('Processing image with Google Cloud Vision API...');

    // Extract base64 data from data URL
    const base64Match = image.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Invalid image format. Expected base64 data URL');
    }
    const base64Image = base64Match[1];

    // Call Google Cloud Vision API for object localization
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'OBJECT_LOCALIZATION',
                  maxResults: 100,
                },
                {
                  type: 'LABEL_DETECTION',
                  maxResults: 20,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Vision API error:', visionResponse.status, errorText);
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionData: VisionAPIResponse = await visionResponse.json();
    console.log('Vision API response:', JSON.stringify(visionData, null, 2));

    if (visionData.responses[0]?.error) {
      throw new Error(visionData.responses[0].error.message);
    }

    const objects = visionData.responses[0]?.localizedObjectAnnotations || [];
    
    // Filter for pill-like objects
    const pillKeywords = ['pill', 'tablet', 'capsule', 'medicine', 'drug', 'medication', 'vitamin'];
    const pillObjects = objects.filter((obj) => {
      const name = obj.name.toLowerCase();
      return pillKeywords.some(keyword => name.includes(keyword)) || 
             obj.score > 0.5; // Include high-confidence detections
    });

    console.log(`Found ${objects.length} objects, ${pillObjects.length} potential pills`);

    // If Vision API found objects, use those positions
    let pills: PillPosition[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    let notes = '';

    if (pillObjects.length > 0) {
      // Use Vision API results
      pills = pillObjects.map((obj) => {
        const vertices = obj.boundingPoly.normalizedVertices;
        // Calculate center of bounding box
        const centerX = (vertices.reduce((sum, v) => sum + (v.x || 0), 0) / vertices.length) * 100;
        const centerY = (vertices.reduce((sum, v) => sum + (v.y || 0), 0) / vertices.length) * 100;
        return {
          x: Math.min(100, Math.max(0, centerX)),
          y: Math.min(100, Math.max(0, centerY)),
          confidence: obj.score,
        };
      });

      const avgScore = pillObjects.reduce((sum, obj) => sum + obj.score, 0) / pillObjects.length;
      confidence = avgScore > 0.8 ? 'high' : avgScore > 0.5 ? 'medium' : 'low';
      notes = `Detected ${pillObjects.length} objects via Vision API. Objects: ${pillObjects.map(o => `${o.name}(${(o.score * 100).toFixed(0)}%)`).join(', ')}`;
    } else if (objects.length > 0) {
      // Vision API found objects but none matched pill keywords
      // Use all detected objects as potential pills
      pills = objects.map((obj) => {
        const vertices = obj.boundingPoly.normalizedVertices;
        const centerX = (vertices.reduce((sum, v) => sum + (v.x || 0), 0) / vertices.length) * 100;
        const centerY = (vertices.reduce((sum, v) => sum + (v.y || 0), 0) / vertices.length) * 100;
        return {
          x: Math.min(100, Math.max(0, centerX)),
          y: Math.min(100, Math.max(0, centerY)),
          confidence: obj.score,
        };
      });
      confidence = 'medium';
      notes = `Found ${objects.length} objects (no specific pill labels). Objects: ${objects.map(o => o.name).join(', ')}`;
    } else {
      // Fallback to Gemini for counting if Vision API found nothing
      console.log('No objects detected by Vision API, falling back to Gemini...');
      
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({
          count: 0,
          confidence: 'low',
          notes: 'No pills detected by Vision API',
          pills: [],
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are a pill counting assistant. Count all pills visible in the image and provide their approximate positions.
              
Respond ONLY with valid JSON:
{
  "count": <number>,
  "confidence": "<high|medium|low>",
  "notes": "<brief description>",
  "pills": [{"x": <0-100>, "y": <0-100>}, ...]
}`
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Count all pills in this image and provide their positions as percentages.' },
                { type: 'image_url', image_url: { url: image } }
              ]
            }
          ],
        }),
      });

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const content = geminiData.choices?.[0]?.message?.content || '';
        
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return new Response(JSON.stringify({
              count: parsed.count || 0,
              confidence: parsed.confidence || 'low',
              notes: 'Counted via AI (Vision API found no objects): ' + (parsed.notes || ''),
              pills: (parsed.pills || []).map((p: any) => ({
                x: Math.min(100, Math.max(0, Number(p.x) || 50)),
                y: Math.min(100, Math.max(0, Number(p.y) || 50)),
              })),
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } catch (e) {
          console.error('Gemini parse error:', e);
        }
      }

      return new Response(JSON.stringify({
        count: 0,
        confidence: 'low',
        notes: 'No pills detected',
        pills: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = {
      count: pills.length,
      confidence,
      notes,
      pills: pills.map(p => ({ x: p.x, y: p.y })),
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
