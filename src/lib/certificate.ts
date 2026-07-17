// import { supabase } from "./supabase";

// // Fetches every certificate and includes the related registration details.
// export async function listCertificates() {
//   // Retrieves certificates from Supabase and joins the related registration record.
//   const { data, error } = await supabase
//     .from("certificates")
//     .select(
//       `
//         *,
//         bootcamp_registrations (
//           first_name,
//           last_name,
//           email,
//           company,
//           country
//         )
//       `
//     )
//     .order("created_at", { ascending: false });

//   // Returns the fetched certificates and any Supabase error.
//   return { data, error };
// }

// // Fetches paid bootcamp registrations that do not already have a certificate.
// export async function listEligibleRegistrations() {
//   // Retrieves only registrations with confirmed payment from Supabase.
//   const { data: registrations, error: registrationsError } = await supabase
//     .from("bootcamp_registrations")
//     .select("*")
//     .eq("payment_status", "paid")
//     .order("created_at", { ascending: false });

//   // Returns the Supabase error if the registration request fails.
//   if (registrationsError) {
//     return {
//       data: null,
//       error: registrationsError,
//     };
//   }

//   // Retrieves all existing certificates from Supabase.
//   const { data: certificates, error: certificatesError } = await supabase
//     .from("certificates")
//     .select("registration_id");

//   // Returns the Supabase error if the certificate request fails.
//   if (certificatesError) {
//     return {
//       data: null,
//       error: certificatesError,
//     };
//   }

//   // Creates a set of registration IDs that already have certificates.
//   const certifiedRegistrationIds = new Set(
//     certificates?.map((certificate) => certificate.registration_id)
//   );

//   // Filters out paid registrations that already have certificates.
//   const eligibleRegistrations = registrations?.filter(
//     (registration) => !certifiedRegistrationIds.has(registration.id)
//   );

//   // Returns only paid registrations that are eligible for certificate generation.
//   return {
//     data: eligibleRegistrations,
//     error: null,
//   };
// }

// // Generates the next certificate number for the current year.
// export async function generateCertificateNumber() {
//   // Gets the current year from the system date.
//   const currentYear = new Date().getFullYear();

//   // Retrieves the most recently created certificate.
//   const { data, error } = await supabase
//     .from("certificates")
//     .select("certificate_number")
//     .order("created_at", { ascending: false })
//     .limit(1)
//     .maybeSingle();

//   // Returns the Supabase error if the request fails.
//   if (error) {
//     return {
//       data: null,
//       error,
//     };
//   }

//   // Starts the certificate sequence at one when no certificate exists.
//   let nextNumber = 1;

//   // Extracts the numeric sequence from the latest certificate number.
//   if (data?.certificate_number) {
//     // Retrieves the numeric part of the certificate number.
//     const numberPart = data.certificate_number.split("-").pop();

//     // Converts the numeric part into a number.
//     const parsedNumber = Number(numberPart);

//     // Increases the sequence when the number is valid.
//     if (!Number.isNaN(parsedNumber)) {
//       nextNumber = parsedNumber + 1;
//     }
//   }

//   // Formats the sequence with four digits.
//   const formattedNumber = String(nextNumber).padStart(4, "0");

//   // Builds the final certificate number.
//   const certificateNumber = `CT-CERT-${currentYear}-${formattedNumber}`;

//   // Returns the generated certificate number.
//   return {
//     data: certificateNumber,
//     error: null,
//   };
// }

// // Creates a certificate for a selected bootcamp registration.
// export async function createCertificate(registration: any) {
//   // Generates a unique certificate number.
//   const {
//     data: certificateNumber,
//     error: certificateNumberError,
//   } = await generateCertificateNumber();

//   // Returns the error when certificate number generation fails.
//   if (certificateNumberError) {
//     return {
//       data: null,
//       error: certificateNumberError,
//     };
//   }

//   // Inserts the certificate record into Supabase.
//   const { data, error } = await supabase
//     .from("certificates")
//     .insert({
//       registration_id: registration.id,
//       certificate_number: certificateNumber,
//       certificate_name: `${registration.first_name} ${registration.last_name}`,
//       course_name: "Microsoft 365 Administration Bootcamp",
//     })
//     .select()
//     .single();

//   // Returns the newly created certificate and any Supabase error.
//   return {
//     data,
//     error,
//   };
// }

// // Checks whether a registration already has a certificate.
// export async function getCertificateByRegistrationId(
//   registrationId: string
// ) {
//   // Searches for a certificate linked to the selected registration.
//   const { data, error } = await supabase
//     .from("certificates")
//     .select("*")
//     .eq("registration_id", registrationId)
//     .maybeSingle();

//   // Returns the certificate and any Supabase error.
//   return {
//     data,
//     error,
//   };
// }