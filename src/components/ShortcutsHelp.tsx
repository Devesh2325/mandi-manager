import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const groups: { title: string; items: { keys: string[]; desc: string }[] }[] = [
  {
    title: "Navigation / नेविगेशन",
    items: [
      { keys: ["Ctrl", "K"], desc: "Open command palette (jump to anything)" },
      { keys: ["?"], desc: "Show this help" },
      { keys: ["F1"], desc: "Dashboard / डैशबोर्ड" },
      { keys: ["F2"], desc: "Challan Entry / चालान" },
      { keys: ["F3"], desc: "Voucher (Pay / Recv)" },
      { keys: ["F4"], desc: "Stock Sale" },
    ],
  },
  {
    title: "Challan Entry / चालान",
    items: [
      { keys: ["Ctrl", "S"], desc: "Save challan / चालान सेव करें" },
      { keys: ["Ctrl", "Enter"], desc: "Add new quality row" },
      { keys: ["Esc"], desc: "Close any open dialog" },
    ],
  },
  {
    title: "Tables & Lists",
    items: [
      { keys: ["↑", "↓"], desc: "Move between rows" },
      { keys: ["Tab"], desc: "Move to next field" },
      { keys: ["Shift", "Tab"], desc: "Move to previous field" },
    ],
  },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "?" && !isTyping && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(true);
      }
    }
    function onOpen() { setOpen(true); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-shortcuts", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-shortcuts", onOpen);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts / कीबोर्ड शॉर्टकट</DialogTitle>
          <DialogDescription>
            Speed up data entry. Press <Kbd>?</Kbd> anytime to see this list.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {g.title}
              </h3>
              <ul className="space-y-2">
                {g.items.map((it, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">{it.desc}</span>
                    <span className="flex gap-1">
                      {it.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md border border-border bg-muted px-1.5 text-[10px] font-semibold text-foreground shadow-sm">
      {children}
    </kbd>
  );
}
