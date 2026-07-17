import { createClient } from "jsr:@supabase/supabase-js@2";

// Define the structure of a Tally form field.
interface TallyField {
  key: string;
  label: string;
  type: string;
  value: string | string[] | null;
  options?: {
    id: string;
    text: string;
  }[];
}

// Define the structure of the Tally webhook payload.
interface TallyPayload {
  eventId: string;
  eventType: string;
  createdAt: string;
  data: {
    responseId: string;
    submissionId: string;
    fields: TallyField[];
  };
}

// Find a Tally field using its label.
function getField(fields: TallyField[], label: string) {
  // Find the field whose label matches the requested label.
  return fields.find((field) => field.label === label);
}

// Extract the value from a Tally field.
function getFieldValue(fields: TallyField[], label: string) {
  // Find the requested field using its label.
  const field = getField(fields, label);

  // Return null when the field does not exist or has no value.
  if (!field || field.value === null) {
    return null;
  }

  // Return the text value directly for normal input fields.
  if (typeof field.value === "string") {
    return field.value;
  }

  // Resolve dropdown option IDs into their visible text values.
  if (Array.isArray(field.value)) {
    // Convert the selected option IDs into their matching option labels.
    return field.value
      .map(
        (value) => field.options?.find((option) => option.id === value)?.text
      )
      .filter(Boolean)
      .join(", ");
  }

  // Return null when no supported value exists.
  return null;
}

// Create the Supabase client using Edge Function environment variables.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Handle incoming Tally webhook requests.
Deno.serve(async (request) => {
  // Reject requests that are not POST requests.
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
    });
  }

  try {
    // Read the Tally webhook payload.
    const payload = (await request.json()) as TallyPayload;

    // Ignore webhook events that are not form responses.
    if (payload.eventType !== "FORM_RESPONSE") {
      return new Response(
        JSON.stringify({
          message: "Event ignored",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Extract the Tally form fields.
    const fields = payload.data.fields;

    // Check whether this Tally submission already exists.
    const { data: existingRegistration, error: existingError } = await supabase
      .from("bootcamp_registrations")
      .select("id")
      .eq("tally_submission_id", payload.data.submissionId)
      .maybeSingle();

    // Stop the request when the duplicate check fails.
    if (existingError) {
      throw existingError;
    }

    // Ignore duplicate Tally webhook deliveries.
    if (existingRegistration) {
      return new Response(
        JSON.stringify({
          message: "Registration already exists",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Build the registration record from the Tally submission.
    const registration = {
      first_name: getFieldValue(fields, "First Name"),
      last_name: getFieldValue(fields, "Last Name"),
      email: getFieldValue(fields, "Email address"),
      phone_number: getFieldValue(fields, "Phone number"),
      company: getFieldValue(fields, "Where do you work?"),
      job_title: getFieldValue(fields, "Job Title"),
      country: getFieldValue(fields, "What country do you live in?"),
      timezone: getFieldValue(fields, "What timezone are you in"),
      availability: getFieldValue(
        fields,
        "Are you available 2 times a week? (Sat, Sun)"
      ),
      payment_status: "Pending",
      payment_reference: null,
      tally_submission_id: payload.data.submissionId,
      payload,
    };

    // Insert the new registration into Supabase.
    const { error: insertError } = await supabase
      .from("bootcamp_registrations")
      .insert(registration);

    // Stop the request when the database insert fails.
    if (insertError) {
      throw insertError;
    }

    // Return a successful response to Tally.
    return new Response(
      JSON.stringify({
        success: true,
        message: "Registration received successfully",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    // Log the webhook error for Edge Function debugging.
    console.error("Registration webhook error:", error);

    // Return a server error response.
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});
