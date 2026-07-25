import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../../lib/server/supabase";
import type { JobApplicationStatus } from "../../../../../types/jobApplication";

const VALID_APPLICATION_STATUSES: JobApplicationStatus[] = [
  "new",
  "in_review",
  "shortlisted",
  "interview",
  "assessment",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
];

/**
 * Checks whether a submitted value is a supported application status.
 */
function isValidApplicationStatus(
  value: unknown
): value is JobApplicationStatus {
  return (
    typeof value === "string" &&
    VALID_APPLICATION_STATUSES.includes(value as JobApplicationStatus)
  );
}

/**
 * Updates the recruitment status of an individual job application.
 */
export const PATCH: APIRoute = async ({ params, request }) => {
  const applicationId = params.id;

  if (!applicationId) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "An application ID is required.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const body = (await request.json()) as {
      status?: unknown;
    };

    if (!isValidApplicationStatus(body.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "The selected application status is invalid.",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("job_applications")
      .update({
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .select("id, status")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "The requested application could not be found.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        application: data,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update the application status.";

    console.error("Application status update failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message,
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

export const DELETE: APIRoute = async ({ params }) => {
  const applicationId = params.id;

  if (!applicationId) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Application ID is required.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    /**
     * Retrieve the application before deleting it so that its résumé
     * can also be removed from Supabase Storage.
     */
    const { data: application, error: applicationError } = await supabaseAdmin
      .from("job_applications")
      .select("id, resume_path")
      .eq("id", applicationId)
      .maybeSingle();

    if (applicationError) {
      throw new Error(applicationError.message);
    }

    if (!application) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Job application was not found.",
        }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    /**
     * Remove the résumé first when the application has an uploaded file.
     * A résumé deletion failure is logged but does not prevent removal of
     * the application record.
     */
    if (application.resume_path) {
      const { error: resumeError } = await supabaseAdmin.storage
        .from("job-application-resumes")
        .remove([application.resume_path]);

      if (resumeError) {
        console.error("Unable to delete application résumé:", resumeError);
      }
    }

    /**
     * Delete the application record from the database.
     */
    const { error: deleteError } = await supabaseAdmin
      .from("job_applications")
      .delete()
      .eq("id", applicationId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Job application deleted successfully.",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unable to delete job application:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete the job application.",
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
