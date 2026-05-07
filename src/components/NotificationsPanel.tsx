import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import {
  createNotification,
  listUsers,
  NotificationType,
  type CreateNotificationRequest,
} from "../api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Textarea } from "./ui/textarea";

type RecipientOption = {
  id: string;
  label: string;
};

type NotificationTypeOption = {
  value: NotificationType;
  label: string;
  className: string;
  style: CSSProperties;
};

const notificationTypeOptions: NotificationTypeOption[] = [
  {
    value: NotificationType.Info,
    label: "Info",
    className: "border-blue-200 bg-blue-100 text-blue-800",
    style: { borderColor: "#93c5fd", backgroundColor: "#dbeafe", color: "#1e40af" },
  },
  {
    value: NotificationType.Success,
    label: "Success",
    className: "border-green-200 bg-green-100 text-green-800",
    style: { borderColor: "#86efac", backgroundColor: "#dcfce7", color: "#166534" },
  },
  {
    value: NotificationType.Warning,
    label: "Warning",
    className: "border-yellow-200 bg-yellow-100 text-yellow-800",
    style: { borderColor: "#fde047", backgroundColor: "#fef9c3", color: "#854d0e" },
  },
  {
    value: NotificationType.Error,
    label: "Error",
    className: "border-red-200 bg-red-100 text-red-800",
    style: { borderColor: "#fca5a5", backgroundColor: "#fee2e2", color: "#991b1b" },
  },
];

export function NotificationsPanel({ roleLabel }: { roleLabel: string }) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [notificationType, setNotificationType] = useState<NotificationType>(
    NotificationType.Info,
  );
  const [isSending, setIsSending] = useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [isLoadingMoreRecipients, setIsLoadingMoreRecipients] = useState(false);
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientTotalPages, setRecipientTotalPages] = useState(1);
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const canSend = useMemo(() => to.trim() && message.trim(), [to, message]);

  const loadRecipients = async (page: number) => {
    try {
      if (page === 1) setIsLoadingRecipients(true);
      else setIsLoadingMoreRecipients(true);

      const resp = await listUsers(page, 30);
      const next = resp.items.map((item) => ({
        id: item.id,
        label: item.fullName || `User ${item.id}`,
      }));

      setRecipients((prev) => {
        const merged = page === 1 ? next : [...prev, ...next];
        return Array.from(
          new Map(merged.map((item) => [item.id, item])).values(),
        );
      });
      setRecipientPage(resp.page);
      setRecipientTotalPages(resp.totalPages);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load users");
      if (page === 1) setRecipients([]);
    } finally {
      if (page === 1) setIsLoadingRecipients(false);
      else setIsLoadingMoreRecipients(false);
    }
  };

  useEffect(() => {
    void loadRecipients(1);
  }, []);

  const hasMoreRecipients = recipientPage < recipientTotalPages;
  const selectedRecipient = recipients.find((x) => x.id === to);
  const selectedType =
    notificationTypeOptions.find((x) => x.value === notificationType) ??
    notificationTypeOptions[0];

  const handleSend = async () => {
    try {
      if (!canSend) {
        toast.error("Please select To and fill Message");
        return;
      }

      const payload: CreateNotificationRequest = {
        from: "",
        to: to.trim(),
        notificationType,
        message: message.trim(),
      };

      setIsSending(true);
      await createNotification(payload);
      toast.success("Notification sent");
      setMessage("");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to send notification");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{roleLabel} - Send Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${roleLabel}-to`}>To</Label>
            <Popover open={recipientOpen} onOpenChange={setRecipientOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={`${roleLabel}-to`}
                  variant="outline"
                  role="combobox"
                  aria-expanded={recipientOpen}
                  className="w-full justify-between font-normal"
                  disabled={isLoadingRecipients}
                >
                  <span className="truncate">
                    {selectedRecipient?.label ??
                      (isLoadingRecipients ? "Loading users..." : "Select user")}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      {recipients.map((user) => (
                        <CommandItem
                          className="cursor-pointer"
                          key={user.id}
                          value={`${user.label} ${user.id}`}
                          onSelect={() => {
                            setTo(user.id);
                            setRecipientOpen(false);
                          }}
                        >
                          <span className="truncate">{user.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                {hasMoreRecipients && (
                  <div className="border-t p-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={isLoadingMoreRecipients}
                      onClick={() => void loadRecipients(recipientPage + 1)}
                    >
                      {isLoadingMoreRecipients ? "Loading..." : "Load more users"}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${roleLabel}-type`}>Notification Type</Label>
            <Popover open={typeOpen} onOpenChange={setTypeOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={`${roleLabel}-type`}
                  variant="outline"
                  role="combobox"
                  aria-expanded={typeOpen}
                  className="w-full justify-between font-normal"
                  style={selectedType.style}
                >
                  <span>{selectedType.label}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0"
                align="start"
              >
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {notificationTypeOptions.map((option) => (
                        <CommandItem
                          className="cursor-pointer"
                          key={option.value}
                          value={option.label}
                          onSelect={() => {
                            setNotificationType(option.value);
                            setTypeOpen(false);
                          }}
                        >
                          <span
                            className={`inline-flex min-w-[88px] justify-center rounded-md border px-2 py-1 text-xs font-medium ${option.className}`}
                            style={option.style}
                          >
                            {option.label}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${roleLabel}-message`}>Message</Label>
            <Textarea
              id={`${roleLabel}-message`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your notification message..."
            />
          </div>

          <Button onClick={handleSend} disabled={!canSend || isSending}>
            {isSending ? "Sending..." : "Send"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
