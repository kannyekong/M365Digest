import { supabase } from "./superbase";

export async function login(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function logout() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

// Registers a new CloudTweak Academy student and sends the
// Supabase email-confirmation OTP to the supplied email address.
export async function registerStudent(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        account_type: "student",
        first_name: firstName,
        last_name: lastName,
        display_name: `${firstName} ${lastName}`.trim(),
      },
    },
  });
}

// Verifies the email address using the OTP sent by Supabase Auth.
export async function verifyStudentEmail(email: string, token: string) {
  return supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
}

// Resends the student email-verification OTP when the previous code
// has expired or the student did not receive the original message.
export async function resendStudentVerification(email: string) {
  return supabase.auth.resend({
    type: "signup",
    email,
  });
}
