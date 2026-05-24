import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const generateInvoicePDF = (record) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;

  const teal = [13, 148, 136];
  const tealDark = [8, 80, 65];
  const slate = [71, 85, 105];
  const dark = [15, 23, 42];
  const light = [248, 250, 252];
  const border = [226, 232, 240];
  const white = [255, 255, 255];
  const green = [22, 163, 74];
  const amber = [180, 117, 23];

  const clean = (v) => {
    const str = String(v || 0).replace(/[₹,\s]/g, "");
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.round(num);
  };
  const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const base = clean(record.amount || record.cost);
  const consumerFee = +(base * 0.05).toFixed(2);
  const consumerGst = +(consumerFee * 0.18).toFixed(2);
  const expertFee = +(base * 0.10).toFixed(2);
  const expertGst = +(expertFee * 0.18).toFixed(2);
  const expertReceives = +(base - expertFee - expertGst).toFixed(2);
  const consumerTotal = +(base + consumerFee + consumerGst).toFixed(2);
  const invId = (record.id || "").toString().substring(0, 8).toUpperCase();
  const dateStr = record.date
    ? new Date(record.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const status = (record.status || "PAID").toUpperCase();
  const statusColor = status === "PAID" ? green : status === "PENDING" ? amber : slate;

  doc.setFillColor(...teal);
  doc.rect(0, 0, W, 38, "F");

  doc.setFillColor(...white);
  doc.roundedRect(14, 8, 20, 20, 3, 3, "F");
  doc.setFillColor(...teal);
  doc.setDrawColor(...tealDark);
  doc.setLineWidth(0);
  doc.setFillColor(...tealDark);
  doc.triangle(20, 11, 26, 11, 22, 18, "F");
  doc.triangle(22, 18, 28, 18, 24, 25, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...white);
  doc.text("IndEase", 40, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 230, 225);
  doc.text("Industrial Machine Service Platform", 40, 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...white);
  doc.text("SERVICE INVOICE", W - 14, 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 230, 225);
  doc.text(`#INV-${invId}`, W - 14, 27, { align: "right" });

  doc.setFillColor(...light);
  doc.rect(0, 38, W, 42, "F");
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.line(0, 80, W, 80);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...slate);
  doc.text("BILL TO", 14, 48);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text(record.consumerName || record.consumer || "Fleet Operator", 14, 55);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...slate);
  doc.text(record.consumerEmail || record.email || "customer@indease.com", 14, 61);
  doc.text(record.consumerPhone || record.phone || "", 14, 67);

  doc.setDrawColor(...border);
  doc.line(W / 2, 42, W / 2, 78);

  const metaX = W / 2 + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...slate);
  doc.text("INVOICE DATE", metaX, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  doc.text(dateStr, metaX, 55);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...slate);
  doc.text("STATUS", metaX + 50, 48);
  doc.setFillColor(...statusColor);
  doc.roundedRect(metaX + 48, 50, 28, 8, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...white);
  doc.text(status, metaX + 62, 55, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...slate);
  doc.text("SERVICE EXPERT", metaX, 65);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...dark);
  const expertName = (record.expert || "Assigned Expert").replace(" (You)", "");
  doc.text(expertName, metaX, 72);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...slate);
  doc.text("SERVICE DETAILS", 14, 92);
  doc.setDrawColor(...teal);
  doc.setLineWidth(1);
  doc.line(14, 94, 50, 94);

  autoTable(doc, {
    startY: 98,
    margin: { left: 14, right: 14 },
    head: [["Description", "Details"]],
    body: [
      ["Machine", record.machine || "Industrial Unit"],
      ["Service Type", record.service || record.action || "Machine Repair & Maintenance"],
      ["Service Request ID", `#SR-${(record.serviceRequestId || record.id || "").toString().substring(0, 8).toUpperCase()}`],
      ["Work Performed", record.workDescription || record.notes || "Repair and maintenance as per service request"],
    ],
    theme: "plain",
    headStyles: {
      fillColor: teal,
      textColor: white,
      fontSize: 9,
      fontStyle: "bold",
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: dark,
      cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
    },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: light, cellWidth: 55 },
      1: { cellWidth: "auto" },
    },
    alternateRowStyles: { fillColor: white },
  });

  const tableEnd = doc.lastAutoTable.finalY + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...slate);
  doc.text("PAYMENT BREAKDOWN", 14, tableEnd);
  doc.setDrawColor(...teal);
  doc.setLineWidth(1);
  doc.line(14, tableEnd + 2, 62, tableEnd + 2);

  autoTable(doc, {
    startY: tableEnd + 6,
    margin: { left: 14, right: 14 },
    body: [
      ['Base Service Cost', fmt(base)],
      ['Booking Fee (5%) — platform charge', fmt(consumerFee)],
      ['GST on booking fee (18%)', fmt(consumerGst)],
      ['Total Charged to Consumer', fmt(consumerTotal)],
      ['', ''],
      ['Expert quoted amount', fmt(base)],
      ['Service Fee (10%) — platform deduction', `− ${fmt(expertFee)}`],
      ['GST on service fee (18%)', `− ${fmt(expertGst)}`],
      ['Expert receives', fmt(expertReceives)],
    ],
    theme: "plain",
    bodyStyles: {
      fontSize: 9,
      textColor: slate,
      cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
    },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { halign: "right", cellWidth: 52 },
    },
  });

  const totalY = doc.lastAutoTable.finalY + 2;
  doc.setFillColor(...teal);
  doc.roundedRect(14, totalY, 182, 16, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...white);
  doc.text("TOTAL PAYABLE", 22, totalY + 10);
  doc.setFontSize(13);
  doc.text(fmt(consumerTotal), W - 14, totalY + 10, { align: "right" });

  const noteY = totalY + 24;
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(...teal);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, noteY, 182, 14, 3, 3, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...tealDark);
  doc.text(
    `Expert receives ${fmt(expertReceives)} after platform deduction. Platform earns ${fmt(+(consumerFee + expertFee).toFixed(2))}. Payment secured via Razorpay.`,
    105, noteY + 8, { align: "center" }
  );

  doc.setFillColor(...dark);
  doc.rect(0, 272, W, 25, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...white);
  doc.text("IndEase", 14, 281);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Industrial Machine Service Platform", 14, 286);
  doc.text("support: support@indease.com", 14, 291);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("This is a digitally generated invoice from IndEase.", W - 14, 281, { align: "right" });
  doc.text("All transactions are secured via Razorpay payment gateway.", W - 14, 286, { align: "right" });
  doc.text(`© ${new Date().getFullYear()} IndEase. All rights reserved.`, W - 14, 291, { align: "right" });

  const fileName = `IndEase_Invoice_${invId}_${(record.machine || "Service").replace(/\s+/g, "_")}.pdf`;
  doc.save(fileName);
};
