// Dynamic PDF report engine for Mandi ERP.
// Renders a branded company header (logo + name + address + contact + GSTIN/APMC)
// followed by a report title, optional sub-title, and a tabular body.

import jsPDF from "jspdf";
import autoTable, { type RowInput, type UserOptions } from "jspdf-autotable";
import type { Company, FinancialYear } from "./db";

export interface PdfColumn {
  header: string;
  /** Right-align (numbers/currency). */
  num?: boolean;
  /** Optional explicit width hint (in mm). */
  width?: number;
}

export interface BuildPdfOpts {
  company: Company | null;
  year?: FinancialYear | null;
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: RowInput[];
  /** Optional final summary row (rendered as table foot, bold). */
  footer?: RowInput;
  /** Orientation, default portrait. Use "l" for landscape on wide reports. */
  orientation?: "p" | "l";
  /** Optional bill footer note to print at the very bottom. */
  bottomNote?: string;
}

/**
 * Build a branded PDF and return the jsPDF instance — caller decides
 * whether to .save() (download) or .output('bloburl') (preview).
 */
export function buildBrandedPdf(opts: BuildPdfOpts): jsPDF {
  const { company, year, title, subtitle, columns, rows, footer, orientation = "p", bottomNote } = opts;
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = margin;

  // ---- Logo ----
  const hasLogo = !!company?.logoDataUrl;
  const logoSize = 22;
  if (hasLogo && company?.logoDataUrl) {
    try {
      // Detect format from data URL
      const fmt = company.logoDataUrl.startsWith("data:image/png") ? "PNG"
        : company.logoDataUrl.startsWith("data:image/jpeg") || company.logoDataUrl.startsWith("data:image/jpg") ? "JPEG"
        : "PNG";
      doc.addImage(company.logoDataUrl, fmt, margin, y, logoSize, logoSize, undefined, "FAST");
    } catch {
      // ignore broken logos
    }
  }

  // ---- Company block (right of logo) ----
  const textX = hasLogo ? margin + logoSize + 5 : margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(company?.name ?? "Company Name", textX, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  let cy = y + 11;
  if (company?.address) {
    doc.text(company.address, textX, cy, { maxWidth: pageW - textX - margin });
    cy += 4;
  }

  // Contact line
  const contact: string[] = [];
  if (company?.mobile) contact.push(`Mobile: ${company.mobile}`);
  if (company?.altMobile) contact.push(company.altMobile);
  if (company?.email) contact.push(company.email);
  if (company?.website) contact.push(company.website);
  if (contact.length) {
    doc.text(contact.join("  •  "), textX, cy);
    cy += 4;
  }

  // Statutory IDs
  const ids: string[] = [];
  if (company?.gstin) ids.push(`GSTIN: ${company.gstin}`);
  if (company?.apmcLicense) ids.push(`APMC Lic: ${company.apmcLicense}`);
  if (ids.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text(ids.join("    "), textX, cy);
    cy += 4;
  }

  y = Math.max(cy, y + logoSize) + 2;

  // ---- Divider ----
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ---- Report title ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(title, pageW / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  const meta: string[] = [];
  if (year?.label) meta.push(`FY ${year.label}`);
  meta.push(`Generated: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`);
  doc.text(meta.join("   |   "), pageW / 2, y, { align: "center" });
  y += 2;

  if (subtitle) {
    y += 3;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(subtitle, pageW / 2, y, { align: "center" });
  }
  y += 4;

  // ---- Table ----
  const head = [columns.map((c) => c.header)];
  const columnStyles: UserOptions["columnStyles"] = {};
  columns.forEach((c, i) => {
    columnStyles[i] = {
      halign: c.num ? "right" : "left",
      ...(c.width ? { cellWidth: c.width } : {}),
    };
  });

  autoTable(doc, {
    head,
    body: rows,
    foot: footer ? [footer] : undefined,
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: [220, 220, 220], lineWidth: 0.1 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles,
    didDrawPage: (data) => {
      // Page number footer
      const pageCount = doc.getNumberOfPages();
      const current = data.pageNumber;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Page ${current} of ${pageCount}`,
        pageW - margin,
        doc.internal.pageSize.getHeight() - 6,
        { align: "right" },
      );
      if (bottomNote) {
        doc.text(bottomNote, margin, doc.internal.pageSize.getHeight() - 6);
      } else if (company?.billFooter) {
        doc.text(company.billFooter, margin, doc.internal.pageSize.getHeight() - 6);
      }
    },
  });

  return doc;
}

/** Download convenience. */
export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/** Open PDF in a new browser tab for print preview. */
export function openPdfPrint(doc: jsPDF) {
  const url = doc.output("bloburl");
  const w = window.open(url.toString(), "_blank");
  if (w) {
    // Trigger print dialog after load
    w.addEventListener?.("load", () => {
      try { w.print(); } catch { /* user can press Ctrl+P */ }
    });
  }
}
