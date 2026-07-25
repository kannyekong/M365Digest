import type { APIRoute } from "astro";
import {
  JobApplicationError,
  processJobApplication,
} from "../../../lib/server/jobApplication";

/**
 * Creates a consistent JSON response.
 */
function createJsonResponse(
  body: Record<string, unknown>,
  status: number
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Handles public job application submissions.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return createJsonResponse(
        {
          success: false,
          message: "The application request format is invalid.",
        },
        415
      );
    }

    const formData = await request.formData();

    const result = await processJobApplication(formData);

    return createJsonResponse(
      {
        success: true,
        message: "Application submitted successfully.",
        application: {
          id: result.application.id,
          reference: result.application.reference,
        },
        job: {
          id: result.jobOpening.id,
          title: result.jobOpening.title,
          slug: result.jobOpening.slug,
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof JobApplicationError) {
      return createJsonResponse(
        {
          success: false,
          message: error.message,
          fieldErrors: error.fieldErrors ?? null,
        },
        error.statusCode
      );
    }

    console.error("Unexpected job application error:", error);

    return createJsonResponse(
      {
        success: false,
        message:
          "An unexpected error occurred while submitting your application. Please try again.",
      },
      500
    );
  }
};

/**
 * Rejects unsupported HTTP methods.
 */
export const ALL: APIRoute = async () => {
  return createJsonResponse(
    {
      success: false,
      message: "Method not allowed.",
    },
    405
  );
};
