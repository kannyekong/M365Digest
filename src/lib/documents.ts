import { supabase } from "./superbase";

// Retrieve the staff record linked to the currently authenticated user.
async function getCurrentStaff() {
  // Retrieve the currently authenticated Supabase user.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Stop execution when the user is not authenticated.
  if (userError || !user) {
    return {
      data: null,
      error: userError ?? new Error("User is not authenticated."),
    };
  }

  // Find the staff record linked to the authenticated user.
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  // Return the staff record and any database error.
  return {
    data,
    error,
  };
}

// Retrieve all documents from the document library.
export async function listDocuments() {
  // Retrieve document metadata and sort the newest documents first.
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  // Return the documents or an empty array when no documents exist.
  return {
    data: data ?? [],
    error,
  };
}

// Upload a document file and save its metadata to the database.
export async function uploadDocument(
  file: File,
  payload: {
    title: string;
    description?: string;
    category: string;
  }
) {
  // Retrieve the currently logged-in staff member.
  const { data: staff, error: staffError } =
    await getCurrentStaff();

  // Stop execution when the staff record cannot be found.
  if (staffError || !staff) {
    return {
      data: null,
      error:
        staffError ?? new Error("Staff profile not found."),
    };
  }

  // Create a unique and safe filename for the uploaded document.
  const filePath = `${Date.now()}-${file.name}`;

  // Upload the document to the documents Storage bucket.
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  // Stop execution when the Storage upload fails.
  if (uploadError) {
    return {
      data: null,
      error: uploadError,
    };
  }

  // Generate the public URL using the exact uploaded file path.
  const { data: publicUrl } = supabase.storage
    .from("documents")
    .getPublicUrl(filePath);

  // Confirm that Supabase returned a valid public URL.
  if (!publicUrl?.publicUrl) {
    return {
      data: null,
      error: new Error(
        "Unable to generate document URL."
      ),
    };
  }

  // Save the uploaded document metadata to the database.
  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: payload.title,
      description: payload.description ?? null,
      file_name: file.name,
      file_path: filePath,
      file_url: publicUrl.publicUrl,
      file_type: file.type,
      file_size: file.size,
      category: payload.category,
      uploaded_by: staff.id,
    })
    .select()
    .single();

  // Return the saved document and any database error.
  return {
    data,
    error,
  };
}

// Delete a document from Storage and remove its database metadata.
export async function deleteDocument(
  id: string,
  filePath: string
) {
  // Remove the physical file from the documents bucket.
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([filePath]);

  // Stop execution when the Storage deletion fails.
  if (storageError) {
    return {
      error: storageError,
    };
  }

  // Remove the document metadata from the database.
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  // Return any database deletion error.
  return {
    error,
  };
}