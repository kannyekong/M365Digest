import { ArrowLeftCircle } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { uploadCoverImage } from "../../../lib/storage";
import { useEffect } from "react";
import {
  addStaff,
  generateEmployeeId,
  getStaff,
  updateStaff,
} from "../../../lib/staff";

interface Props {
  mode?: "create" | "edit";
}

export default function StaffForm({ mode = "create" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    employment_type: "Full Time",
    hire_date: "",
    date_of_birth: "",
    emergency_contact: "",
    emergency_phone: "",
    address: "",
    notes: "",
    avatar_url: "",
  });

  async function loadStaff() {
    const { data, error } = await getStaff(id!);

    if (error) {
      toast.error(error.message);
      return;
    }

    setForm({
      first_name: data.first_name ?? "",
      last_name: data.last_name ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      department: data.department ?? "",
      position: data.position ?? "",
      employment_type: data.employment_type ?? "Full Time",
      hire_date: data.hire_date ?? "",
      date_of_birth: data.date_of_birth ?? "",
      emergency_contact: data.emergency_contact ?? "",
      emergency_phone: data.emergency_phone ?? "",
      address: data.address ?? "",
      notes: data.notes ?? "",
      avatar_url: data.avatar_url ?? "",
    });

    setPreview(data.avatar_url ?? "");
  }

  const id =
    typeof window !== "undefined"
      ? window.location.pathname.split("/")[3]
      : null;

  useEffect(() => {
    if (mode === "edit" && id) {
      loadStaff();
    }
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);

    const { data, error } = await uploadCoverImage(file, "staff-images");

    setUploading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPreview(data);

    setForm((prev) => ({
      ...prev,
      avatar_url: data,
    }));

    toast.success("Profile image uploaded.");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      if (mode === "create") {
        const employeeId = await generateEmployeeId();

        const { error } = await addStaff({
          employee_id: employeeId,
          ...form,
          status: "Active",
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success("Staff added successfully.");
      } else {
        const { error } = await updateStaff(id!, form);

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success("Staff updated successfully.");
      }

      window.location.href = "/admin/staff";
    } catch (err) {
      console.error(err);
      toast.error(
        mode === "create" ? "Unable to add staff." : "Unable to update staff."
      );
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-10">
      <div className="flex flex-row justify-between">
        <div className="mb-10">
          <h1>{mode === "edit" ? "Edit Staff" : "Add Staff"}</h1>
          <p className="mt-2 text-slate-500">Create a new employee profile.</p>
        </div>
        <a href="/admin/staff">
          <ArrowLeftCircle size={50} className="text-orange-500" />
        </a>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal */}

        <section className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold">Personal Information</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                First Name
              </label>

              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Last Name
              </label>

              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>

              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Phone</label>

              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Date of Birth
              </label>

              <input
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold">Profile Photo</h2>

          <div className="flex items-center gap-8">
            <div className="h-32 w-32 overflow-hidden rounded-full border">
              {preview ? (
                <img src={preview} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">
                  No Photo
                </div>
              )}
            </div>

            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />

              {uploading && (
                <p className="mt-2 text-sm text-primary">Uploading...</p>
              )}
            </div>
          </div>
        </section>

        {/* Employment */}

        <section className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold">Employment Information</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Department
              </label>

              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              >
                <option value="">Select Department</option>

                <option>Engineering</option>

                <option>Cloud Services</option>

                <option>Operations</option>

                <option>Training</option>

                <option>Finance</option>

                <option>Sales</option>

                <option>Marketing</option>

                <option>Administration</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Position</label>

              <input
                name="position"
                value={form.position}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Employment Type
              </label>

              <select
                name="employment_type"
                value={form.employment_type}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              >
                <option>Full Time</option>
                <option>Part Time</option>
                <option>Contract</option>
                <option>Intern</option>
                <option>Consultant</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Hire Date
              </label>

              <input
                type="date"
                name="hire_date"
                value={form.hire_date}
                onChange={handleChange}
                className="w-full rounded-xl border p-3"
              />
            </div>
          </div>
        </section>

        {/* Emergency */}

        <section className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold">Emergency Contact</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <input
              placeholder="Contact Name"
              name="emergency_contact"
              value={form.emergency_contact}
              onChange={handleChange}
              className="rounded-xl border p-3"
            />

            <input
              placeholder="Contact Phone"
              name="emergency_phone"
              value={form.emergency_phone}
              onChange={handleChange}
              className="rounded-xl border p-3"
            />
          </div>
        </section>

        {/* Address */}

        <section className="rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold">Address & Notes</h2>

          <textarea
            name="address"
            rows={3}
            placeholder="Address"
            value={form.address}
            onChange={handleChange}
            className="mb-6 w-full rounded-xl border p-3"
          />

          <textarea
            name="notes"
            rows={5}
            placeholder="Internal Notes"
            value={form.notes}
            onChange={handleChange}
            className="w-full rounded-xl border p-3"
          />
        </section>

        <div className="flex justify-end gap-4">
          <a href="/admin/staff" className="rounded-xl border px-6 py-3">
            Cancel
          </a>

          <button
            type="submit"
            className="rounded-xl bg-primary px-6 py-3 text-white hover:bg-green-500"
          >
            {mode === "edit" ? "Update Staff" : "Save Staff"}
          </button>
        </div>
      </form>
    </div>
  );
}
