import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Check,
  Video,
  ClipboardList,
  Award,
  Users,
  Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState<Tables<"notifications">[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      setError("Could not load notifications. Try again.");
      setLoading(false);
      return;
    }
    setError("");
    const items = data || [];
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.is_read).length);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void (async () => {
      await fetchNotifications();
    })();

    if (!user) return;
    // Realtime subscription
    const channel = supabase
      .channel(`notifications-${user.id}`, { config: { private: true } })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Tables<"notifications">;
          setNotifications((prev) => [n, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
          // Show toast for new notification
          toast(n.title, {
            description: n.message || undefined,
            duration: 5000,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setSaving(false);
    if (error) {
      setError("Could not mark notifications as read. Try again.");
      return;
    }
    setError("");
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", user?.id);
    setSaving(false);
    if (error) {
      setError("Could not mark this notification as read. Try again.");
      return false;
    }
    setError("");
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    return true;
  };

  const notificationIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return (
          <ClipboardList className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        );
      case "grade":
        return <Award className="h-4 w-4 text-warning shrink-0 mt-0.5" />;
      case "live_class":
        return <Video className="h-4 w-4 text-success shrink-0 mt-0.5" />;
      case "enrollment":
        return <Users className="h-4 w-4 text-info shrink-0 mt-0.5" />;
      case "badge":
        return <Award className="h-4 w-4 text-primary shrink-0 mt-0.5" />;
      default:
        return (
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        );
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Notifications"
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-w-[calc(100vw-1.5rem)]"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={markAllRead}
              disabled={saving}
            >
              <Check className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        {error && (
          <div role="alert" className="p-3 text-sm">
            {error}{" "}
            <Button variant="outline" onClick={fetchNotifications}>
              Retry
            </Button>
          </div>
        )}
        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="flex justify-center py-6">
              <p role="status">Loading notifications…</p>
            </div>
          ) : error &&
            notifications.length === 0 ? null : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <button
                  type="button"
                  disabled={saving}
                  key={n.id}
                  className={`block w-full px-3 py-2.5 text-left text-sm cursor-pointer transition-colors hover:bg-muted/50 ${!n.is_read ? "bg-primary/5" : ""}`}
                  onClick={async () => {
                    if (!n.is_read && !(await markRead(n.id))) return;
                    if (n.link) navigate(n.link);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                    {notificationIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-snug">{n.title}</p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
