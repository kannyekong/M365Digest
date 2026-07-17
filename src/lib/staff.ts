import { supabase } from "./superbase";

export async function listStaff() {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  return data;
}

export async function addStaff(payload: any) {
  return await supabase
    .from("staff")
    .insert(payload)
    .select()
    .single();
}

export async function updateStaff(id: string, payload: any) {
  return await supabase
    .from("staff")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteStaff(id: string) {
  return await supabase
    .from("staff")
    .delete()
    .eq("id", id);
}

export async function generateEmployeeId() {
  const { data, error } = await supabase
    .from("staff")
    .select("employee_id")
    .order("created_at", {
      ascending: false,
    })
    .limit(1);

  if (error) throw error;

  if (!data?.length) {
    return "CT-0001";
  }

  const latest = Number(
    data[0].employee_id.replace("CT-", "")
  );

  return `CT-${String(latest + 1).padStart(4, "0")}`;
}

export async function getStaff(id: string) {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
}

/// Retrieve staff summary counts for the admin dashboard.
export async function getStaffSummary() {
  // Retrieve staff status and department fields from Supabase.
  const { data, error } = await supabase
    .from("staff")
    .select("status, department");

  // Return the database error when the staff request fails.
  if (error) {
    return {
      data: null,
      error,
    };
  }

  // Calculate the total number of staff members.
  const total = data.length;

  // Calculate the number of active staff members.
  const active = data.filter(
    (staff) => staff.status === "Active"
  ).length;

  // Calculate the number of inactive staff members.
  const inactive = data.filter(
    (staff) => staff.status === "Inactive"
  ).length;

  // Calculate the number of staff members in Operations.
  const operations = data.filter(
    (staff) => staff.department === "Operations"
  ).length;

  // Return the complete staff summary.
  return {
    data: {
      total,
      active,
      inactive,
      operations,
    },
    error: null,
  };
}