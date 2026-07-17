import ProfilePasswordCard from "./ProfilePasswordCard";
import ProfileImageCard from "./ProfileImageCard";

export default function ProfileManagement() {
  return (
    <div className="space-y-8 p-12">
      <h1 className="text-xl font-bold">My Profile Settings</h1>
      <ProfileImageCard />
      <ProfilePasswordCard />
    </div>
  );
}
