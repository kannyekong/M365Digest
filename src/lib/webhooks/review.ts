import { supabaseAdmin } from "../server/supabase";
import { parseFields } from "../tally";

export async function insertReview(payload: any) {
  const fields = parseFields(payload.data.fields);
console.log(
  JSON.stringify(payload.data.fields, null, 2)
);


  const { error } = await supabaseAdmin
    .from("review_submissions")
    .insert({
      email: fields["Email"],

      referral_source: fields["How did you hear about us?"],

      product_quality: fields["Overall product quality"],

      onboarding_experience: fields["Onboarding experience"],

      product_design: fields["Product design"],

      bootcamp_experience: fields["Bootcamp experience"],

      miscellaneous: fields["Miscellaneous"],

      tally_submission_id: payload.data.submissionId,

      payload,
    });

  if (error) throw error;

  return true;
}