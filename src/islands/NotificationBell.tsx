import { Bell } from "lucide-react";
import { useState } from "react";
import NotificationDropdown from "../components/notifications/NotificationDropdown";
import { useNotifications } from "../hooks/useNotifications";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function NotificationBell() {
  // Track whether the notification dropdown is open.
  const [isOpen, setIsOpen] = useState(false);

  // Load notification state and actions from the shared hook.
  const {
    notifications,
    unreadCount,
    loading,
    markingAllAsRead,
    errorMessage,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();

  // Toggle the notification dropdown.
  function toggleDropdown() {
    setIsOpen((current) => !current);
  }

  // Close the notification dropdown.
  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleDropdown}
        className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-slate-100 dark:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell size={21} className="text-slate-600" />

        <span
          className={`absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
            unreadCount === 0 ? "bg-slate-400" : "bg-red-500"
          }`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          markingAllAsRead={markingAllAsRead}
          errorMessage={errorMessage}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          removeNotification={removeNotification}
          closeDropdown={closeDropdown}
        />
      )}

      <ToastContainer
        position="top-right"
        autoClose={6000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}
