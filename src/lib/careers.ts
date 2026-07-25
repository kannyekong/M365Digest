import { supabase } from "./superbase";
import type { CareerOpening, CareerOpeningInput } from "../types/careers";

/**
 * Generates a URL-friendly slug from a job title.
 */
export function generateCareerSlug(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Retrieves every career opening for the admin dashboard.
 */
export async function getCareerOpenings() {
  const { data, error } = await supabase
    .from("job_openings")
    .select("*")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as CareerOpening[];
}

/**
 * Retrieves all published jobs that have not expired.
 */
export async function getPublishedCareerOpenings() {
  const { data, error } = await supabase
    .from("job_openings")
    .select("*")
    .eq("status", "published")
    .or(
      `application_deadline.is.null,application_deadline.gte.${new Date().toISOString()}`
    )
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as CareerOpening[];
}

/**
 * Retrieves featured published jobs.
 */
export async function getFeaturedCareerOpenings() {
  const { data, error } = await supabase
    .from("job_openings")
    .select("*")
    .eq("status", "published")
    .eq("featured", true)
    .or(
      `application_deadline.is.null,application_deadline.gte.${new Date().toISOString()}`
    )
    .order("published_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as CareerOpening[];
}

/**
 * Retrieves one career opening using its ID.
 */
export async function getCareerOpeningById(id: string) {
  const { data, error } = await supabase
    .from("job_openings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data as CareerOpening;
}

/**
 * Retrieves one active published career opening using its slug.
 */
export async function getCareerOpeningBySlug(
  slug: string
): Promise<CareerOpening | null> {
  const currentDate = new Date().toISOString();

  const { data, error } = await supabase
    .from("job_openings")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .or(`application_deadline.is.null,application_deadline.gte.${currentDate}`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as CareerOpening | null;
}

/**
 * Creates a new career opening.
 */
export async function createCareerOpening(careerOpening: CareerOpeningInput) {
  const { data, error } = await supabase
    .from("job_openings")
    .insert(careerOpening)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as CareerOpening;
}

/**
 * Updates an existing career opening.
 */
export async function updateCareerOpening(
  id: string,
  updates: Partial<CareerOpeningInput>
) {
  const { data, error } = await supabase
    .from("job_openings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as CareerOpening;
}

/**
 * Deletes a career opening.
 */
export async function deleteCareerOpening(id: string) {
  const { error } = await supabase.from("job_openings").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

/**
 * Publishes a career opening.
 */
export async function publishCareerOpening(id: string) {
  const { data, error } = await supabase
    .from("job_openings")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as CareerOpening;
}

/**
 * Closes a career opening.
 */
export async function closeCareerOpening(id: string) {
  const { data, error } = await supabase
    .from("job_openings")
    .update({
      status: "closed",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as CareerOpening;
}
