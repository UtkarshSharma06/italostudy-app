import React from 'react';
import { Question } from '@/types/test';
import { createRoot } from 'react-dom/client';
import { MathText } from '@/components/MathText';
// Heavy modules (jspdf, html2canvas, qrcode) are now dynamically imported only when generating PDFs

const COLORS = {
    primary: '#1a1a1a',
    secondary: '#666666',
    accent: '#1e40af',
    border: '#e5e7eb',
    white: '#ffffff',
};

const MARGINS = {
    top: 30,
    bottom: 35, // Increased further for safety
    left: 25,
    right: 25,
};

const COLUMN_GAP = 10;
const WRAP_BUFFER = 5;

/**
 * Helper to convert image URL to Base64 for reliable jsPDF inclusion
 */
const getBase64FromUrl = async (url: string): Promise<string> => {
    if (!url) return "";
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Fetch failed");
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("[PDF] Image Load Fail:", url, e);
        return "";
    }
};

/**
 * Pre-fetches all media URLs in parallel to avoid sequential network overhead
 */
const preFetchAllMedia = async (urls: string[]): Promise<Record<string, string>> => {
    const uniqueUrls = Array.from(new Set(urls.filter(u => u && u.length > 0)));
    console.log(`[PDF] Pre-fetching ${uniqueUrls.length} assets...`);
    const results: Record<string, string> = {};
    
    // Process in batches of 10 to not overwhelm browser
    const CHUNK_SIZE = 10;
    for (let i = 0; i < uniqueUrls.length; i += CHUNK_SIZE) {
        const chunk = uniqueUrls.slice(i, i + CHUNK_SIZE);
        const base64s = await Promise.all(chunk.map(u => getBase64FromUrl(u)));
        chunk.forEach((url, idx) => {
            if (base64s[idx]) results[url] = base64s[idx];
        });
    }
    return results;
};

/**
 * Parallel-renders all content blocks to images to ensure the PDF generation doesn't hang the browser.
 */
const renderBatchToImages = async (
    contentItems: { html: string, id: string }[], 
    widthPx: number,
    onProgress?: (msg: string) => void
): Promise<Record<string, { img: string, ratio: number }>> => {
    if (onProgress) onProgress("Preparing rendering engine...");
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1000px'; 
    container.style.backgroundColor = '#ffffff';
    document.body.appendChild(container);

    const root = createRoot(container);
    
    // Auto-delimit math logic
    const commonSymbols = ['\\rho', '\\nu', '\\alpha', '\\beta', '\\gamma', '\\sigma', '\\Delta', '\\pi', '\\theta', '\\omega', '\\phi', '\\psi', '\\chi', '\\eta', '\\mu', '\\lambda', '\\tau', '\\zeta'];
    
    const processedItems = contentItems.map(item => {
        let content = item.html;
        commonSymbols.forEach(sym => {
            const symRegex = new RegExp(`(?<![\\\\$])(${sym.replace('\\', '\\\\')})(?![\\\\$])`, 'g');
            if (content.includes(sym) && !content.includes('$') && !content.includes('\\(')) {
                content = content.replace(symRegex, `\\($1\\)`);
            }
        });
        if ((content.includes('\\frac') || content.includes('\\sqrt')) && !content.includes('$') && !content.includes('\\[')) {
             if (content.trim().startsWith('\\')) content = `\\[ ${content} \\]`;
        }
        return { ...item, content };
    });

    root.render(
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '60px' } }, 
            // ULTIMATE KaTeX fractional line fix
            React.createElement('style', null, `
                .katex .frac-line, 
                .katex .mrule,
                .katex .overline-line,
                .katex .underline-line,
                .katex .sqrt-line { 
                    border-bottom-width: 2.5px !important;
                    min-height: 2.5px !important;
                    height: 2.5px !important;
                    background-color: #000 !important;
                    display: block !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                }
            `),
            processedItems.map(item => 
                React.createElement('div', { 
                    key: item.id, 
                    id: `block-${item.id}`,
                    style: { 
                        width: `${widthPx}px`, 
                        padding: '15px', 
                        fontSize: '17px', 
                        color: COLORS.primary, 
                        backgroundColor: '#fff', 
                        lineHeight: '1.45',
                        fontFamily: 'helvetica, Arial, sans-serif',
                        webkitFontSmoothing: 'antialiased'
                    }
                }, React.createElement(MathText, { content: item.content, isHtml: true, variant: 'default' }))
            )
        )
    );

    // Wait for all fonts and styles to fully settle
    if (onProgress) onProgress("Waiting for fonts and math...");
    try { await (document as any).fonts.ready; } catch(e) {}
    await new Promise(r => setTimeout(r, 1500)); 

    const results: Record<string, { img: string, ratio: number }> = {};
    const CONCURRENCY = 1; 
    
    for (let i = 0; i < processedItems.length; i += CONCURRENCY) {
        const chunk = processedItems.slice(i, i + CONCURRENCY);
        if (onProgress) onProgress(`Capturing layouts: ${i}/${processedItems.length}`);
        
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 40)));

        await Promise.all(chunk.map(async (item) => {
            try {
                const element = document.getElementById(`block-${item.id}`);
                if (element) {
                    const html2canvas = (await import('html2canvas')).default;
                    const canvas = await html2canvas(element, { 
                        backgroundColor: '#ffffff', 
                        scale: 2, // Balanced "Retina" crispness
                        useCORS: true, 
                        logging: false,
                        allowTaint: true
                    });
                    results[item.id] = {
                        img: canvas.toDataURL('image/jpeg', 0.9), // High-Quality JPEG for small size/high text clarity
                        ratio: canvas.height / canvas.width
                    };
                }
            } catch (e) {
                console.error(`[PDF] Block Fail: ${item.id}`, e);
            }
        }));
    }

    root.unmount();
    document.body.removeChild(container);
    return results;
};

export const generateMockTestPDF = async (
    testName: string,
    questions: Question[],
    brandingLogoUrl: string = '/logo.webp',
    sessionId?: string,
    onProgress?: (msg: string) => void
) => {
    try {
        console.log("[PDF] Initializing Mock Test Generation (OPTIMIZED)...");
        if (onProgress) onProgress("Initializing engine...");
        
        // DYNAMIC IMPORTS: Load heavy libraries only when user clicks download
        const jsPDF = (await import('jspdf')).default;
        const QRCode = (await import('qrcode')).default;

        const HEADER_LOGO = '/italostudy-full.png';
        const WATERMARK_LOGO = '/sidebar-logo.png';
        
        const allMediaUrls = [HEADER_LOGO, WATERMARK_LOGO];
        questions.forEach(q => {
            if (q.media?.type === 'image' && q.media.image?.url) allMediaUrls.push(q.media.image.url);
        });

        if (onProgress) onProgress(`Pre-fetching ${allMediaUrls.length} assets...`);
        const mediaCache = await preFetchAllMedia(allMediaUrls);
        const headerLogoBase64 = mediaCache[HEADER_LOGO];
        const watermarkBase64 = mediaCache[WATERMARK_LOGO];

        // Grouping Questions by Passage for Batch Rendering
        if (onProgress) onProgress("Batching questions into blocks...");
        const MAX_QUESTIONS_PER_BLOCK = 1; // Set to 1 to ensure maximum splitting and prevent footer hits
        const groups: { id: string, passage: string | null, questions: Question[], startIdx: number }[] = [];
        questions.forEach((q, idx) => {
            const lastGroup = groups[groups.length - 1];
            // If it's the same passage AND the group isn't too large yet
            if (lastGroup && 
                lastGroup.passage === q.passage && 
                q.passage !== null && 
                q.passage !== '' && 
                lastGroup.questions.length < MAX_QUESTIONS_PER_BLOCK) {
                lastGroup.questions.push(q);
            } else {
                groups.push({ id: `group-${idx}`, passage: q.passage || null, questions: [q], startIdx: idx + 1 });
            }
        });

        const contentToRender: { html: string, id: string }[] = [];
        groups.forEach((group, groupIdx) => {
            let html = '<div style="display:flex; flex-direction:column; gap:25px;">';
            if (group.passage) {
                const rangeLabel = group.questions.length > 1 
                    ? `${group.startIdx}–${group.startIdx + group.questions.length - 1}.` 
                    : `${group.startIdx}.`;
                
                // Check if this is a continuation of the same passage
                const isContinuation = groupIdx > 0 && groups[groupIdx - 1].passage === group.passage;
                const passageHtml = isContinuation 
                    ? `<div style="font-style:italic; color:#666; font-size:14px;">(Continued from previous page...)</div>`
                    : group.passage;

                html += `<div><div style="font-weight:bold; color:#1a1a1a; margin-bottom:10px;">${rangeLabel} Read the following and answer:</div><div style="padding:10px; border-left:3px solid #eee; background:#fafafa;">${passageHtml}</div></div>`;
            }

            group.questions.forEach((q, subIdx) => {
                const qNum = group.passage ? "" : `${group.startIdx + subIdx}. `;
                html += `<div><div style="font-weight:bold;">${qNum}${q.question_text || ''}</div>`;
                if (q.options) {
                    html += `<div style="margin-top: 10px; margin-left:15px; display:flex; flex-direction:column; gap:6px;">`;
                    q.options.forEach((opt, oIdx) => {
                        html += `<div><strong>${String.fromCharCode(65 + oIdx)})</strong> ${opt}</div>`;
                    });
                    html += `</div>`;
                }
                html += `</div>`;
            });
            html += '</div>';
            contentToRender.push({ html, id: group.id });

            // Tables still separate for layout safety
            group.questions.forEach((q, subIdx) => {
                if (q.media?.type === 'table' && q.media.table) {
                    const tableHtml = `<table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:10px;">
                        <thead><tr style="background:#f8f9fa;">${q.media.table.headers.map(h => `<th style="border:1px solid #ddd; padding:6px; text-align:left;">${h}</th>`).join('')}</tr></thead>
                        <tbody>${q.media.table.rows.map(row => `<tr>${row.map(c => `<td style="border:1px solid #ddd; padding:6px;">${c}</td>`).join('')}</tr>`).join('')}</tbody>
                    </table>`;
                    contentToRender.push({ html: tableHtml, id: `table-${group.startIdx + subIdx - 1}` });
                }
            });
        });

        const canvasWidthPx = 480;
        const renderedImages = await renderBatchToImages(contentToRender, canvasWidthPx, onProgress);

        if (onProgress) onProgress("Assembling PDF document...");
        const doc = new jsPDF({ compress: true }); // Enable native compression
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const colWidth = (pageWidth - MARGINS.left - MARGINS.right - COLUMN_GAP) / 2;
        let currentColumn = 0;
        let currentY = MARGINS.top;

        const getColumnX = () => MARGINS.left + (currentColumn * (colWidth + COLUMN_GAP));
        
        const addHeader = () => {
            try {
                if (headerLogoBase64) doc.addImage(headerLogoBase64, 'PNG', MARGINS.left, 8, 30, 8);
                
                doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(COLORS.secondary);
                
                // Improved Header Layout for Long Titles
                const centerLabel = "OFFICIAL TEST BOOKLET";
                const centerLabelWidth = doc.getTextWidth(centerLabel);
                doc.text(centerLabel, pageWidth / 2, 13, { align: 'center' });
                
                // Test Name with automatic resizing/wrapping
                let testNameFontSize = 8;
                doc.setFontSize(testNameFontSize);
                let formattedTestName = testName.toUpperCase();
                let testNameWidth = doc.getTextWidth(formattedTestName);
                const maxTestNameWidth = pageWidth - MARGINS.right - (pageWidth / 2 + centerLabelWidth / 2 + 5);
                
                if (testNameWidth > maxTestNameWidth) {
                    testNameFontSize = 7;
                    doc.setFontSize(testNameFontSize);
                    testNameWidth = doc.getTextWidth(formattedTestName);
                    
                    if (testNameWidth > maxTestNameWidth) {
                        // If still too long, truncate or split? Let's truncate with ellipsis for safety
                        formattedTestName = doc.splitTextToSize(formattedTestName, maxTestNameWidth)[0];
                        if (formattedTestName.length < testName.length) formattedTestName += "...";
                    }
                }
                
                doc.text(formattedTestName, pageWidth - MARGINS.right, 13, { align: 'right' });
                
                doc.setDrawColor(COLORS.border).setLineWidth(0.1).line(MARGINS.left, 18, pageWidth - MARGINS.right, 18);
                doc.setDrawColor(COLORS.border).setLineWidth(0.2).line(pageWidth / 2, MARGINS.top - 5, pageWidth / 2, pageHeight - MARGINS.bottom + 5);
            } catch(e) {}
        };

        const checkSpace = (needed: number) => {
            if (currentY + needed > pageHeight - MARGINS.bottom) {
                if (currentColumn === 0) {
                    currentColumn = 1;
                    currentY = MARGINS.top;
                } else {
                    doc.addPage();
                    currentColumn = 0;
                    currentY = MARGINS.top;
                    addHeader();
                }
            }
        };

        addHeader();

        for (const group of groups) {
            if (renderedImages[group.id]) {
                const res = renderedImages[group.id];
                let dH = (colWidth - WRAP_BUFFER) * res.ratio;
                
                // Overflow Safety: If a single block is still too tall for the entire page,
                // we must scale it down to fit within the margins.
                const maxAvailableHeight = pageHeight - MARGINS.top - MARGINS.bottom;
                if (dH > maxAvailableHeight) {
                    console.warn(`[PDF] Scaling down extremely tall block ${group.id}`);
                    dH = maxAvailableHeight;
                }

                checkSpace(dH + 5);
                doc.addImage(res.img, 'JPEG', getColumnX(), currentY, colWidth - WRAP_BUFFER, dH);
                currentY += dH + 5;
            }

            // Media & Tables
            group.questions.forEach((q, subIdx) => {
                const qGlobalIdx = group.startIdx + subIdx - 1;
                if (q.media?.type === 'image' && q.media.image?.url) {
                    const mediaBase64 = mediaCache[q.media.image.url];
                    if (mediaBase64) {
                        checkSpace(55);
                        try { doc.addImage(mediaBase64, 'JPEG', getColumnX(), currentY, colWidth - WRAP_BUFFER, 50); } catch(e) {}
                        currentY += 55;
                    }
                }
                if (renderedImages[`table-${qGlobalIdx}`]) {
                    const res = renderedImages[`table-${qGlobalIdx}`];
                    const dH = (colWidth - WRAP_BUFFER) * res.ratio;
                    checkSpace(dH + 5);
                    doc.addImage(res.img, 'JPEG', getColumnX(), currentY, colWidth - WRAP_BUFFER, dH);
                    currentY += dH + 5;
                }
            });

            currentY += 4;
            doc.setDrawColor(COLORS.border).setLineWidth(0.5).line(getColumnX(), currentY, getColumnX() + colWidth - WRAP_BUFFER, currentY);
            currentY += 8;
        }

        // Answer Key
        if (onProgress) onProgress("Adding answer key...");
        doc.addPage(); addHeader(); currentY = MARGINS.top;
        doc.setFont('helvetica', 'bold').setFontSize(14).text("OFFICIAL ANSWER KEY", pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;

        if (sessionId) {
            try {
                const solutionUrl = `https://italostudy.com/solutions/${sessionId}`;
                const qrDataUrl = await QRCode.toDataURL(solutionUrl, { margin: 1, width: 100 });
                const boxX = (pageWidth - 100) / 2;
                doc.setDrawColor(COLORS.primary).setLineWidth(0.3).roundedRect(boxX, currentY, 100, 18, 3, 3, 'S');
                doc.addImage(qrDataUrl, 'PNG', boxX + 2, currentY + 2, 14, 14);
                doc.setFontSize(8).setTextColor(COLORS.primary).text("SCAN FOR STEP-BY-STEP SOLUTIONS", boxX + 20, currentY + 7);
                doc.setFontSize(7).setTextColor(COLORS.secondary).text("Access expert logic walkthroughs instantly", boxX + 20, currentY + 11);
                currentY += 28;
            } catch(e) {}
        }

        const answerCols = 4;
        const answerColWidth = (pageWidth - MARGINS.left - MARGINS.right) / answerCols;
        for (let i = 0; i < questions.length; i++) {
            const rowInCol = Math.floor(i / answerCols);
            const colIdx = i % answerCols;
            const xPos = MARGINS.left + (colIdx * answerColWidth);
            const yPos = currentY + (rowInCol * 7);
            if (yPos > pageHeight - MARGINS.bottom) { doc.addPage(); addHeader(); currentY = MARGINS.top; }
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(COLORS.primary).text(`${i + 1}:`, xPos, yPos);
            doc.setFont('helvetica', 'normal').text(`[ ${String.fromCharCode(65 + questions[i].correct_index)} ]`, xPos + 8, yPos);
        }

        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let j = 1; j <= totalPages; j++) {
            doc.setPage(j);
            try {
                doc.saveGraphicsState();
                (doc as any).setGState(new (doc as any).GState({ opacity: 0.12 }));
                if (watermarkBase64) doc.addImage(watermarkBase64, 'PNG', (pageWidth - 100) / 2, (pageHeight - 100) / 2, 100, 100);
                doc.restoreGraphicsState();
            } catch (e) {}
            doc.setFontSize(7).setTextColor(COLORS.secondary);
            doc.text(`Page ${j} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text("© ItaloStudy. All Rights Reserved.", MARGINS.left, pageHeight - 10);
        }

        if (onProgress) onProgress("Saving document...");
        doc.save(`${testName.replace(/\s+/g, '_')}_Official_Mock.pdf`);
        if (onProgress) onProgress("Download complete!");
    } catch (error) {
        console.error("[PDF] Critical Generation Error:", error);
        if (onProgress) onProgress("Critical Error! Check console.");
    }
};

