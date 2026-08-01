import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import type { AcademyCertificateTemplate } from "../types/academy";

/**
 * Dynamic certificate information placed inside the generated PDF.
 */
export interface AcademyCertificatePdfData {
  recipientName: string;

  programTitle: string;

  certificateNumber: string;

  verificationCode: string;

  issueDate: string;

  completionDate: string | null;
}

/**
 * Supported horizontal element positions.
 */
type HorizontalPosition = "left" | "center" | "right";

/**
 * Supported verification-code positions.
 */
type VerificationPosition = "bottom-left" | "bottom-center" | "bottom-right";

/**
 * Normalized rendering configuration read from the template JSON.
 */
interface AcademyCertificateRenderConfiguration {
  showLogo: boolean;

  showCertificateNumber: boolean;

  showVerificationCode: boolean;

  showCompletionDate: boolean;

  recipientNameSize: number;

  programTitleSize: number;

  signaturePosition: HorizontalPosition;

  verificationPosition: VerificationPosition;
}

/**
 * Convert a hexadecimal colour value into a pdf-lib RGB colour.
 */
function hexToRgb(value: string) {
  const normalizedValue = value.replace("#", "").trim();

  const validValue = /^[0-9a-fA-F]{6}$/.test(normalizedValue)
    ? normalizedValue
    : "0F172A";

  const red = Number.parseInt(validValue.slice(0, 2), 16);

  const green = Number.parseInt(validValue.slice(2, 4), 16);

  const blue = Number.parseInt(validValue.slice(4, 6), 16);

  return rgb(red / 255, green / 255, blue / 255);
}

/**
 * Format a stored date into a readable certificate date.
 */
function formatCertificateDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Safely read a boolean template configuration value.
 */
function readBooleanConfiguration(
  configuration: Record<string, unknown>,
  key: string,
  fallback: boolean
) {
  const value = configuration[key];

  return typeof value === "boolean" ? value : fallback;
}

/**
 * Safely read a numeric template configuration value.
 */
function readNumberConfiguration(
  configuration: Record<string, unknown>,
  key: string,
  fallback: number
) {
  const value = configuration[key];

  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Safely read a supported horizontal-position value.
 */
function readHorizontalPosition(
  configuration: Record<string, unknown>,
  key: string,
  fallback: HorizontalPosition
): HorizontalPosition {
  const value = configuration[key];

  if (value === "left" || value === "center" || value === "right") {
    return value;
  }

  return fallback;
}

/**
 * Safely read a supported verification-position value.
 */
function readVerificationPosition(
  configuration: Record<string, unknown>
): VerificationPosition {
  const value = configuration.verification_position;

  if (
    value === "bottom-left" ||
    value === "bottom-center" ||
    value === "bottom-right"
  ) {
    return value;
  }

  return "bottom-left";
}

/**
 * Normalize the flexible template JSON into stable render settings.
 */
function getRenderConfiguration(
  template: AcademyCertificateTemplate
): AcademyCertificateRenderConfiguration {
  const configuration = template.configuration ?? {};

  return {
    showLogo: readBooleanConfiguration(configuration, "show_logo", true),

    showCertificateNumber: readBooleanConfiguration(
      configuration,
      "show_certificate_number",
      true
    ),

    showVerificationCode: readBooleanConfiguration(
      configuration,
      "show_verification_code",
      true
    ),

    showCompletionDate: readBooleanConfiguration(
      configuration,
      "show_completion_date",
      true
    ),

    recipientNameSize: readNumberConfiguration(
      configuration,
      "recipient_name_size",
      44
    ),

    programTitleSize: readNumberConfiguration(
      configuration,
      "program_title_size",
      24
    ),

    signaturePosition: readHorizontalPosition(
      configuration,
      "signature_position",
      "right"
    ),

    verificationPosition: readVerificationPosition(configuration),
  };
}

/**
 * Download an image from a remote URL.
 */
async function fetchImageBytes(imageUrl: string) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Unable to download image: ${response.status}`);
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),

    contentType: response.headers.get("content-type") ?? "",
  };
}

/**
 * Embed a PNG or JPEG image into the PDF document.
 */
async function embedRemoteImage(
  pdfDocument: PDFDocument,
  imageUrl: string | null
): Promise<PDFImage | null> {
  if (!imageUrl) {
    return null;
  }

  try {
    const { bytes, contentType } = await fetchImageBytes(imageUrl);

    if (
      contentType.includes("png") ||
      imageUrl.toLowerCase().endsWith(".png")
    ) {
      return await pdfDocument.embedPng(bytes);
    }

    if (
      contentType.includes("jpeg") ||
      contentType.includes("jpg") ||
      imageUrl.toLowerCase().endsWith(".jpg") ||
      imageUrl.toLowerCase().endsWith(".jpeg")
    ) {
      return await pdfDocument.embedJpg(bytes);
    }

    console.warn("Unsupported certificate image format:", imageUrl);

    return null;
  } catch (error) {
    console.error("Failed to embed certificate image:", error);

    return null;
  }
}

/**
 * Calculate the horizontal coordinate required to center text.
 */
function getCenteredTextX(
  pageWidth: number,
  text: string,
  font: PDFFont,
  fontSize: number
) {
  const textWidth = font.widthOfTextAtSize(text, fontSize);

  return Math.max(32, (pageWidth - textWidth) / 2);
}

/**
 * Reduce a font size until the supplied text fits within the page.
 */
function getFittedFontSize({
  text,
  font,
  preferredSize,
  minimumSize,
  maximumWidth,
}: {
  text: string;

  font: PDFFont;

  preferredSize: number;

  minimumSize: number;

  maximumWidth: number;
}) {
  let fontSize = preferredSize;

  while (
    fontSize > minimumSize &&
    font.widthOfTextAtSize(text, fontSize) > maximumWidth
  ) {
    fontSize -= 1;
  }

  return fontSize;
}

/**
 * Draw a remote image while preserving its aspect ratio.
 */
function drawContainedImage({
  page,
  image,
  x,
  y,
  maximumWidth,
  maximumHeight,
}: {
  page: PDFPage;

  image: PDFImage;

  x: number;

  y: number;

  maximumWidth: number;

  maximumHeight: number;
}) {
  const imageScale = Math.min(
    maximumWidth / image.width,
    maximumHeight / image.height
  );

  const width = image.width * imageScale;

  const height = image.height * imageScale;

  page.drawImage(image, {
    x: x + (maximumWidth - width) / 2,

    y: y + (maximumHeight - height) / 2,

    width,

    height,
  });
}

/**
 * Return the horizontal position for a left, centre or right element.
 */
function getHorizontalPositionX({
  position,
  pageWidth,
  contentWidth,
  pageMargin,
}: {
  position: HorizontalPosition;

  pageWidth: number;

  contentWidth: number;

  pageMargin: number;
}) {
  switch (position) {
    case "left":
      return pageMargin;

    case "center":
      return (pageWidth - contentWidth) / 2;

    case "right":
      return pageWidth - pageMargin - contentWidth;
  }
}

/**
 * Draw the certificate border when no background artwork is supplied.
 */
function drawCertificateBorder({
  page,
  pageWidth,
  pageHeight,
  primaryColor,
  secondaryColor,
}: {
  page: PDFPage;

  pageWidth: number;

  pageHeight: number;

  primaryColor: ReturnType<typeof hexToRgb>;

  secondaryColor: ReturnType<typeof hexToRgb>;
}) {
  page.drawRectangle({
    x: 10,

    y: 10,

    width: pageWidth - 20,

    height: pageHeight - 20,

    borderWidth: 8,

    borderColor: primaryColor,
  });

  page.drawRectangle({
    x: 24,

    y: 24,

    width: pageWidth - 48,

    height: pageHeight - 48,

    borderWidth: 1.5,

    borderColor: secondaryColor,
  });
}

/**
 * Generate one complete Academy certificate PDF.
 */
export async function generateAcademyCertificatePdf({
  template,
  certificate,
}: {
  template: AcademyCertificateTemplate;

  certificate: AcademyCertificatePdfData;
}) {
  const pdfDocument = await PDFDocument.create();

  const isLandscape = template.orientation === "landscape";

  // Use A4 dimensions expressed in PDF points.
  const pageWidth = isLandscape ? 841.89 : 595.28;

  const pageHeight = isLandscape ? 595.28 : 841.89;

  const page = pdfDocument.addPage([pageWidth, pageHeight]);

  const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);

  const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);

  const italicFont = await pdfDocument.embedFont(
    StandardFonts.HelveticaOblique
  );

  const configuration = getRenderConfiguration(template);

  const primaryColor = hexToRgb(template.primary_color);

  const secondaryColor = hexToRgb(template.secondary_color);

  const textColor = hexToRgb(template.text_color);

  const [backgroundImage, logoImage, signatureImage] = await Promise.all([
    embedRemoteImage(pdfDocument, template.background_image_url),

    configuration.showLogo
      ? embedRemoteImage(pdfDocument, template.logo_url)
      : Promise.resolve(null),

    embedRemoteImage(pdfDocument, template.signature_image_url),
  ]);

  // Draw the supplied artwork across the full page.
  if (backgroundImage) {
    page.drawImage(backgroundImage, {
      x: 0,

      y: 0,

      width: pageWidth,

      height: pageHeight,
    });
  } else {
    page.drawRectangle({
      x: 0,

      y: 0,

      width: pageWidth,

      height: pageHeight,

      color: rgb(1, 1, 1),
    });

    drawCertificateBorder({
      page,
      pageWidth,
      pageHeight,
      primaryColor,
      secondaryColor,
    });
  }

  // Draw the logo near the top of the certificate.
  if (logoImage) {
    drawContainedImage({
      page,

      image: logoImage,

      x: (pageWidth - 180) / 2,

      y: pageHeight - 105,

      maximumWidth: 180,

      maximumHeight: 55,
    });
  } else if (configuration.showLogo) {
    const fallbackLogo = "CLOUDTWEAK ACADEMY";

    page.drawText(fallbackLogo, {
      x: getCenteredTextX(pageWidth, fallbackLogo, boldFont, 16),

      y: pageHeight - 78,

      size: 16,

      font: boldFont,

      color: primaryColor,
    });
  }

  const certificateHeading = "CERTIFICATE OF COMPLETION";

  page.drawText(certificateHeading, {
    x: getCenteredTextX(
      pageWidth,
      certificateHeading,
      boldFont,
      isLandscape ? 22 : 19
    ),

    y: pageHeight * 0.72,

    size: isLandscape ? 22 : 19,

    font: boldFont,

    color: primaryColor,
  });

  const presentationText = "This certificate is proudly presented to";

  page.drawText(presentationText, {
    x: getCenteredTextX(pageWidth, presentationText, regularFont, 13),

    y: pageHeight * 0.64,

    size: 13,

    font: regularFont,

    color: textColor,
  });

  const recipientFontSize = getFittedFontSize({
    text: certificate.recipientName,

    font: boldFont,

    preferredSize: configuration.recipientNameSize,

    minimumSize: 22,

    maximumWidth: pageWidth - 110,
  });

  page.drawText(certificate.recipientName, {
    x: getCenteredTextX(
      pageWidth,
      certificate.recipientName,
      boldFont,
      recipientFontSize
    ),

    y: pageHeight * 0.53,

    size: recipientFontSize,

    font: boldFont,

    color: textColor,
  });

  const recipientLineWidth = Math.min(
    pageWidth - 140,
    Math.max(
      240,
      boldFont.widthOfTextAtSize(certificate.recipientName, recipientFontSize) +
        30
    )
  );

  page.drawLine({
    start: {
      x: (pageWidth - recipientLineWidth) / 2,

      y: pageHeight * 0.51,
    },

    end: {
      x: (pageWidth + recipientLineWidth) / 2,

      y: pageHeight * 0.51,
    },

    thickness: 1.2,

    color: secondaryColor,
  });

  const completionText = "for successfully completing";

  page.drawText(completionText, {
    x: getCenteredTextX(pageWidth, completionText, regularFont, 13),

    y: pageHeight * 0.44,

    size: 13,

    font: regularFont,

    color: textColor,
  });

  const programFontSize = getFittedFontSize({
    text: certificate.programTitle,

    font: boldFont,

    preferredSize: configuration.programTitleSize,

    minimumSize: 16,

    maximumWidth: pageWidth - 100,
  });

  page.drawText(certificate.programTitle, {
    x: getCenteredTextX(
      pageWidth,
      certificate.programTitle,
      boldFont,
      programFontSize
    ),

    y: pageHeight * 0.37,

    size: programFontSize,

    font: boldFont,

    color: primaryColor,
  });

  if (configuration.showCompletionDate && certificate.completionDate) {
    const completionDateText = `Completed on ${formatCertificateDate(
      certificate.completionDate
    )}`;

    page.drawText(completionDateText, {
      x: getCenteredTextX(pageWidth, completionDateText, italicFont, 11),

      y: pageHeight * 0.3,

      size: 11,

      font: italicFont,

      color: textColor,
    });
  }

  const signatureWidth = 150;
  const signatureX = getHorizontalPositionX({
    position: configuration.signaturePosition,

    pageWidth,

    contentWidth: signatureWidth,

    pageMargin: 55,
  });

  if (signatureImage) {
    drawContainedImage({
      page,

      image: signatureImage,

      x: signatureX,

      y: 72,

      maximumWidth: signatureWidth,

      maximumHeight: 44,
    });
  }

  page.drawLine({
    start: {
      x: signatureX,

      y: 68,
    },

    end: {
      x: signatureX + signatureWidth,

      y: 68,
    },

    thickness: 0.8,

    color: textColor,
  });

  const signatoryName = template.signatory_name ?? "Authorized Signatory";

  const signatoryNameSize = 10;

  page.drawText(signatoryName, {
    x:
      signatureX +
      Math.max(
        0,
        (signatureWidth -
          boldFont.widthOfTextAtSize(signatoryName, signatoryNameSize)) /
          2
      ),

    y: 52,

    size: signatoryNameSize,

    font: boldFont,

    color: textColor,
  });

  if (template.signatory_title) {
    const signatoryTitleSize = 8;

    page.drawText(template.signatory_title, {
      x:
        signatureX +
        Math.max(
          0,
          (signatureWidth -
            regularFont.widthOfTextAtSize(
              template.signatory_title,
              signatoryTitleSize
            )) /
            2
        ),

      y: 39,

      size: signatoryTitleSize,

      font: regularFont,

      color: textColor,
    });
  }

  const footerLines: string[] = [];

  if (configuration.showCertificateNumber) {
    footerLines.push(`Certificate No: ${certificate.certificateNumber}`);
  }

  if (configuration.showVerificationCode) {
    footerLines.push(`Verification: ${certificate.verificationCode}`);
  }

  const footerText = footerLines.join("  |  ");

  if (footerText) {
    const footerSize = 8;

    const footerWidth = regularFont.widthOfTextAtSize(footerText, footerSize);

    let footerX = 44;

    if (configuration.verificationPosition === "bottom-center") {
      footerX = (pageWidth - footerWidth) / 2;
    }

    if (configuration.verificationPosition === "bottom-right") {
      footerX = pageWidth - footerWidth - 44;
    }

    page.drawText(footerText, {
      x: Math.max(30, footerX),

      y: 24,

      size: footerSize,

      font: regularFont,

      color: textColor,
    });
  }

  const issueDateText = `Issued ${formatCertificateDate(
    certificate.issueDate
  )}`;

  page.drawText(issueDateText, {
    x: pageWidth - regularFont.widthOfTextAtSize(issueDateText, 8) - 44,

    y: pageHeight - 35,

    size: 8,

    font: regularFont,

    color: textColor,
  });

  pdfDocument.setTitle(
    `${certificate.recipientName} - ${certificate.programTitle}`
  );

  pdfDocument.setSubject("CloudTweak Academy Certificate");

  pdfDocument.setAuthor("CloudTweak Academy");

  pdfDocument.setCreator("CloudTweak Academy Certificate System");

  return await pdfDocument.save();
}
