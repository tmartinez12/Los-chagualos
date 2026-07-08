import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET") || SUPABASE_SERVICE_KEY;

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const { nombre, pin, device_id } = await req.json();

    if (!nombre || !pin) {
      return new Response(
        JSON.stringify({ error: "nombre y pin son requeridos" }),
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Rate limiting: check recent failed attempts for this device
    if (device_id) {
      const since = new Date(
        Date.now() - LOCKOUT_MINUTES * 60 * 1000
      ).toISOString();
      const { count } = await supabase
        .from("login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("device_id", device_id)
        .eq("exitoso", false)
        .gte("created_at", since);

      if (count && count >= MAX_ATTEMPTS) {
        return new Response(
          JSON.stringify({
            error: `Demasiados intentos. Espera ${LOCKOUT_MINUTES} minutos.`,
          }),
          { status: 429 }
        );
      }
    }

    // Find the profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, nombre, pin_hash, rol, unidad, activo")
      .ilike("nombre", nombre)
      .single();

    if (profileErr || !profile) {
      await logAttempt(supabase, null, device_id, false);
      return new Response(
        JSON.stringify({ error: "Usuario no encontrado" }),
        { status: 401 }
      );
    }

    if (!profile.activo) {
      return new Response(
        JSON.stringify({ error: "Usuario inactivo" }),
        { status: 403 }
      );
    }

    // Verify PIN
    const valid = await bcrypt.compare(pin, profile.pin_hash);
    await logAttempt(supabase, profile.id, device_id, valid);

    if (!valid) {
      return new Response(
        JSON.stringify({ error: "PIN incorrecto" }),
        { status: 401 }
      );
    }

    // Create JWT with custom claims
    const now = Math.floor(Date.now() / 1000);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const token = await create(
      { alg: "HS256", typ: "JWT" },
      {
        sub: profile.id,
        role: "authenticated",
        app_role: profile.rol,
        unidad: profile.unidad,
        nombre: profile.nombre,
        iat: now,
        exp: now + 60 * 60 * 24 * 30, // 30 days
      },
      key
    );

    return new Response(
      JSON.stringify({
        token,
        profile: {
          id: profile.id,
          nombre: profile.nombre,
          rol: profile.rol,
          unidad: profile.unidad,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Error interno", detail: String(err) }),
      { status: 500 }
    );
  }
});

async function logAttempt(
  supabase: any,
  profileId: string | null,
  deviceId: string | null,
  exitoso: boolean
) {
  await supabase.from("login_attempts").insert({
    profile_id: profileId,
    device_id: deviceId,
    exitoso,
  });
}
