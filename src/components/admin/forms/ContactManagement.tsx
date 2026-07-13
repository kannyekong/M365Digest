import { useEffect, useState } from "react";
import { listContacts } from "../../../lib/contact";
import ContactTable from "./ContactTable";

interface Props {
    contacts: any[];
    setContacts: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function ContactManagement() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const data = await listContacts();

    setContacts(data);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 text-center">
        Loading contacts...
      </div>
    );
  }

  return <ContactTable contacts={contacts} setContacts={setContacts} />;
}
