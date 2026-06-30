import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight — must come BEFORE req.json() or it crashes on empty body
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const {
      name,
      email,
      password,
      role,
      institutionId,
      institutionName,
      userIdCode,
    } = await req.json();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Create auth user — email_confirm: true skips email verification
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Save basic profile to users table including user_id so login works immediately
    const { error: profileError } = await admin.from('users').insert({
      id:               authUser.user.id,
      name,
      email,
      role,
      institution_id:   institutionId,
      institution_name: institutionName,
      user_id:          userIdCode ?? null,
    });

    if (profileError) {
      console.error('Profile insert failed:', profileError.message);
    }

    return new Response(
      JSON.stringify({ userId: authUser.user.id }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('rapid-responder error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
