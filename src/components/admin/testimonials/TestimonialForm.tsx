import { useState } from "react";

import type { Testimonial } from "../../../lib/testimonials";

import SectionCard from "../../ui/SectionCard";
import TextInput from "../../ui/TextInput";
import TextArea from "../../ui/TextArea";
import Toggle from "../../ui/Toggle";

import PrimaryButton from "../../ui/PrimaryButton";
import SecondaryButton from "../../ui/SecondaryButton";

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
    <form onSubmit={submit} className="space-y-8">
      <h1 className="text-3xl font-bold">Testimonial Form</h1>
      <SectionCard
        title="What our clients say about us"
        subtitle="This information is displayed on https://cloudtweak.com/#testimonials"
      >
        <a
          className="underline text-blue-500 "
          href="https://cloudtweak.net/#testimonials"
        >
          See Live Preview
        </a>
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
  );
}
