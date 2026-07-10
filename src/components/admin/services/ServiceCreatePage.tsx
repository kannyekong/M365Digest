import { useState } from "react";
import toast from "react-hot-toast";

import ServiceForm from "./ServiceForm";

import { createService, type Service } from "../../../lib/services";

export default function ServiceCreatePage() {
  const [saving, setSaving] = useState(false);

  async function save(values: Partial<Service>) {
    setSaving(true);

    const { error } = await createService(values);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Service created successfully.");

    window.location.href = "/admin/services";
  }

  return (
    <ServiceForm
      loading={saving}
      onSubmit={save}
      onCancel={() => {
        window.location.href = "/admin/services";
      }}
    />
  );
}
