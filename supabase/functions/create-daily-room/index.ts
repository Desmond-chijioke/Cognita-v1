import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY')
  if (!DAILY_API_KEY) {
    return new Response(JSON.stringify({ error: 'DAILY_API_KEY not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${DAILY_API_KEY}`,
      'Content-Type':   'application/json',
    },
    body: JSON.stringify({
      properties: {
        exp:               Math.round(Date.now() / 1000) + 7200, // 2 hours
        enable_screenshare: true,
        enable_chat:        false,
        max_participants:   10,
        start_video_off:    false,
        start_audio_off:    false,
      },
    }),
  })

  const room = await res.json()

  if (!res.ok) {
    return new Response(JSON.stringify({ error: room.error ?? 'Daily API error' }), {
      status: res.status, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ url: room.url, name: room.name }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
