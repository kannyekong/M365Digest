import { supabaseAdmin } from "../server/supabase";
import { parseFields } from "../tally";

export async function insertQuote(payload: any) {
  const fields = parseFields(payload.data.fields);

  const { error } = await supabaseAdmin
    .from("quote_submissions")
    .insert({
      name: fields["Name"],
      email: fields["Email Address"],
      phone_number: fields["Phone Number"],
      organization: fields["Your Organization"],
      project_details: fields["Project Details"],

      tally_submission_id: payload.data.submissionId,

      payload,
    });

  if (error) throw error;

  return true;
}