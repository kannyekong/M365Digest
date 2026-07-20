import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { qrcode } from "@libs/qrcode";

// This interface describes the registration data needed to generate a certificate.
interface BootcampRegistration {
  id: string;
  first_name: string;
  last_name: string;
  payment_status: string;
}

// This interface describes the certificate record returned by Supabase.
interface Certificate {
  id: string;
  registration_id: string;
  certificate_number: string;
  certificate_name: string;
  course_name: string;
  issued_at: string;
  certificate_url: string | null;
  verification_token: string;
  created_at: string;
}

// This function creates and returns a Supabase admin client.
function createSupabaseAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// This function returns a JSON response with the correct content type.
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// This function centers text horizontally on a PDF page.
function drawCenteredText(
  page: any,
  text: string,
  font: any,
  size: number,
  y: number,
  color: any
) {
  const pageWidth = page.getWidth();

  const textWidth = font.widthOfTextAtSize(text, size);

  const x = (pageWidth - textWidth) / 2;

  page.drawText(text, {
    x,
    y,
    size,
    font,
    color,
  });
}

// This function creates a premium CloudTweak Academy certificate PDF in memory.
async function createCertificatePdf(certificate: Certificate) {
  // Create a new PDF document.
  const pdfDocument = await PDFDocument.create();

  // Create a landscape A4 certificate page.
  const page = pdfDocument.addPage([841.89, 595.28]);

  // Load the standard PDF fonts.
  const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);

  const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);

  // Load the CloudTweak logo from the function directory.
  const logoBytes = await Deno.readFile(
    new URL("./cloudtweak-logo.png", import.meta.url)
  );

  // Embed the CloudTweak PNG logo into the PDF.
  const logoImage = await pdfDocument.embedPng(logoBytes);

  // Store the page dimensions.
  const pageWidth = page.getWidth();

  const pageHeight = page.getHeight();

  // Define CloudTweak brand colours.
  const navyColor = rgb(0.015, 0.025, 0.08);

  const darkTextColor = rgb(0.06, 0.08, 0.14);

  const mutedTextColor = rgb(0.38, 0.41, 0.48);

  const blueColor = rgb(0.12, 0.42, 0.92);

  const purpleColor = rgb(0.55, 0.32, 0.95);

  const greenColor = rgb(0.12, 0.58, 0.36);

  const whiteColor = rgb(1, 1, 1);

  const lightBackground = rgb(0.97, 0.98, 1);

  // Draw the main certificate background.
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: whiteColor,
  });

  // Draw the dark CloudTweak header.
  page.drawRectangle({
    x: 0,
    y: pageHeight - 145,
    width: pageWidth,
    height: 145,
    color: navyColor,
  });

  // Draw the blue decorative header accent.
  page.drawRectangle({
    x: 0,
    y: pageHeight - 150,
    width: pageWidth * 0.55,
    height: 5,
    color: blueColor,
  });

  // Draw the purple decorative header accent.
  page.drawRectangle({
    x: pageWidth * 0.55,
    y: pageHeight - 150,
    width: pageWidth * 0.45,
    height: 5,
    color: purpleColor,
  });

  // Calculate the logo dimensions while preserving its aspect ratio.
  const logoWidth = 235;

  const logoHeight = (logoImage.height / logoImage.width) * logoWidth;

  // Draw the CloudTweak logo in the dark header.
  page.drawImage(logoImage, {
    x: 55,
    y: pageHeight - 105,
    width: logoWidth,
    height: logoHeight,
  });

  // Draw the academy label.
  page.drawText("ACADEMY", {
    x: pageWidth - 135,
    y: pageHeight - 70,
    size: 14,
    font: boldFont,
    color: whiteColor,
  });

  // Draw the outer certificate border.
  page.drawRectangle({
    x: 24,
    y: 24,
    width: pageWidth - 48,
    height: pageHeight - 48,
    borderColor: navyColor,
    borderWidth: 2,
  });

  // Draw the certificate title.
  drawCenteredText(
    page,
    "CERTIFICATE OF COMPLETION",
    boldFont,
    28,
    pageHeight - 205,
    navyColor
  );

  // Draw the title underline.
  page.drawRectangle({
    x: pageWidth / 2 - 55,
    y: pageHeight - 225,
    width: 110,
    height: 3,
    color: blueColor,
  });

  // Draw the certificate introduction.
  drawCenteredText(
    page,
    "This certificate is proudly presented to",
    regularFont,
    14,
    pageHeight - 260,
    mutedTextColor
  );

  // Draw the certificate holder's name.
  drawCenteredText(
    page,
    certificate.certificate_name,
    boldFont,
    34,
    pageHeight - 315,
    blueColor
  );

  // Draw the completion statement.
  drawCenteredText(
    page,
    "for successfully completing the",
    regularFont,
    14,
    pageHeight - 350,
    mutedTextColor
  );

  // Draw the course name.
  drawCenteredText(
    page,
    certificate.course_name,
    boldFont,
    20,
    pageHeight - 385,
    darkTextColor
  );

  // Draw a subtle certificate information panel.
  page.drawRectangle({
    x: 65,
    y: 75,
    width: pageWidth - 130,
    height: 75,
    color: lightBackground,
    borderColor: rgb(0.86, 0.88, 0.93),
    borderWidth: 1,
  });

  // Format the certificate issue date.
  const issueDate = new Date(certificate.issued_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  // Draw the certificate number.
  page.drawText("CERTIFICATE NUMBER", {
    x: 85,
    y: 123,
    size: 8,
    font: boldFont,
    color: mutedTextColor,
  });

  // Draw the certificate number value.
  page.drawText(certificate.certificate_number, {
    x: 85,
    y: 103,
    size: 11,
    font: boldFont,
    color: darkTextColor,
  });

  // Draw the issue date label.
  page.drawText("ISSUED", {
    x: 300,
    y: 123,
    size: 8,
    font: boldFont,
    color: mutedTextColor,
  });

  // Draw the issue date value.
  page.drawText(issueDate, {
    x: 300,
    y: 103,
    size: 11,
    font: regularFont,
    color: darkTextColor,
  });

  // Draw the verification label.
  page.drawText("AUTHENTICITY", {
    x: 500,
    y: 123,
    size: 8,
    font: boldFont,
    color: mutedTextColor,
  });

  // Draw the verification status.
  page.drawText("Verified by CloudTweak Academy", {
    x: 500,
    y: 103,
    size: 11,
    font: regularFont,
    color: greenColor,
  });

  // Read the certificate verification base URL from Supabase secrets.
  const verificationBaseUrl = Deno.env.get("CERTIFICATE_VERIFY_BASE_URL");

  // Stop if the verification URL secret is missing.
  if (!verificationBaseUrl) {
    throw new Error("CERTIFICATE_VERIFY_BASE_URL is not configured.");
  }

  // Build the public certificate verification URL.
  const verificationUrl = `${verificationBaseUrl}/${certificate.verification_token}`;

  // Generate the verification QR code.
  const qrPng = qrcode(verificationUrl, {
    output: "png",
    scale: 8,
    ecl: "MEDIUM",
  });

  // Embed the QR code into the PDF.
  const qrImage = await pdfDocument.embedPng(qrPng);

  // Draw the QR code on the certificate.
  page.drawImage(qrImage, {
    x: pageWidth - 150,
    y: 85,
    width: 65,
    height: 65,
  });

  // Draw the QR verification label.
  page.drawText("SCAN TO VERIFY", {
    x: pageWidth - 155,
    y: 72,
    size: 7,
    font: boldFont,
    color: mutedTextColor,
  });

  // Save the completed PDF as binary data.
  return await pdfDocument.save();
}

// This function generates and uploads the certificate PDF.
async function generateAndUploadCertificatePdf(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  certificate: Certificate
) {
  // Generate the certificate PDF.
  const pdfBytes = await createCertificatePdf(certificate);

  // Build the certificate storage path.
  const storagePath = `${certificate.certificate_number}.pdf`;

  // Upload the certificate PDF to Supabase Storage.
  const { error: uploadError } = await supabase.storage
    .from("certificates")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true,
    });

  // Stop if the PDF upload failed.
  if (uploadError) {
    throw new Error(`Failed to upload certificate PDF: ${uploadError.message}`);
  }

  // Generate the public certificate URL.
  const { data: publicUrlData } = supabase.storage
    .from("certificates")
    .getPublicUrl(storagePath);

  // Update the certificate record with the PDF URL.
  const { data: updatedCertificate, error: updateError } = await supabase
    .from("certificates")
    .update({
      certificate_url: publicUrlData.publicUrl,
    })
    .eq("id", certificate.id)
    .select("*")
    .single();

  // Stop if the certificate URL update failed.
  if (updateError) {
    throw new Error(`Failed to update certificate URL: ${updateError.message}`);
  }

  // Return the updated certificate.
  return updatedCertificate as Certificate;
}

// This function generates a certificate for a paid bootcamp registration.
Deno.serve(async (request) => {
  try {
    // Reject requests that are not POST requests.
    if (request.method !== "POST") {
      return jsonResponse(
        {
          error: "Method not allowed.",
        },
        405
      );
    }

    // Parse the incoming request body.
    const requestBody = await request.json();

    // Extract the registration ID from the request body.
    const registrationId = requestBody.registrationId;

    // Validate that a registration ID was provided.
    if (!registrationId || typeof registrationId !== "string") {
      return jsonResponse(
        {
          error: "A valid registration ID is required.",
        },
        400
      );
    }

    // Create the Supabase admin client.
    const supabase = createSupabaseAdminClient();

    // Check whether the registration already has a certificate.
    const { data: existingCertificate, error: existingCertificateError } =
      await supabase
        .from("certificates")
        .select("*")
        .eq("registration_id", registrationId)
        .maybeSingle();

    // Stop if the existing certificate lookup failed.
    if (existingCertificateError) {
      console.error(
        "Failed to check existing certificate:",
        existingCertificateError.message
      );

      return jsonResponse(
        {
          error: "Failed to check existing certificate.",
        },
        500
      );
    }

    // Generate the PDF for an existing certificate that has no PDF URL.
    if (existingCertificate && !existingCertificate.certificate_url) {
      console.log(
        `Generating missing PDF for certificate ${existingCertificate.certificate_number}.`
      );

      const certificate = await generateAndUploadCertificatePdf(
        supabase,
        existingCertificate as Certificate
      );

      return jsonResponse({
        success: true,
        message: "Certificate PDF generated successfully.",
        certificate,
      });
    }

    // Return the existing certificate instead of creating a duplicate.
    if (existingCertificate) {
      console.log(
        `Certificate already exists for registration ${registrationId}.`
      );

      return jsonResponse({
        success: true,
        message: "Certificate already exists.",
        certificate: existingCertificate,
      });
    }

    // Find the registration that is requesting a certificate.
    const { data: registration, error: registrationError } = await supabase
      .from("bootcamp_registrations")
      .select("id, first_name, last_name, payment_status")
      .eq("id", registrationId)
      .maybeSingle();

    // Stop if the registration lookup failed.
    if (registrationError) {
      console.error("Failed to find registration:", registrationError.message);

      return jsonResponse(
        {
          error: "Failed to find registration.",
        },
        500
      );
    }

    // Stop if no registration was found.
    if (!registration) {
      return jsonResponse(
        {
          error: "Registration not found.",
        },
        404
      );
    }

    // Ensure only paid registrations can receive certificates.
    if (registration.payment_status !== "Paid") {
      return jsonResponse(
        {
          error: "Certificate can only be generated for paid registrations.",
        },
        403
      );
    }

    // Build the participant's certificate name.
    const certificateName =
      `${registration.first_name} ${registration.last_name}`.trim();

    // Generate the next certificate number using the database function.
    const { data: certificateNumberData, error: certificateNumberError } =
      await supabase.rpc("generate_certificate_number");

    // Stop if certificate number generation failed.
    if (certificateNumberError || !certificateNumberData) {
      console.error(
        "Failed to generate certificate number:",
        certificateNumberError?.message
      );

      return jsonResponse(
        {
          error: "Failed to generate certificate number.",
        },
        500
      );
    }

    // Create the certificate record.
    const { data: certificate, error: certificateError } = await supabase
      .from("certificates")
      .insert({
        registration_id: registration.id,
        certificate_number: certificateNumberData,
        certificate_name: certificateName,
      })
      .select("*")
      .single();

    // Stop if certificate creation failed.
    if (certificateError) {
      console.error("Failed to create certificate:", certificateError.message);

      return jsonResponse(
        {
          error: "Failed to create certificate.",
        },
        500
      );
    }

    // Generate and upload the certificate PDF.
    const certificateWithPdf = await generateAndUploadCertificatePdf(
      supabase,
      certificate as Certificate
    );

    // Log the successful certificate generation.
    console.log(
      `Certificate ${certificateWithPdf.certificate_number} generated for ${certificateWithPdf.certificate_name}.`
    );

    // Return the newly generated certificate.
    return jsonResponse({
      success: true,
      message: "Certificate generated successfully.",
      certificate: certificateWithPdf,
    });
  } catch (error) {
    // Catch and log unexpected errors.
    console.error("Unexpected certificate generation error:", error);

    return jsonResponse(
      {
        error: "Internal server error.",
      },
      500
    );
  }
});
