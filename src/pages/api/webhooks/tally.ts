import type { APIRoute } from "astro";
import { TALLY_FORMS } from "../../../lib/tallyForms";
import { insertBootcamp } from "../../../lib/webhooks/bootcamp";
import { insertQuote } from "../../../lib/webhooks/quote";
import { insertReview } from "../../../lib/webhooks/review";
import { insertContact } from "../../../lib/webhooks/contact";

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse the JSON body sent by Tally.
    const payload = await request.json();

    // Read the form identifier safely from the webhook payload.
    const formId = payload?.data?.formId;

    // Reject malformed webhook requests that do not contain a form ID.
    if (!formId) {
      console.error("Tally webhook payload is missing data.formId:", payload);

      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing form ID",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Send each Tally form to its corresponding database handler.
    switch (formId) {
      case TALLY_FORMS.CONTACT:
        await insertContact(payload);
        break;

      case TALLY_FORMS.BOOTCAMP:
        await insertBootcamp(payload);
        break;

      case TALLY_FORMS.QUOTE:
        await insertQuote(payload);
        break;

      case TALLY_FORMS.REVIEW:
        await insertReview(payload);
        break;

      default:
        console.warn("Unknown Tally form ID:", formId);

        return new Response(
          JSON.stringify({
            success: false,
            message: "Unknown form",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
    }

    // Return an explicit successful response to Tally.
    return new Response(
      JSON.stringify({
        success: true,
        message: "Submission received",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    // Extract useful error information for the Vercel function logs.
    const errorDetails =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error;

    console.error("Tally webhook processing failed:", errorDetails);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Server Error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
