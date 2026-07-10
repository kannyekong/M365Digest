import { supabaseAdmin } from "../server/supabase";
import { parseFields } from "../tally";

export async function insertBootcamp(payload: any) {
  const fields = parseFields(payload.data.fields);

  const { error } = await supabaseAdmin
    .from("bootcamp_registrations")
    .insert({
      first_name: fields["First Name"],
      last_name: fields["Last Name"],
      email: fields["Email address"],
      phone_number: fields["Phone number"],

      company: fields["Where do you work?"],

      job_title: fields["Job Title"],

      country: fields["What country do you live in?"],

      timezone: fields["What timezone are you in"],

      availability:
        fields["Are you available 2 times a week? (Sat, Sun)"],

      payment_status: "Pending",

      tally_submission_id:
        payload.data.submissionId,

      payload,
    });

  if (error) throw error;

  return true;
}