import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { BellRing, ChevronsUpDown, Layers, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  createNotification,
  listGroups,
  listUsers,
  NotificationType,
  toArray,
  type CreateNotificationRequest,
  sendNotificationAsUser,
  sendNotificationToGroup,
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
type GroupOption = {
  id: string;
  label: string;
};

type NotificationTypeOption = {
  value: NotificationType;
  label: string;
  className: string;
  style: CSSProperties;
};

type SendMode = "direct-user" | "group" | "user-endpoint";

const notificationTypeOptions: NotificationTypeOption[] = [
  {
    value: NotificationType.Info,
    label: "Info",
    className: "border-blue-200 bg-blue-100 text-blue-800",
    style: {
      borderColor: "#93c5fd",
      backgroundColor: "#dbeafe",
      color: "#1e40af",
    },
  },
  {
    value: NotificationType.Success,
    label: "Success",
    className: "border-green-200 bg-green-100 text-green-800",
    style: {
      borderColor: "#86efac",
      backgroundColor: "#dcfce7",
      color: "#166534",
    },
  },
  {
    value: NotificationType.Warning,
    label: "Warning",
    className: "border-yellow-200 bg-yellow-100 text-yellow-800",
    style: {
      borderColor: "#fde047",
      backgroundColor: "#fef9c3",
      color: "#854d0e",
    },
  },
  {
    value: NotificationType.Error,
    label: "Error",
    className: "border-red-200 bg-red-100 text-red-800",
    style: {
      borderColor: "#fca5a5",
      backgroundColor: "#fee2e2",
      color: "#991b1b",
    },
  },
];

const sendModeOptions: Array<{
  value: SendMode;
  label: string;
  icon: typeof UserRound;
}> = [
  {
    value: "direct-user",
    label: "Fərdi istifadəçi",
    icon: UserRound,
  },
  {
    value: "group",
    label: "Qrup",
    icon: Layers,
  },
  {
    value: "user-endpoint",
    label: "Hər kəsə",
    icon: BellRing,
  },
];

export function NotificationsPanel({ roleLabel }: { roleLabel: string }) {
  const [to, setTo] = useState("");
  const [groupId, setGroupId] = useState("");
  const [message, setMessage] = useState("");
  const [sendMode, setSendMode] = useState<SendMode>("direct-user");
  const [notificationType, setNotificationType] = useState<NotificationType>(
    NotificationType.Info,
  );
  const [isSending, setIsSending] = useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [isLoadingMoreRecipients, setIsLoadingMoreRecipients] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientTotalPages, setRecipientTotalPages] = useState(1);
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  const canSend = useMemo(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return false;
    if (sendMode === "direct-user") return Boolean(to.trim());
    if (sendMode === "group") return Boolean(groupId.trim());
    return true;
  }, [groupId, message, sendMode, to]);

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

  const loadGroups = async () => {
    try {
      setIsLoadingGroups(true);
      const resp = await listGroups(1, 100);
      const items = toArray<any>(resp);
      const next = items
        .map((g) => {
          const id = String(g?.id ?? g?.groupId ?? g?.groupID ?? "").trim();
          const code = String(g?.groupCode ?? g?.code ?? "").trim();
          if (!id) return null;
          return { id, label: code || `Group ${id}` };
        })
        .filter((item): item is GroupOption => Boolean(item));

      setGroups(
        Array.from(new Map(next.map((item) => [item.id, item])).values()),
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load groups");
      setGroups([]);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, []);

  const hasMoreRecipients = recipientPage < recipientTotalPages;
  const selectedRecipient = recipients.find((x) => x.id === to);
  const selectedGroup = groups.find((x) => x.id === groupId);
  const selectedType =
    notificationTypeOptions.find((x) => x.value === notificationType) ??
    notificationTypeOptions[0];

  const handleSend = async () => {
    try {
      if (!canSend) {
        toast.error("Please select To and fill Message");
        return;
      }

      setIsSending(true);
      const trimmedMessage = message.trim();
      if (sendMode === "direct-user") {
        const payload: CreateNotificationRequest = {
          from: "",
          to: to.trim(),
          notificationType,
          message: trimmedMessage,
        };
        await createNotification(payload);
      } else if (sendMode === "group") {
        await sendNotificationToGroup(groupId.trim(), {
          notificationType,
          message: trimmedMessage,
        });
      } else {
        await sendNotificationAsUser({
          notificationType,
          message: trimmedMessage,
        });
      }

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
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
            Bildirişlər
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-1">
          <div className="space-y-3">
            <Label htmlFor={`${roleLabel}-mode`} className="block">
              Göndərmə üsulu
            </Label>
            <div id={`${roleLabel}-mode`} className="grid grid-cols-3 gap-2">
              {sendModeOptions.map((mode) => {
                const Icon = mode.icon;
                const active = sendMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSendMode(mode.value)}
                    className={`flex h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
                      active
                        ? "shadow-sm ring-2 ring-slate-200"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: "#000000",
                            color: "#ffffff",
                            borderColor: "#000000",
                          }
                        : undefined
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {sendMode === "direct-user" && (
            <div className="space-y-3">
              <Label htmlFor={`${roleLabel}-to`} className="block">
                Kimə
              </Label>
              <Popover open={recipientOpen} onOpenChange={setRecipientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id={`${roleLabel}-to`}
                    variant="outline"
                    role="combobox"
                    aria-expanded={recipientOpen}
                    className="h-11 w-full justify-between rounded-xl border-slate-200 bg-white font-normal text-slate-700"
                    disabled={isLoadingRecipients}
                  >
                    <span className="truncate">
                      {selectedRecipient?.label ??
                        (isLoadingRecipients
                          ? "Istifadəçilər yüklənir..."
                          : "Istifadəçi seçin")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-(--radix-popover-trigger-width) rounded-xl border-slate-200 p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="İstifadəçiləri axtar..." />
                    <CommandList>
                      <CommandEmpty>İstifadəçi tapılmadı.</CommandEmpty>
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
                        {isLoadingMoreRecipients
                          ? "Yüklənir..."
                          : "Daha çox istifadəçi göstər"}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          )}

          {sendMode === "group" && (
            <div className="space-y-3">
              <Label htmlFor={`${roleLabel}-group-id`} className="block">
                Qrup
              </Label>
              <Popover open={groupOpen} onOpenChange={setGroupOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id={`${roleLabel}-group-id`}
                    variant="outline"
                    role="combobox"
                    aria-expanded={groupOpen}
                    className="h-11 w-full justify-between rounded-xl border-slate-200 bg-white font-normal text-slate-700"
                    disabled={isLoadingGroups}
                  >
                    <span className="truncate">
                      {selectedGroup?.label ??
                        (isLoadingGroups
                          ? "Qruplar yüklənir..."
                          : "Qrup seçin")}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-(--radix-popover-trigger-width) rounded-xl border-slate-200 p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Qrupları axtar..." />
                    <CommandList>
                      <CommandEmpty>Qrup tapılmadı.</CommandEmpty>
                      <CommandGroup>
                        {groups.map((group) => (
                          <CommandItem
                            className="cursor-pointer"
                            key={group.id}
                            value={`${group.label} ${group.id}`}
                            onSelect={() => {
                              setGroupId(group.id);
                              setGroupOpen(false);
                            }}
                          >
                            <span className="truncate">{group.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor={`${roleLabel}-type`} className="block">
              Bildiriş növü
            </Label>
            <Popover open={typeOpen} onOpenChange={setTypeOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={`${roleLabel}-type`}
                  variant="outline"
                  role="combobox"
                  aria-expanded={typeOpen}
                  className="h-11 w-full justify-between rounded-xl font-normal"
                  style={selectedType.style}
                >
                  <span>{selectedType.label}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-(--radix-popover-trigger-width) p-0"
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

          <div className="space-y-3">
            <Label htmlFor={`${roleLabel}-message`} className="block">
              Mesaj
            </Label>
            <Textarea
              id={`${roleLabel}-message`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Bildiriş mesajınızı yazın..."
              className="min-h-28 rounded-xl border-slate-200 bg-white"
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!canSend || isSending}
            className="h-11 rounded-xl px-6 font-semibold sm:w-auto"
          >
            {isSending ? "Göndərilir..." : "Göndər"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
