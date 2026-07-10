import { useState } from "react";
import { Plus, X } from "lucide-react";

interface Props {
  skills: string[];
  onChange: (skills: string[]) => void;
}

export default function InstructorSkillsInput({ skills, onChange }: Props) {
  const [skill, setSkill] = useState("");

  function addSkill() {
    const value = skill.trim();

    if (!value) return;

    if (skills.includes(value)) {
      setSkill("");
      return;
    }

    onChange([...skills, value]);

    setSkill("");
  }

  function removeSkill(index: number) {
    onChange(skills.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold text-slate-700">Skills</label>

      {/* Tags */}

      <div className="flex flex-wrap gap-2">
        {skills.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
          >
            {item}

            <button
              type="button"
              onClick={() => removeSkill(index)}
              className="rounded-full transition hover:bg-primary/20"
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>

      {/* Input */}

      <div className="flex gap-3">
        <input
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a skill..."
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        <button
          type="button"
          onClick={addSkill}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 text-white transition hover:opacity-90"
        >
          <Plus size={18} />
          Add
        </button>
      </div>
    </div>
  );
}
