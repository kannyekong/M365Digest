import { useState } from "react";

import type { Testimonial } from "../../../lib/testimonials";

import SectionCard from "../../ui/SectionCard";
import TextInput from "../../ui/TextInput";
import TextArea from "../../ui/TextArea";
import Toggle from "../../ui/Toggle";

import PrimaryButton from "../../ui/PrimaryButton";
import SecondaryButton from "../../ui/SecondaryButton";
import { ArrowLeftCircle } from "lucide-react";

interface Props {
  initialValues?: Partial<Testimonial>;

  loading?: boolean;

  onSubmit: (values: Partial<Testimonial>) => Promise<void>;

  onCancel?: () => void;
}

export default function TestimonialForm({
  initialValues,
  loading = false,
  onSubmit,
  onCancel,
}: Props) {
  const [values, setValues] = useState<Partial<Testimonial>>({
    full_name: initialValues?.full_name ?? "",

    position: initialValues?.position ?? "",

    company: initialValues?.company ?? "",

    testimonial: initialValues?.testimonial ?? "",

    rating: initialValues?.rating ?? 5,

    display_order: initialValues?.display_order ?? 1,

    is_active: initialValues?.is_active ?? true,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    await onSubmit(values);
  }

  return (
    <div className="p-12">
      <div className="flex flex-row justify-between">
        <div className="mb-10">
          <h1 className="text-xl font-bold">Add Testimonial</h1>
          <p className="mt-2 text-slate-500 text-sm">
            Create a new testimonial item
          </p>
        </div>
        <a href="/admin/testimonials/">
          <ArrowLeftCircle size={50} className="text-orange-500" />
        </a>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <a
          className="text-sm underline text-blue-500"
          href="https://cloudtweak.com/#testimonials"
        >
          See live preview{" "}
        </a>
        <SectionCard title="What our clients say about us" subtitle="">
          <div className="space-y-5">
            <TextInput
              label="Full Name"
              value={values.full_name}
              onChange={(e) =>
                setValues({
                  ...values,
                  full_name: e.target.value,
                })
              }
            />

            <TextInput
              label="Position"
              value={values.position}
              onChange={(e) =>
                setValues({
                  ...values,
                  position: e.target.value,
                })
              }
            />

            <TextInput
              label="Company"
              value={values.company ?? ""}
              onChange={(e) =>
                setValues({
                  ...values,
                  company: e.target.value,
                })
              }
            />

            <TextArea
              label="Testimonial"
              rows={7}
              value={values.testimonial}
              onChange={(e) =>
                setValues({
                  ...values,
                  testimonial: e.target.value,
                })
              }
            />

            <TextInput
              label="Rating"
              type="number"
              value={String(values.rating)}
              onChange={(e) =>
                setValues({
                  ...values,
                  rating: Number(e.target.value),
                })
              }
            />
          </div>
        </SectionCard>

        <SectionCard title="Display" subtitle="Homepage settings.">
          <div className="space-y-5">
            <TextInput
              label="Display Order"
              type="number"
              value={String(values.display_order)}
              onChange={(e) =>
                setValues({
                  ...values,
                  display_order: Number(e.target.value),
                })
              }
            />

            <Toggle
              label="Active"
              description="Display on homepage."
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
            Save Testimonial
          </PrimaryButton>

          <SecondaryButton type="button" onClick={onCancel}>
            Cancel
          </SecondaryButton>
        </div>
      </form>
    </div>
  );
}
