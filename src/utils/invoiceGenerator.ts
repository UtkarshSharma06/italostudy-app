import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────
export type InvoiceType = 'subscription' | 'course' | 'bundle';

// ── Entry point ───────────────────────────────────────────────────────────────
/**
 * Generates a professional PDF invoice.
 * - type='subscription'  → uses `transaction`  (from transactions table)
 * - type='course'        → uses `courseTxn`     (from course_transactions table)
 * - type='bundle'        → uses both            (two line items, combined total)
 */
export const generateInvoice = (
    transaction: any,
    profile: any,
    type: InvoiceType = 'subscription',
    courseTxn?: any,
) => {
    const doc: any = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const colors = {
        background: '#1a1a1a',
        card: '#ffffff',
        textLight: '#ffffff',
        textDark: '#1a1a1a',
        greyBox: '#e0e0e0',
        muted: '#888888',
    };

    // ── 1. BACKGROUND ─────────────────────────────────────────────────────────
    doc.setFillColor(colors.background);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    const margins = { left: 20, right: 20, top: 20 };

    // ── 2. HEADER ─────────────────────────────────────────────────────────────
    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.text('INVOICE', margins.left, 30);

    // Invoice type badge
    const typeLabel = type === 'bundle' ? 'BUNDLE' : type === 'course' ? 'COURSE' : 'SUBSCRIPTION';
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 180, 180);
    doc.text(typeLabel, margins.left, 36);

    // Invoice ID
    const invoiceId = (type === 'course' || type === 'bundle')
        ? (courseTxn?.id || transaction?.id || 'N/A')
        : (transaction?.id || 'N/A');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(colors.muted);
    doc.text(`Invoice ID: ${String(invoiceId).substring(0, 8).toUpperCase()}`, margins.left, 42);
    doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, margins.left, 48);

    // Divider
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(margins.left, 54, margins.left + 15, 54);

    // Brand logo
    try {
        doc.addImage('/logo-dark-full.webp', 'WEBP', pageWidth - margins.right - 40, 15, 40, 15);
    } catch (e) {
        doc.setTextColor(colors.textLight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('ItaloStudy', pageWidth - margins.right, 30, { align: 'right' });
    }

    // ── 3. BILLING INFO ───────────────────────────────────────────────────────
    const infoY = 70;

    doc.setFontSize(9);
    doc.setTextColor(colors.muted);
    doc.setFont('helvetica', 'normal');
    doc.text('Invoice To:', margins.left, infoY);

    doc.setFontSize(11);
    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.full_name || profile?.display_name || 'Valued Student', margins.left, infoY + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(profile?.email || '', margins.left, infoY + 13);

    // Payment method (right side)
    const payMethod = transaction?.payment_method || courseTxn?.payment_method || 'ONLINE-PAY';
    doc.setFontSize(9);
    doc.setTextColor(colors.muted);
    doc.text('Payment Method:', pageWidth - margins.right, infoY, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.text(payMethod.toUpperCase(), pageWidth - margins.right, infoY + 6, { align: 'right' });

    // ── Compute line items ────────────────────────────────────────────────────
    const items: Array<[string, string, string, string, string]> = [];

    if (type === 'subscription' && transaction) {
        const planName = getPlanName(transaction.plan_id || transaction.tier || 'explorer');
        const amt = `${transaction.currency} ${Number(transaction.amount).toFixed(2)}`;
        items.push(['1', planName, '1', amt, amt]);
    } else if (type === 'course' && courseTxn) {
        const title = courseTxn.metadata?.course_title || courseTxn.course_title || 'Course Access';
        const expiryLabel = courseTxn.metadata?.expiry_days
            ? formatExpiry(courseTxn.metadata.expiry_days)
            : '';
        const itemName = expiryLabel ? `${title}\n(${expiryLabel} access · One-time)` : title;
        const amt = `EUR ${Number(courseTxn.amount_eur).toFixed(2)}`;
        items.push(['1', itemName, '1', amt, amt]);
    } else if (type === 'bundle') {
        // Course line
        if (courseTxn) {
            const title = courseTxn.metadata?.course_title || courseTxn.course_title || 'Course Access';
            const amt = `EUR ${Number(courseTxn.amount_eur).toFixed(2)}`;
            items.push(['1', `${title}\n(Course · One-time)`, '1', amt, amt]);
        }
        // Subscription line
        if (transaction) {
            const planName = getPlanName(transaction.plan_id || 'pro');
            const amt = `${transaction.currency} ${Number(transaction.amount).toFixed(2)}`;
            items.push([String(items.length + 1), `${planName}\n(Subscription · Monthly)`, '1', amt, amt]);
        }
    }

    // Compute total in display currency
    let totalDisplay = '';
    if (type === 'bundle' && courseTxn && transaction) {
        const courseAmt = Number(courseTxn.amount_eur);
        const subAmt = Number(transaction.amount);
        // Both in EUR for bundles
        totalDisplay = `EUR ${(courseAmt + subAmt).toFixed(2)}`;
    } else if (type === 'course' && courseTxn) {
        totalDisplay = `EUR ${Number(courseTxn.amount_eur).toFixed(2)}`;
    } else if (transaction) {
        totalDisplay = `${transaction.currency} ${Number(transaction.amount).toFixed(2)}`;
    }

    // Big total (top right)
    doc.setFontSize(22);
    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.text(totalDisplay, pageWidth - margins.right, infoY + 18, { align: 'right' });
    doc.setFontSize(8);
    doc.setTextColor(colors.muted);
    doc.text('Total Charged', pageWidth - margins.right, infoY + 24, { align: 'right' });

    // ── 4. DATA TABLE ─────────────────────────────────────────────────────────
    const cardStartY = 105;
    const rowHeight = 18;
    const headerHeight = 15;
    const padding = 20;
    const calculatedHeight = headerHeight + (items.length * rowHeight) + padding;
    const cardHeight = Math.max(calculatedHeight, 55);

    doc.setFillColor(colors.card);
    doc.roundedRect(margins.left, cardStartY, pageWidth - (margins.left * 2), cardHeight, 3, 3, 'F');

    autoTable(doc, {
        startY: cardStartY + 8,
        head: [['No', 'Item Name', 'Qty', 'Unit Price', 'Total']],
        body: items,
        theme: 'plain',
        headStyles: {
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 9,
            fillColor: [255, 255, 255],
            cellPadding: 2,
            valign: 'middle',
        },
        bodyStyles: {
            textColor: [0, 0, 0],
            fontSize: 9,
            fillColor: [255, 255, 255],
            cellPadding: 4,
            valign: 'middle',
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'left' },
            1: { cellWidth: 'auto', halign: 'left' },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        },
        didDrawPage: () => {
            const startX = margins.left + 5;
            const endX = pageWidth - margins.right - 5;
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.1);
            doc.line(startX, cardStartY + 16, endX, cardStartY + 16);
        },
        margin: { left: margins.left + 5, right: margins.right + 5 },
    });

    // ── 5. TOTALS BOX ─────────────────────────────────────────────────────────
    const greyBoxWidth = 90;
    const greyBoxHeight = type === 'bundle' ? 55 : 45;
    const greyBoxX = pageWidth - margins.right - greyBoxWidth;
    const greyBoxY = cardStartY + cardHeight;

    doc.setFillColor(colors.greyBox);
    doc.roundedRect(greyBoxX, greyBoxY, greyBoxWidth, greyBoxHeight, 2, 2, 'F');

    const totalsTextX = pageWidth - margins.right - 8;
    const totalsLabelX = greyBoxX + 8;
    doc.setFontSize(9);
    doc.setTextColor(colors.textDark);

    if (type === 'bundle' && courseTxn && transaction) {
        // Course subtotal
        doc.setFont('helvetica', 'normal');
        const line0Y = greyBoxY + 11;
        doc.text('Course (one-time)', totalsLabelX, line0Y);
        doc.text(`EUR ${Number(courseTxn.amount_eur).toFixed(2)}`, totalsTextX, line0Y, { align: 'right' });

        // Subscription subtotal
        const line1Y = greyBoxY + 21;
        doc.text('Subscription (monthly)', totalsLabelX, line1Y);
        doc.text(`${transaction.currency} ${Number(transaction.amount).toFixed(2)}`, totalsTextX, line1Y, { align: 'right' });

        // Tax
        const line2Y = greyBoxY + 31;
        doc.text('Tax (0%)', totalsLabelX, line2Y);
        doc.text('EUR 0.00', totalsTextX, line2Y, { align: 'right' });

        // Total
        const line3Y = greyBoxY + 45;
        doc.setFont('helvetica', 'bold');
        doc.text('Total Today', totalsLabelX, line3Y);
        doc.text(totalDisplay, totalsTextX, line3Y, { align: 'right' });
    } else {
        const subAmt = type === 'course' ? `EUR ${Number(courseTxn?.amount_eur).toFixed(2)}` : `${transaction?.currency} ${Number(transaction?.amount).toFixed(2)}`;
        doc.setFont('helvetica', 'normal');
        const line1Y = greyBoxY + 12;
        doc.text('Sub Total', totalsLabelX, line1Y);
        doc.text(subAmt, totalsTextX, line1Y, { align: 'right' });

        const line2Y = greyBoxY + 22;
        doc.text('Tax (0%)', totalsLabelX, line2Y);
        doc.text(type === 'course' ? 'EUR 0.00' : `${transaction?.currency} 0.00`, totalsTextX, line2Y, { align: 'right' });

        const line3Y = greyBoxY + 34;
        doc.setFont('helvetica', 'bold');
        doc.text('Total', totalsLabelX, line3Y);
        doc.text(subAmt, totalsTextX, line3Y, { align: 'right' });
    }

    // ── 6. FOOTER ─────────────────────────────────────────────────────────────
    const footerY = greyBoxY + greyBoxHeight + 12;

    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Terms and Conditions', margins.left, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    const terms = [
        'All payments are final and processed securely.',
        'Check our website for full refund policy.',
    ];
    if (type === 'bundle') {
        terms.push('Bundle: Course charged once. Subscription renews monthly until cancelled.');
    }
    doc.text(terms, margins.left, footerY + 6);

    const contactY = footerY + (type === 'bundle' ? 28 : 24);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(margins.left, contactY - 6, margins.left + 15, contactY - 6);

    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Contact Us:', margins.left, contactY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text('mail:- contact@italostudy.com', margins.left, contactY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.textLight);
    doc.text('ItaloStudy Team', pageWidth - margins.right, contactY + 6, { align: 'right' });

    // ── Save ──────────────────────────────────────────────────────────────────
    const prefix = type === 'bundle' ? 'Bundle' : type === 'course' ? 'Course' : 'Subscription';
    const refId = String(invoiceId).substring(0, 8);
    doc.save(`ItaloStudy_${prefix}_Invoice_${refId}.pdf`);
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const getPlanName = (tier: string) => {
    const key = (tier || '').toLowerCase();
    const tiers: Record<string, string> = {
        'explorer': 'Explorer Plan',
        'pro': 'Exam Prep Plan',
        'elite': 'Global Admission Plan',
        'initiate': 'Explorer Plan',
        'global': 'Global Admission Plan',
    };
    if (key === 'education plan') return 'Education Plan';
    return tiers[key] || 'Education Plan';
};

const formatExpiry = (days: number) => {
    if (days >= 365) return `${Math.floor(days / 365)} year access`;
    if (days >= 30) return `${Math.floor(days / 30)} months access`;
    return `${days} days access`;
};

const config = { mode: 'beta' };
