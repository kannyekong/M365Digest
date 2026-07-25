import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../../../../lib/server/supabase";

const RESUME_BUCKET = "job-application-resumes";
const SIGNED_URL_DURATION_SECONDS = 60;

/**
 * Redirects an administrator to a short-lived signed resume URL.
 */
export const GET: APIRoute = async ({ params, redirect }) => {
  const applicationId = params.id;

  if (!applicationId) {
    return new Response("An application ID is required.", {
      status: 400,
    });
  }

  try {
    const { data: application, error: applicationError } = await supabaseAdmin
      .from("job_applications")
      .select("resume_path")
      .eq("id", applicationId)
      .maybeSingle();

    if (applicationError) {
      throw new Error(applicationError.message);
    }

    if (!application) {
      return new Response("The requested application could not be found.", {
        status: 404,
      });
    }

    if (!application.resume_path) {
      return new Response("This application does not contain a resume.", {
        status: 404,
      });
    }

    const { data: signedResume, error: signedUrlError } =
      await supabaseAdmin.storage
        .from(RESUME_BUCKET)
        .createSignedUrl(application.resume_path, SIGNED_URL_DURATION_SECONDS, {
          download: true,
        });

    if (signedUrlError) {
      throw new Error(signedUrlError.message);
    }

    return redirect(signedResume.signedUrl);
  } catch (error) {
    console.error("Resume retrieval failed:", error);

    return new Response("Unable to retrieve the candidate's resume.", {
      status: 500,
    });
  }
};
