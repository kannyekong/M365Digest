import ProfilePasswordCard from "./ProfilePasswordCard";
import ProfileImageCard from "./ProfileImageCard";

export default function ProfileManagement() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">My Profile</h1>

      <ProfileImageCard />

      <ProfilePasswordCard />
    </div>
  );
}
