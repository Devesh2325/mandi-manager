import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useScope } from "@/lib/session-context";
import {
  LayoutDashboard,
  Truck,
  Receipt,
  Package,
  FileText,
  Users,
  BookOpen,
  Settings,
  HelpCircle,
  Sparkles,
  User,
  Box,
} from "lucide-react";

const pages = [
  { label: "Dashboard / डैशबोर्ड", to: "/app", icon: LayoutDashboard, shortcut: "F1" },
  { label: "Challan Entry / चालान", to: "/app/entry/challan", icon: Truck, shortcut: "F2" },
  { label: "Voucher (Pay / Recv) / भुगतान", to: "/app/entry/voucher", icon: Receipt, shortcut: "F3" },
  { label: "Stock Sale / बिक्री", to: "/app/stock/sale", icon: Receipt, shortcut: "F4" },
  { label: "Stock Register / स्टॉक", to: "/app/stock", icon: Package },
  { label: "Teep (Sale Reg.) / टीप", to: "/app/teep", icon: FileText },
  { label: "Ledger / खाता", to: "/app/ledger", icon: BookOpen },
  { label: "Cash Book / रोकड़", to: "/app/cashbook", icon: BookOpen },
  { label: "Trial Balance", to: "/app/trial-balance", icon: BookOpen },
  { label: "Bills / बिल", to: "/app/bills", icon: FileText },
  { label: "Reports / रिपोर्ट", to: "/app/reports", icon: FileText },
  { label: "Parties / पार्टी", to: "/app/masters/parties", icon: Users },
  { label: "Items / Quality / Size", to: "/app/masters/items", icon: Package },
  { label: "Expenses & Packing", to: "/app/masters/expenses", icon: Settings },
  { label: "Settings & Users", to: "/app/settings", icon: Settings },
  { label: "Buy plan", to: "/app/pricing", icon: Sparkles },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { companyId, yearId, ready } = useScope();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const parties =
    useLiveQuery(
      async () =>
        ready && open
          ? await db.parties.where({ companyId, yearId }).limit(50).toArray()
          : [],
      [companyId, yearId, ready, open],
    ) ?? [];

  const items =
    useLiveQuery(
      async () =>
        ready && open
          ? await db.items.where({ companyId, yearId }).limit(30).toArray()
          : [],
      [companyId, yearId, ready, open],
    ) ?? [];

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, parties, items… / पेज, पार्टी खोजें" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages / पेज">
          {pages.map((p) => {
            const Icon = p.icon;
            return (
              <CommandItem key={p.to} value={`page ${p.label}`} onSelect={() => go(p.to)}>
                <Icon className="mr-2 h-4 w-4" />
                <span>{p.label}</span>
                {p.shortcut && <CommandShortcut>{p.shortcut}</CommandShortcut>}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {parties.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Parties / पार्टी">
              {parties.map((p) => (
                <CommandItem
                  key={`p-${p.id}`}
                  value={`party ${p.name} ${p.shortCode}`}
                  onSelect={() => go("/app/masters/parties")}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{p.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {p.shortCode} · {p.type}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {items.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Items / आइटम">
              {items.map((it) => (
                <CommandItem
                  key={`i-${it.id}`}
                  value={`item ${it.name} ${it.shortCode}`}
                  onSelect={() => go("/app/masters/items")}
                >
                  <Box className="mr-2 h-4 w-4" />
                  <span>{it.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{it.shortCode}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Help">
          <CommandItem
            value="keyboard shortcuts help"
            onSelect={() => {
              setOpen(false);
              window.dispatchEvent(new Event("open-shortcuts"));
            }}
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Keyboard Shortcuts</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
