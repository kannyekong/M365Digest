import { useState, useEffect, useMemo } from "react";
import type {
  AcademyInstructor,
  AcademyProgram,
  AcademyProgramInstructor,
} from "../../types/academy";
import InstructorSkillsInput from "./InstructorSkillsInput";
import SectionCard from "../ui/SectionCard";
import TextInput from "../ui/TextInput";
import TextArea from "../ui/TextArea";
import Toggle from "../ui/Toggle";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import CoverImageUploader from "../../blog/ImageUploader";
import {
  ArrowLeftCircle,
  BookOpen,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import { getAcademyPrograms } from "../../lib/academy";
import {
  assignAcademyProgramInstructor,
  getAcademyInstructorProgramAssignments,
  getAcademyProgramInstructors,
  removeAcademyProgramInstructor,
} from "../../lib/academy_program_instructors";

interface Props {
  initialValues?: Partial<AcademyInstructor>;
  loading?: boolean;

  onSubmit: (values: Partial<AcademyInstructor>) => Promise<void>;

  onCancel?: () => void;
}

export default function InstructorForm({
  initialValues,
  loading = false,
  onSubmit,
  onCancel,
}: Props) {
  const [values, setValues] = useState<Partial<AcademyInstructor>>({
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

  /* Stores all Academy programs available for instructor assignment. */
  const [programs, setPrograms] = useState<AcademyProgram[]>([]);

  /* Stores programs currently assigned to this instructor. */
  const [programAssignments, setProgramAssignments] = useState<
    AcademyProgramInstructor[]
  >([]);

  /* Stores the program selected for a new assignment. */
  const [selectedProgramId, setSelectedProgramId] = useState("");

  /* Tracks program-assignment loading. */
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  /* Tracks creation of a program assignment. */
  const [assigningProgram, setAssigningProgram] = useState(false);

  /* Tracks removal of a program assignment. */
  const [removingAssignmentId, setRemovingAssignmentId] = useState<
    string | null
  >(null);

  const instructorId = initialValues?.id ?? null;

  const isEditMode = Boolean(instructorId);

  /* Loads Academy programs and the programs currently assigned to this instructor. */
  async function loadInstructorPrograms() {
    if (!instructorId) {
      return;
    }

    setLoadingPrograms(true);

    try {
      const [programRecords, assignmentRecords] = await Promise.all([
        getAcademyPrograms(),
        getAcademyInstructorProgramAssignments(instructorId),
      ]);

      setPrograms(programRecords);
      setProgramAssignments(assignmentRecords);
    } catch (error) {
      console.error("Failed to load instructor programs:", error);

      toast.error("The instructor's program assignments could not be loaded.");
    } finally {
      setLoadingPrograms(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    await onSubmit(values);
  }

  /* Loads program assignments when editing an existing instructor. */
  useEffect(() => {
    void loadInstructorPrograms();
  }, [instructorId]);

  /* Removes already-assigned and archived programs from the assignment selector. */
  const availablePrograms = useMemo(() => {
    const assignedProgramIds = new Set(
      programAssignments.map((assignment) => assignment.program_id)
    );

    return programs.filter(
      (program) =>
        program.status !== "archived" && !assignedProgramIds.has(program.id)
    );
  }, [programs, programAssignments]);

  /* Assigns the instructor to the selected Academy program. */
  async function handleAssignProgram() {
    if (!instructorId || !selectedProgramId || assigningProgram) {
      return;
    }

    setAssigningProgram(true);

    try {
      const existingProgramInstructors =
        await getAcademyProgramInstructors(selectedProgramId);

      await assignAcademyProgramInstructor({
        program_id: selectedProgramId,
        instructor_id: instructorId,
        is_lead: existingProgramInstructors.length === 0,
        display_order: existingProgramInstructors.length,
      });

      setSelectedProgramId("");

      await loadInstructorPrograms();

      toast.success("Instructor assigned to the program.");
    } catch (error) {
      console.error("Failed to assign instructor to program:", error);

      toast.error("The instructor could not be assigned to this program.");
    } finally {
      setAssigningProgram(false);
    }
  }

  /* Removes one Academy program assignment without deleting the instructor or program. */
  async function handleRemoveProgramAssignment(
    assignment: AcademyProgramInstructor
  ) {
    if (removingAssignmentId) {
      return;
    }

    const programName = assignment.program?.title ?? "this program";

    const confirmed = window.confirm(
      `Remove this instructor from ${programName}?`
    );

    if (!confirmed) {
      return;
    }

    setRemovingAssignmentId(assignment.id);

    try {
      await removeAcademyProgramInstructor(assignment.id);

      setProgramAssignments((currentAssignments) =>
        currentAssignments.filter(
          (currentAssignment) => currentAssignment.id !== assignment.id
        )
      );

      toast.success("Program assignment removed.");
    } catch (error) {
      console.error("Failed to remove instructor program assignment:", error);

      toast.error("The program assignment could not be removed.");
    } finally {
      setRemovingAssignmentId(null);
    }
  }

  return (
    <div className="p-10 space-y-10">
      <div className="flex flex-row justify-between">
        <div className="">
          <h1 className="text-xl font-bold">
            {isEditMode ? "Edit Instructor" : "Add an Instructor"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {isEditMode
              ? "Update the instructor profile and Academy program assignments."
              : "Create a new Academy instructor."}
          </p>
        </div>
        <a href="/admin/bootcamp/instructors">
          <ArrowLeftCircle size={50} className="text-orange-500" />
        </a>
      </div>
      <form
        onSubmit={submit}
        className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(380px,1fr)]"
      >
        {/* ===========================
          LEFT COLUMN
      ============================ */}

        <div className="min-w-0 space-y-8">
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
            subtitle="Visibility, display options and Academy program assignments."
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
              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />

                  <p className="text-sm font-semibold text-slate-800">
                    Assigned Programs
                  </p>
                </div>

                {!isEditMode ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <p className="text-xs leading-5 text-slate-500">
                      Save the instructor first before assigning Academy
                      programs.
                    </p>
                  </div>
                ) : loadingPrograms ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading programs...
                  </div>
                ) : (
                  <>
                    <div className="mt-4 space-y-3">
                      {programAssignments.length > 0 ? (
                        programAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="rounded-xl border border-slate-200 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {assignment.program?.title ??
                                    "Unknown program"}
                                </p>

                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-600">
                                    {assignment.program?.status ?? "unknown"}
                                  </span>

                                  {assignment.is_lead && (
                                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                                      Lead Instructor
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                title="Remove program assignment"
                                onClick={() => {
                                  void handleRemoveProgramAssignment(
                                    assignment
                                  );
                                }}
                                disabled={
                                  removingAssignmentId === assignment.id
                                }
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                              >
                                {removingAssignmentId === assignment.id ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs leading-5 text-slate-500">
                          This instructor has not been assigned to an Academy
                          program.
                        </p>
                      )}
                    </div>

                    <div className="mt-5 space-y-3">
                      <select
                        value={selectedProgramId}
                        onChange={(event) => {
                          setSelectedProgramId(event.target.value);
                        }}
                        disabled={
                          assigningProgram || availablePrograms.length === 0
                        }
                        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                      >
                        <option value="">
                          {availablePrograms.length > 0
                            ? "Select a program"
                            : "No programs available"}
                        </option>

                        {availablePrograms.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.title}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          void handleAssignProgram();
                        }}
                        disabled={!selectedProgramId || assigningProgram}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary px-4 text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {assigningProgram ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Assign Program
                      </button>
                    </div>
                  </>
                )}
              </div>
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
