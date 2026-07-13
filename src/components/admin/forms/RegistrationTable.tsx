import ViewSubmissionModal from "../../../islands/ViewSubmissionModal";

interface Props {
  registrations: any[];
  reload: () => void;
}

export default function RegistrationTable({ registrations }: Props) {
  if (!registrations.length) {
    return (
      <div>
        <h1 className="text-3xl font-bold">Registration Table</h1>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center mt-10">
          <h3 className="text-lg font-semibold text-slate-800">
            No registrations yet
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Bootcamp registrations will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Registration Table</h1>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm mt-10">
        <h2>Bootcamp Registrations</h2>
        <table className="min-w-full">
          <thead className="border-b bg-slate-50">
            <tr className="text-left text-sm font-semibold text-slate-700">
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Country</th>
              <th className="px-6 py-4">Availability</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {registrations.map((student) => (
              <tr key={student.id} className="transition hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {student.first_name} {student.last_name}
                    </p>

                    <p className="text-sm text-slate-500">{student.email}</p>
                  </div>
                </td>

                <td className="px-6 py-4">{student.company}</td>

                <td className="px-6 py-4">{student.country}</td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      student.availability?.toLowerCase().includes("yes")
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {student.availability}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                    Pending
                  </span>
                </td>

                <td className="px-6 py-4">
                  <ViewSubmissionModal
                    title="Registration Details"
                    data={student}
                  />
                </td>

                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(student.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
