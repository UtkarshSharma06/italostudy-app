import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const generateInvoice = (transaction: any, profile: any) => {
    const doc: any = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- COLORS ---
    const colors = {
        background: '#1a1a1a', // Dark Charcoal
        card: '#ffffff',       // White
        textLight: '#ffffff',
        textDark: '#1a1a1a',
        accent: '#333333',     // Darker Accent
        greyBox: '#e0e0e0',    // Light Grey for Totals Box
        muted: '#888888',      // Grey text
        brand: '#ffffff'
    };

    // --- 1. BACKGROUND ---
    doc.setFillColor(colors.background);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // --- 2. HEADER SECTION ---
    const margins = { left: 20, right: 20, top: 20 };

    // Left: "INVOICE"
    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.text('INVOICE', margins.left, 30);

    // Invoice ID below
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(colors.muted); // slightly muted
    doc.text(`Invoice ID: ${transaction.id.substring(0, 8).toUpperCase()}`, margins.left, 38);

    // Horizontal Line separator (small)
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(margins.left, 45, margins.left + 15, 45);


    // Right: Brand Logo
    // Using logo-dark-full.webp for white logo on dark background
    try {
        doc.addImage('/logo-dark-full.webp', 'WEBP', pageWidth - margins.right - 40, 15, 40, 15);
    } catch (e) {
        doc.setTextColor(colors.textLight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('ItaloStudy', pageWidth - margins.right, 30, { align: 'right' });
    }


    // --- 3. BILLING INFO (Row below header) ---
    const infoY = 65;

    // LEFT: Invoice To
    doc.setFontSize(9);
    doc.setTextColor(colors.muted);
    doc.setFont('helvetica', 'normal');
    doc.text('Invoice To:', margins.left, infoY);

    // Name
    doc.setFontSize(11);
    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.text(profile?.full_name || profile?.display_name || 'Valued Student', margins.left, infoY + 7);

    // Email Only
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(profile?.email || '', margins.left, infoY + 12);


    // RIGHT: Payment Info & BIG TOTAL
    doc.setFontSize(9);
    doc.setTextColor(colors.muted);
    doc.text('Payment Method:', pageWidth - margins.right, infoY, { align: 'right' });

    // Bank Code / Method Name
    doc.setFontSize(10);
    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.text(transaction.payment_method?.toUpperCase() || 'ONLINE-PAY', pageWidth - margins.right, infoY + 6, { align: 'right' });

    // BIG TOTAL AMOUNT
    doc.setFontSize(24);
    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.text(`${transaction.currency} ${Number(transaction.amount).toFixed(2)}`, pageWidth - margins.right, infoY + 18, { align: 'right' });


    // --- 4. DATA TABLE (White Card) ---
    const cardStartY = 100;

    // Resolve Plan Name
    const planName = getPlanName(transaction.plan_id || transaction.tier || 'explorer');

    const tableData = [
        [
            '1',
            planName,
            '1',
            `${transaction.currency} ${Number(transaction.amount).toFixed(2)}`,
            `${transaction.currency} ${Number(transaction.amount).toFixed(2)}`
        ]
    ];

    const rowHeight = 15;
    const headerHeight = 15;
    const padding = 20;
    const calculatedHeight = headerHeight + (tableData.length * rowHeight) + padding;

    // Tight fit: Min height 45 (header + 1 row)
    const cardHeight = Math.max(calculatedHeight, 45);

    // Draw White Card
    doc.setFillColor(colors.card);
    doc.roundedRect(margins.left, cardStartY, pageWidth - (margins.left * 2), cardHeight, 3, 3, 'F');

    autoTable(doc, {
        startY: cardStartY + 10,
        head: [['No', 'Item Name', 'Qty', 'Unit Price', 'Total']],
        body: tableData,
        theme: 'plain',
        headStyles: {
            textColor: [0, 0, 0], // Black text
            fontStyle: 'bold',
            fontSize: 9,
            fillColor: [255, 255, 255],
            cellPadding: 2,
            valign: 'middle'
        },
        bodyStyles: {
            textColor: [0, 0, 0],
            fontSize: 9,
            fillColor: [255, 255, 255],
            cellPadding: 4,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'left' },
            1: { cellWidth: 'auto', halign: 'left' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
        },
        didDrawPage: (data) => {
            // Header underline
            const startX = margins.left + 5;
            const endX = pageWidth - margins.right - 5;
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.1);
            doc.line(startX, cardStartY + 18, endX, cardStartY + 18);
        },
        margin: { left: margins.left + 5, right: margins.right + 5 }
    });


    // --- 5. TOTALS BOX (GREY) ---
    const greyBoxWidth = 80;
    const greyBoxHeight = 45;
    const greyBoxX = pageWidth - margins.right - greyBoxWidth;

    // ATTACHED to the bottom of the white card
    const greyBoxY = cardStartY + cardHeight;

    doc.setFillColor(colors.greyBox);
    doc.roundedRect(greyBoxX, greyBoxY, greyBoxWidth, greyBoxHeight, 2, 2, 'F');

    const totalsTextX = pageWidth - margins.right - 10;
    const totalsLabelX = greyBoxX + 10;

    doc.setFontSize(9);
    doc.setTextColor(colors.textDark);

    // Sub Total
    doc.setFont('helvetica', 'normal');
    const line1Y = greyBoxY + 12;
    doc.text('Sub Total', totalsLabelX, line1Y);
    doc.text(`${transaction.currency} ${Number(transaction.amount).toFixed(2)}`, totalsTextX, line1Y, { align: 'right' });

    // Tax
    const line2Y = greyBoxY + 22;
    doc.text('Tax (0%)', totalsLabelX, line2Y);
    doc.text(`${transaction.currency} 0.00`, totalsTextX, line2Y, { align: 'right' });

    // Total
    const line3Y = greyBoxY + 34;
    doc.setFont('helvetica', 'bold');
    doc.text('Total', totalsLabelX, line3Y);
    doc.text(`${transaction.currency} ${Number(transaction.amount).toFixed(2)}`, totalsTextX, line3Y, { align: 'right' });


    // --- 6. FOOTER (Dark Background) ---
    const footerY = greyBoxY + greyBoxHeight + 10;

    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Terms and Condition', margins.left, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180); // Muted
    const termsFn = [
        "All payments are final and processed securely.",
        "Check our website for full refund policy."
    ];
    doc.text(termsFn, margins.left, footerY + 6);

    // Contact Us
    const contactY = footerY + 30;

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(margins.left, contactY - 8, margins.left + 15, contactY - 8);

    doc.setTextColor(colors.textLight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Contact Us:', margins.left, contactY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text('mail:- contact@italostudy.com', margins.left, contactY + 6);

    // Brand Name Bottom Right
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.textLight);
    doc.text('ItaloStudy Team', pageWidth - margins.right, contactY + 6, { align: 'right' });

    // Save
    doc.save(`ItaloStudy_Invoice_${transaction.id.substring(0, 8)}.pdf`);
};

// Helper for plan names
const getPlanName = (tier: string) => {
    const key = (tier || '').toLowerCase();
    const tiers: Record<string, string> = {
        'explorer': 'Explorer Plan',
        'pro': 'Exam Prep Plan',
        'elite': 'Global Admission Plan',
        'initiate': 'Explorer Plan',
        'global': 'Global Admission Plan'
    };
    if (key === 'education plan') return 'Education Plan';
    return tiers[key] || 'Education Plan';
};

const config = { mode: 'beta' }; 
