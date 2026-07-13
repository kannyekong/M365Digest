import { supabaseAdmin } from "../server/supabase";
import { parseFields } from "../tally";


export async function insertReview(payload: any) {
  const fields = parseFields(payload.data.fields);
 

  const { error } = await supabaseAdmin
    .from("review_submissions")
    .insert({
      email: fields["Your email"],

      referral_source:
        fields["Where did you hear about us?"],

      ratings:
        fields["How would you rate our"],

      bootcamp_experience:
        fields["How can we make our Bootcamp better for you?"],

      miscellaneous:
        fields["Anything else you'd like to share with our team?"],

      tally_submission_id:
        payload.data.submissionId,

      payload,
    });

  if (error) throw error;

  return true;
}