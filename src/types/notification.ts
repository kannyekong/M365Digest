export type NotificationType =
  | "quote"
  | "review"
  | "registration"
  | "contact"
  | "system"
  | "job_application";

export interface Notification {
  id: string;

  type: NotificationType;

  title: string;

  message: string | null;

  source_table: string | null;

  source_id: string | null;

  link: string | null;

  metadata: Record<string, unknown>;

  is_read: boolean;

  created_at: string;

  read_at: string | null;
}
