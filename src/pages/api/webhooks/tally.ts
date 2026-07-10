import type { APIRoute } from "astro";

import { TALLY_FORMS } from "../../../lib/tallyForms";
import { insertContact } from "../../../lib/webhooks/contact";

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();

    switch (payload.data.formId) {
      case TALLY_FORMS.CONTACT:
        await insertContact(payload);
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