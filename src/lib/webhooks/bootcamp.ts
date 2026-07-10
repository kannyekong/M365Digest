import { supabaseAdmin } from "../server/supabase";
import { parseFields } from "../tally";

export async function insertBootcamp(payload: any) {

  console.log(payload.data.fields);

  const fields = parseFields(payload.data.fields);

  const { error } = await supabaseAdmin
    .from("bootcamp_registrations")
    .insert({
      // We'll fill this in after seeing the payload
    });

  if (error) throw error;

  return true;
}