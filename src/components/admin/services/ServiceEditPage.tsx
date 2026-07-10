import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import ServiceForm from "./ServiceForm";

import { getService, updateService, type Service } from "../../../lib/services";

interface Props {
  serviceId: string;
}

export default function ServiceEditPage({ serviceId }: Props) {
  const [service, setService] = useState<Service | null>(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadService();
  }, []);

  async function loadService() {
    const { data, error } = await getService(serviceId);

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setService(data);

    setLoading(false);
  }

  async function save(values: Partial<Service>) {
    setSaving(true);

    const { error } = await updateService(serviceId, values);

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Service updated successfully.");

    window.location.href = "/admin/services";
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow">
        Loading...
      </div>
    );
  }

  if (!service) {
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow">
        Service not found.
      </div>
    );
  }

  return (
    <ServiceForm
      initialValues={service}
      loading={saving}
      onSubmit={save}
      onCancel={() => {
        window.location.href = "/admin/services";
      }}
    />
  );
}
