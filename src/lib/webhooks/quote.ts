import { supabaseAdmin } from "../server/supabase";
import { parseFields } from "../tally";

export async function insertQuote(payload: any) {
  const fields = parseFields(payload.data.fields);

  console.log(payload.data.fields);

  const { error } = await supabaseAdmin
    .from("quote_submissions")
    .insert({
      name: fields["Name"],
      email: fields["Email"],
      phone_number: fields["Phone number"],
      organization: fields["Organization"],
      project_details: fields["Project details"],

      tally_submission_id: payload.data.submissionId,

      payload,
    });

  if (error) throw error;

  return true;
}