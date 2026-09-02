import { useState } from "react";
import type { Service } from "../../../lib/services";
import SectionCard from "../../ui/SectionCard";
import TextInput from "../../ui/TextInput";
import TextArea from "../../ui/TextArea";
import Toggle from "../../ui/Toggle";
import PrimaryButton from "../../ui/PrimaryButton";
import SecondaryButton from "../../ui/SecondaryButton";

import { ArrowLeftCircle } from "lucide-react";

interface Props {
  initialValues?: Partial<Service>;
  loading?: boolean;
  onSubmit: (values: Partial<Service>) => Promise<void>;
  onCancel?: () => void;
}

export default function ServiceForm({
  initialValues,
  loading = false,
  onSubmit,
  onCancel,
}: Props) {
  const [values, setValues] = useState<Partial<Service>>({
    title: initialValues?.title ?? "",
    description: initialValues?.description ?? "",
    badge: initialValues?.badge ?? "",
    button_text: initialValues?.button_text ?? "",
    button_url: initialValues?.button_url ?? "",

    nav_short_description: initialValues?.nav_short_description ?? "",
    nav_order: initialValues?.nav_order ?? initialValues?.display_order ?? 1,
    display_on_nav: initialValues?.display_on_nav ?? true,

    highlight: initialValues?.highlight ?? false,
    display_order: initialValues?.display_order ?? 1,
    is_active: initialValues?.is_active ?? true,
  });

  /* Submits the current service form values to the parent save handler. */
  async function submit(e: React.FormEvent) {
    e.preventDefault();

    await onSubmit(values);
  }

  return (
    <div className="p-10">
      <div className="flex flex-row justify-between">
        <div className="mb-10">
          <h1 className="text-xl font-bold">
            {initialValues?.id ? "Edit Service" : "Add a Service"}
          </h1>

          <p className="mt-2 text-xs text-slate-500">
            {initialValues?.id
              ? "Update service information and display settings."
              : "Create a new service."}
          </p>
        </div>

        <a href="/admin/services/">
          <ArrowLeftCircle size={50} className="text-orange-500" />
        </a>
      </div>

      <form onSubmit={submit} className="space-y-8">
        <SectionCard
          title="Service Information"
          subtitle="Information displayed on the company website."
        >
          <div className="space-y-5">
            <TextInput
              label="Title"
              value={values.title ?? ""}
              onChange={(e) =>
                setValues({
                  ...values,
                  title: e.target.value,
                })
              }
            />

            <TextArea
              label="Description"
              rows={6}
              value={values.description ?? ""}
              onChange={(e) =>
                setValues({
                  ...values,
                  description: e.target.value,
                })
              }
            />

            <TextInput
              label="Badge"
              placeholder="Now Enrolling"
              value={values.badge ?? ""}
              onChange={(e) =>
                setValues({
                  ...values,
                  badge: e.target.value,
                })
              }
            />

            <TextInput
              label="Button Text"
              value={values.button_text ?? ""}
              onChange={(e) =>
                setValues({
                  ...values,
                  button_text: e.target.value,
                })
              }
            />

            <TextInput
              label="Button URL"
              placeholder="/solutions/example-solution"
              value={values.button_url ?? ""}
              onChange={(e) =>
                setValues({
                  ...values,
                  button_url: e.target.value,
                })
              }
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Navigation Settings"
          subtitle="Control whether this service appears in the Solutions navbar dropdown."
        >
          <div className="space-y-5">
            <Toggle
              label="Display on Navigation"
              description="Show this service inside the Solutions dropdown on the public navbar."
              checked={values.display_on_nav ?? true}
              onChange={(checked) =>
                setValues({
                  ...values,
                  display_on_nav: checked,
                })
              }
            />

            <TextInput
              label="Navigation Order"
              type="number"
              value={String(values.nav_order ?? 1)}
              onChange={(e) =>
                setValues({
                  ...values,
                  nav_order: Number(e.target.value),
                })
              }
            />

            <TextArea
              label="Navigation Short Description"
              rows={3}
              value={values.nav_short_description ?? ""}
              onChange={(e) =>
                setValues({
                  ...values,
                  nav_short_description: e.target.value,
                })
              }
            />

            <p className="text-xs leading-5 text-slate-500">
              Keep the navigation description concise because it is displayed
              inside the Solutions dropdown.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Display Settings"
          subtitle="Control how this service appears across the website."
        >
          <div className="space-y-5">
            <TextInput
              label="Display Order"
              type="number"
              value={String(values.display_order ?? 1)}
              onChange={(e) =>
                setValues({
                  ...values,
                  display_order: Number(e.target.value),
                })
              }
            />

            <Toggle
              label="Featured Service"
              description="Highlights this card on the homepage."
              checked={values.highlight ?? false}
              onChange={(checked) =>
                setValues({
                  ...values,
                  highlight: checked,
                })
              }
            />

            <Toggle
              label="Active"
              description="Inactive services will not be displayed publicly."
              checked={values.is_active ?? true}
              onChange={(checked) =>
                setValues({
                  ...values,
                  is_active: checked,
                })
              }
            />
          </div>
        </SectionCard>

        <div className="flex gap-4">
          <PrimaryButton type="submit" loading={loading}>
            Save Service
          </PrimaryButton>

          <SecondaryButton type="button" onClick={onCancel}>
            Cancel
          </SecondaryButton>
        </div>
      </form>
    </div>
  );
}
