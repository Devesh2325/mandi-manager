import { Download, Printer } from "lucide-react";
import { useAppSession } from "@/lib/session-context";
import { buildBrandedPdf, downloadPdf, openPdfPrint, type PdfColumn } from "@/lib/pdf";
import type { RowInput } from "jspdf-autotable";
import { toast } from "sonner";

interface PdfActionsProps {
  title: string;
  filename: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: RowInput[];
  footer?: RowInput;
  orientation?: "p" | "l";
  disabled?: boolean;
}

/**
 * Reusable Print + Download PDF buttons that pull the live company branding
 * (logo, name, address, mobile, GSTIN, APMC) from session and render a
 * uniform, professional report header.
 */
export function PdfActions({ title, filename, subtitle, columns, rows, footer, orientation, disabled }: PdfActionsProps) {
  const { company, year } = useAppSession();

  const build = () => buildBrandedPdf({ company, year, title, subtitle, columns, rows, footer, orientation });

  const onDownload = () => {
    if (disabled || rows.length === 0) {
      toast.warning("Nothing to export — no data on this report yet.");
      return;
    }
    try {
      downloadPdf(build(), filename);
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error("PDF export failed");
      console.error(e);
    }
  };

  const onPrint = () => {
    if (disabled || rows.length === 0) {
      toast.warning("Nothing to print — no data on this report yet.");
      return;
    }
    try {
      openPdfPrint(build());
    } catch (e) {
      toast.error("Print failed");
      console.error(e);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrint}
        className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
        title="Print PDF"
      >
        <Printer className="h-3.5 w-3.5" /> Print
      </button>
      <button
        onClick={onDownload}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        title="Download PDF"
      >
        <Download className="h-3.5 w-3.5" /> PDF
      </button>
    </div>
  );
}
