import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Calculate cutoff time: 24 hours ago
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log(
      `Archiving tasks completed before ${cutoffTime.toISOString()}`,
    );

    // Update tasks that are:
    // 1. Marked as completed
    // 2. Completed more than 24 hours ago
    // 3. Not already archived
    // 4. Not soft deleted
    const { data, error, count } = await supabaseClient
      .from("task")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("completed", true)
      .lt("completed_at", cutoffTime.toISOString())
      .is("deleted_at", null)
      .select("id", { count: "exact" });

    if (error) {
      console.error("Error archiving tasks:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Successfully archived ${count ?? 0} tasks`);

    return new Response(
      JSON.stringify({
        success: true,
        archivedCount: count ?? 0,
        cutoffTime: cutoffTime.toISOString(),
        archivedTaskIds: data?.map((t) => t.id) ?? [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
