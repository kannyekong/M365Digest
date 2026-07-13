import ViewSubmissionModal from "../../../islands/ViewSubmissionModal";
import { Trash2 } from "lucide-react";
import { deleteContact } from "../../../lib/contact";
import toast from "react-hot-toast";

interface Props {
  contacts: any[];
  setContacts: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function ContactTable({ contacts, setContacts }: Props) {
  async function handleDelete(contact: any) {
    const confirmed = window.confirm("Delete this contact permanently?");

    if (!confirmed) return;

    const { error } = await deleteContact(contact.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Contact deleted.");

    // Remove the deleted row immediately
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
  }

  if (!contacts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h3 className="text-lg font-semibold text-slate-800">
          No contact submissions yet
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Contact form submissions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Contact Table</h1>

      <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="border-b bg-slate-50">
            <tr className="text-left text-sm font-semibold text-slate-700">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Question</th>
              <th className="px-6 py-4">View</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {contacts.map((contact) => (
              <tr key={contact.id} className="transition hover:bg-slate-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">
                    {contact.first_name} {contact.last_name}
                  </p>
                </td>

                <td className="px-6 py-4">{contact.email}</td>

                <td className="px-6 py-4">{contact.phone_number}</td>

                <td className="max-w-sm truncate px-6 py-4">
                  {contact.question}
                </td>

                <td className="px-6 py-4">
                  <ViewSubmissionModal
                    title="Contact Submission"
                    data={contact}
                  />
                </td>

                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(contact.created_at).toLocaleDateString()}
                </td>

                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDelete(contact)}
                    className="rounded-lg p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
