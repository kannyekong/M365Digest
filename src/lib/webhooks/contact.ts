import { supabaseAdmin } from "../server/supabase";
import { parseFields } from "../tally";

export async function insertContact(payload: any) {
  const fields = parseFields(payload.data.fields);


console.log(fields);


  const { error } = await supabaseAdmin
    .from("contact_submissions")
    .insert({
      first_name: fields["First name"],
      last_name: fields["Last name"],
      phone_number: fields["Phone number"],
      email: fields["Email"],
      question: fields["Your question"],

      tally_submission_id: payload.data.submissionId,

      payload,
    });

console.log("Insert Error:", error);


  if (error) {
    throw error;
  }

  return true;
}