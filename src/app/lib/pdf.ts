import jsPDF from "jspdf";

const BLACK: [number, number, number] = [10, 10, 10];
const GOLD: [number, number, number] = [212, 175, 55];
const GREEN: [number, number, number] = [50, 128, 34];
const INK: [number, number, number] = [19, 18, 15];
const MUTED: [number, number, number] = [120, 116, 105];
const BORDER: [number, number, number] = [225, 219, 200];

const MARGIN = 16;

function todayLabel(): string {
    return new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

function drawHeader(doc: jsPDF, title: string, subtitle: string): number {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(...BLACK);
    doc.rect(0, 0, pageWidth, 26, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...GREEN);
    doc.text("mondo", MARGIN, 16.5);
    const mondoWidth = doc.getTextWidth("mondo");
    doc.setTextColor(...GOLD);
    doc.text("ticket", MARGIN + mondoWidth, 16.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(230, 230, 230);
    doc.text(todayLabel(), pageWidth - MARGIN, 16.5, { align: "right" });

    let y = 40;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.setTextColor(...INK);
    doc.text(title, MARGIN, y);

    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text(subtitle, MARGIN, y);

    y += 6;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);

    return y + 10;
}

function drawFooter(doc: jsPDF) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, pageHeight - 16, pageWidth - MARGIN, pageHeight - 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Generado por MondoTicket · Documento informativo, no válido como comprobante fiscal.", MARGIN, pageHeight - 10);
}

function sectionLabel(doc: jsPDF, y: number, label: string): number {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(166, 130, 31);
    doc.text(label.toUpperCase(), MARGIN, y);
    return y + 6;
}

type Row = { label: string; value: string; hint?: string };

function drawFieldGrid(doc: jsPDF, y: number, rows: Row[], columns = 2): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - MARGIN * 2;
    const colWidth = contentWidth / columns;

    rows.forEach((row, i) => {
        const col = i % columns;
        const rowIndex = Math.floor(i / columns);
        const x = MARGIN + col * colWidth;
        const rowY = y + rowIndex * 24;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        doc.text(row.label.toUpperCase(), x, rowY);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(...INK);
        doc.text(row.value, x, rowY + 7);

        if (row.hint) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(...MUTED);
            const hintLines = doc.splitTextToSize(row.hint, colWidth - 6);
            doc.text(hintLines, x, rowY + 12);
        }
    });

    const rowsUsed = Math.ceil(rows.length / columns);
    return y + rowsUsed * 24 + 4;
}

function drawKeyValueList(doc: jsPDF, y: number, rows: { label: string; value: string }[]): number {
    let cursorY = y;
    rows.forEach((row) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        doc.text(row.label.toUpperCase(), MARGIN, cursorY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11.5);
        doc.setTextColor(...INK);
        doc.text(row.value, MARGIN, cursorY + 6);
        cursorY += 14;
    });
    return cursorY;
}

export interface ContractPdfData {
    orgName: string;
    legalName: string;
    rfc: string;
    address: string;
    contactName: string;
    createdAtLabel: string;
    feePercentage: string;
    paymentTerms: string;
    taquillaFeeLabel: string;
    taquillaFeeHint: string;
    maxEventsPerMonthLabel: string;
    courtesyTicketsLabel: string;
    holdDurationLabel: string;
}

export function generateContractPdf(data: ContractPdfData) {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    let y = drawHeader(doc, "Contrato y Convenio", data.orgName);

    y = sectionLabel(doc, y, "Estado del contrato");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...GREEN);
    doc.text("Vigente", MARGIN, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Alta: ${data.createdAtLabel}`, MARGIN, y + 12);
    y += 22;

    y = sectionLabel(doc, y, "Términos comerciales");
    y = drawFieldGrid(doc, y, [
        { label: "Comisión (fee)", value: `${data.feePercentage}%`, hint: "Sobre el valor bruto de cada ticket emitido" },
        { label: "Plazo de pago", value: `${data.paymentTerms} días`, hint: "Días naturales posteriores al evento" },
        { label: "Fee en taquilla", value: data.taquillaFeeLabel, hint: data.taquillaFeeHint },
        { label: "Eventos por mes", value: data.maxEventsPerMonthLabel, hint: "Máximo de eventos nuevos por mes calendario" },
        { label: "Cortesías por evento", value: data.courtesyTicketsLabel, hint: "Boletos gratuitos permitidos por evento" },
        { label: "Tiempo de reserva", value: data.holdDurationLabel, hint: "Antes de liberar boletos no pagados. No aplica a cortesías ni taquilla" },
    ]);

    y += 6;
    y = sectionLabel(doc, y, "Detalles del partner");
    y = drawKeyValueList(doc, y, [
        { label: "Nombre comercial", value: data.orgName },
        { label: "Razón social", value: data.legalName },
        { label: "RFC", value: data.rfc },
        { label: "Representante legal", value: data.contactName },
        { label: "Dirección fiscal", value: data.address },
    ]);

    drawFooter(doc);
    doc.save(`Contrato-${data.orgName.replace(/\s+/g, "-")}.pdf`);
}

export interface LiquidationPdfData {
    orgName: string;
    periodLabel: string;
    activeEvents: number;
    totalSold: number;
    totalRevenue: number;
    feePercentage: number;
    totalProfit: number;
}

export function generateLiquidationSummaryPdf(data: LiquidationPdfData) {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    let y = drawHeader(doc, "Resumen de Liquidación", `${data.orgName} · ${data.periodLabel}`);

    y = sectionLabel(doc, y, "Resultados generales");
    y = drawFieldGrid(doc, y, [
        { label: "Eventos activos", value: String(data.activeEvents) },
        { label: "Boletos vendidos", value: data.totalSold.toLocaleString("es-MX") },
        { label: "Revenue total generado", value: `$${data.totalRevenue.toLocaleString("es-MX")}` },
        {
            label: `Fee de plataforma (${data.feePercentage}%)`,
            value: `$${data.totalProfit.toLocaleString("es-MX")}`,
            hint: "Suma de fee digital y de taquilla, según tu convenio",
        },
    ]);

    y += 8;
    doc.setFillColor(250, 249, 246);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(MARGIN, y, doc.internal.pageSize.getWidth() - MARGIN * 2, 18, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    const note = "La plataforma cobra por cada boleto emitido, sin importar si el cliente pagó con transferencia o efectivo.";
    const noteLines = doc.splitTextToSize(note, doc.internal.pageSize.getWidth() - MARGIN * 2 - 8);
    doc.text(noteLines, MARGIN + 4, y + 7);

    drawFooter(doc);
    doc.save(`Liquidacion-${data.orgName.replace(/\s+/g, "-")}.pdf`);
}
