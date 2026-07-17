import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import ServiceTable from "./ServiceTable";

import { listServices, deleteService, type Service } from "../../../lib/services";

export default function ServiceListPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    const { data, error } = await listServices();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setServices(data ?? []);
    setLoading(false);
  }

  async function handleDelete(service: Service) {
    const confirmed = window.confirm(
      `Delete "${service.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    const { error } = await deleteService(service.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Service deleted.");

    loadServices();
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        Loading services...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-12">
      {/* Header */}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">All Services</h3>

          <p className="mt-2 text-slate-500 text-sm">
            Manage the services displayed on the CloudTweak website.
          </p>
        </div>

        <a
          href="/admin/services/new"
          className="inline-flex rounded-xl bg-primary px-5 py-3 text-white transition hover:opacity-90"
        >
          + Add Service
        </a>
      </div>

      <ServiceTable
        services={services}
        onEdit={(id) => {
          window.location.href = `/admin/services/${id}`;
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
