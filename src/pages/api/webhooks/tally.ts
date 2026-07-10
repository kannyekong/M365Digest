import type { APIRoute } from "astro";
import { TALLY_FORMS } from "../../../lib/tallyForms";
import { insertBootcamp } from "../../../lib/webhooks/bootcamp";
import { insertQuote } from "../../../lib/webhooks/quote";
import { insertReview } from "../../../lib/webhooks/review";
import { insertContact } from "../../../lib/webhooks/contact";

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();
console.log("Form ID:", payload.data.formId);



    switch (payload.data.formId) {
  case TALLY_FORMS.CONTACT:
    await insertContact(payload);
    break;

  case TALLY_FORMS.BOOTCAMP:
    await insertBootcamp(payload);
    console.log("Bootcamp webhook reached");
    break;

  case TALLY_FORMS.QUOTE:
    await insertQuote(payload);
    break;

  case TALLY_FORMS.REVIEW:
    await insertReview(payload);
    break;

  default:
    console.warn("Unknown form:", payload.data.formId);
    
}

    return new Response("Success");
  } catch (error) {
    console.error(error);

    return new Response("Server Error", {
      status: 500,
    });
  }
};