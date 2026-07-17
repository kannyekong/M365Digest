import { useState } from "react";
import type { BootcampInstructor } from "../../lib/bootcamp_instructors";
import InstructorSkillsInput from "./InstructorSkillsInput";
import SectionCard from "../ui/SectionCard";
import TextInput from "../ui/TextInput";
import TextArea from "../ui/TextArea";
import Toggle from "../ui/Toggle";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import CoverImageUploader from "../../blog/ImageUploader";
import { ArrowLeftCircle } from "lucide-react";

interface Props {
  initialValues?: Partial<BootcampInstructor>;
  loading?: boolean;

  onSubmit: (values: Partial<BootcampInstructor>) => Promise<void>;

  onCancel?: () => void;
}

export default function InstructorForm({
  initialValues,
  loading = false,
  onSubmit,
  onCancel,
}: Props) {
  const [values, setValues] = useState<Partial<BootcampInstructor>>({
    full_name: initialValues?.full_name ?? "",
    title: initialValues?.title ?? "",
    bio: initialValues?.bio ?? "",
    image_url: initialValues?.image_url ?? "",
    skills: initialValues?.skills ?? [],
    linkedin_url: initialValues?.linkedin_url ?? "",
    github_url: initialValues?.github_url ?? "",
    email: initialValues?.email ?? "",
    phone: initialValues?.phone ?? "",
    website: initialValues?.website ?? "",
    display_order: initialValues?.display_order ?? 1,
    is_active: initialValues?.is_active ?? true,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    await onSubmit(values);
  }

  return (
    <div className="p-10 space-y-10">
      <div className="flex flex-row justify-between">
        <div className="">
          <h1 className="text-xl font-bold">Add an Instructor</h1>
          <p className="mt-2 text-slate-500 text-sm">Create a new instructor</p>
        </div>
        <a href="/admin/bootcamp/instructors">
          <ArrowLeftCircle size={50} className="text-orange-500" />
        </a>
      </div>
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-3">
        {/* ===========================
          LEFT COLUMN
      ============================ */}

        <div className="space-y-8 lg:col-span-2">
          {/* ===========================
            PROFILE INFORMATION
        ============================ */}

          <SectionCard
            title="Profile Information"
            subtitle="Basic information displayed publicly."
          >
            <div className="space-y-5">
              <TextInput
                label="Full Name"
                placeholder="John Doe"
                value={values.full_name}
                onChange={(e) =>
                  setValues({
                    ...values,
                    full_name: e.target.value,
                  })
                }
              />

              <TextInput
                label="Professional Title"
                placeholder="Senior Microsoft 365 Engineer"
                value={values.title}
                onChange={(e) =>
                  setValues({
                    ...values,
                    title: e.target.value,
                  })
                }
              />

              <TextArea
                label="Biography"
                rows={7}
                placeholder="Tell students about this instructor..."
                value={values.bio}
                onChange={(e) =>
                  setValues({
                    ...values,
                    bio: e.target.value,
                  })
                }
              />
            </div>
          </SectionCard>

          {/* ===========================
            PROFESSIONAL SKILLS
        ============================ */}

          <SectionCard
            title="Professional Skills"
            subtitle="These appear on the instructor profile."
          >
            <InstructorSkillsInput
              skills={values.skills ?? []}
              onChange={(skills) =>
                setValues({
                  ...values,
                  skills,
                })
              }
            />
          </SectionCard>

          {/* ===========================
            CONTACT INFORMATION
        ============================ */}

          <SectionCard
            title="Contact Information"
            subtitle="Optional public contact links."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextInput
                label="Email"
                type="email"
                placeholder="john@cloudtweak.net"
                value={values.email}
                onChange={(e) =>
                  setValues({
                    ...values,
                    email: e.target.value,
                  })
                }
              />

              <TextInput
                label="Phone"
                placeholder="+234..."
                value={values.phone}
                onChange={(e) =>
                  setValues({
                    ...values,
                    phone: e.target.value,
                  })
                }
              />

              <TextInput
                label="Website"
                placeholder="https://"
                value={values.website}
                onChange={(e) =>
                  setValues({
                    ...values,
                    website: e.target.value,
                  })
                }
              />

              <TextInput
                label="LinkedIn"
                placeholder="https://linkedin.com/in/..."
                value={values.linkedin_url}
                onChange={(e) =>
                  setValues({
                    ...values,
                    linkedin_url: e.target.value,
                  })
                }
              />

              <div className="md:col-span-2">
                <TextInput
                  label="GitHub"
                  placeholder="https://github.com/..."
                  value={values.github_url}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      github_url: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ===========================
          RIGHT SIDEBAR
      ============================ */}

        <div className="space-y-6 lg:sticky lg:top-8 self-start">
          {/* ===========================
            PROFILE IMAGE
        ============================ */}

          <SectionCard
            title="Profile Photo"
            subtitle="Upload the instructor's profile image."
          >
            <div className="space-y-5">
              <CoverImageUploader
                bucket="instructors"
                value={values.image_url ?? ""}
                onChange={(url) =>
                  setValues({
                    ...values,
                    image_url: url,
                  })
                }
              />
            </div>
          </SectionCard>

          {/* ===========================
            SETTINGS
        ============================ */}

          <SectionCard
            title="Instructor Settings"
            subtitle="Visibility and display options."
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
                label="Is an Active Instructor"
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

          {/* ===========================
            ACTIONS
        ============================ */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3">
              <PrimaryButton type="submit" loading={loading}>
                Save Instructor
              </PrimaryButton>

              <SecondaryButton type="button" onClick={onCancel}>
                Cancel
              </SecondaryButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
