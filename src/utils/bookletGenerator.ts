import jsPDF from 'jspdf';
import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { Question } from '@/types/test';
import { MathText } from '@/components/MathText';

const COLORS = {
    primary: '#0f172a', // Deep Indigo (Indigo-950)
    secondary: '#475569', // Slate
    accent: '#4f46e5', // Indigo 600
    subjectBg: '#064e3b', // Dark Green (Emerald-900)
    topicBg: '#f0f9ff', // Sky-50
    topicBorder: '#0369a1', // Sky-700
    line: '#1a1a1a', // Sharp Black for Headers
};

const MARGINS = {
    top: 25,
    bottom: 22,
    left: 15,
    right: 15,
    gutter: 10,
};

const BATCH_SIZE = 8; // Small batches for extreme stability

const getBase64FromUrl = async (url: string): Promise<string> => {
    if (!url) return "";
    try {
        const response = await fetch(url, { mode: 'cors' });
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        return "";
    }
};

const renderBatchToImages = async (
    contentItems: { html: string, id: string, type: string, moduleNum?: string, stats?: string }[], 
    widthPx: number
): Promise<Record<string, { img: string, ratio: number }>> => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = `${widthPx}px`; 
    container.style.backgroundColor = '#ffffff';
    container.style.overflow = 'visible';
    document.body.appendChild(container);

    const root = createRoot(container);
    
    const styles = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; color: #000000; -webkit-font-smoothing: antialiased; overflow: visible; }
        
        .true-elite-math { 
            padding: 15px 0 25px 0 !important; 
            overflow: visible !important; 
            line-height: 2.2 !important;
            color: #000 !important;
        }
        .true-elite-math .katex { font-size: 1.15em !important; }

        .true-subject-card { 
            background: ${COLORS.subjectBg}; 
            padding: 35px 40px; 
            border-radius: 8px; 
            color: #ffffff; 
            margin: 20px 0;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .true-subject-card h1 { font-size: 40px; font-weight: 900; margin: 0; position: relative; z-index: 2; line-height: 1.1; }
        .true-subject-card .stats { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.85; margin-top: 10px; z-index: 2; }
        .true-subject-card .module-id { 
            position: absolute; right: 20px; top: 15px; font-size: 110px; font-weight: 950; 
            color: #ffffff; opacity: 0.12; line-height: 1; pointer-events: none;
        }

        .true-topic-pill { 
            background: ${COLORS.topicBg}; 
            color: #0369a1; 
            padding: 12px 22px; 
            border-radius: 6px; 
            font-size: 16px; 
            font-weight: 800; 
            margin: 18px 0;
            border-left: 6px solid #0369a1;
            display: inline-block;
            width: fit-content;
        }

        .true-q-block { padding: 15px 0; width: 100%; border-bottom: 0.5px solid #f1f5f9; page-break-inside: avoid; overflow: visible; }
        .true-q-num { font-weight: 950; font-size: 17px; color: #000000; margin-bottom: 8px; font-family: 'Inter', sans-serif; }
        .true-q-text { font-size: 15px; color: #000000; line-height: 1.7; font-weight: 500; }
        
        .true-opt-list { margin-top: 14px; display: grid; gap: 8px; padding-left: 5px; }
        .true-opt-tag { font-weight: 800; color: #000; display: inline-block; width: 28px; font-size: 14px; }
        .true-opt-label { color: #000; font-size: 14px; font-weight: 500; display: inline-block; width: calc(100% - 35px); vertical-align: top; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    container.appendChild(styleSheet);

    root.render(
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', padding: '20px' } }, 
            contentItems.map(item => 
                React.createElement('div', { 
                    key: item.id, 
                    id: `block-${item.id}`,
                    style: { width: `${widthPx}px`, backgroundColor: '#fff', overflow: 'visible' }
                }, item.type === 'question' 
                    ? React.createElement(MathText, { content: item.html, isHtml: true, variant: 'default', className: 'true-elite-math' })
                    : React.createElement('div', { dangerouslySetInnerHTML: { __html: item.html } })
                )
            )
        )
    );

    await document.fonts.ready;
    await new Promise(r => setTimeout(r, 1500)); 

    const results: Record<string, { img: string, ratio: number }> = {};
    for (const item of contentItems) {
        const element = document.getElementById(`block-${item.id}`);
        if (element) {
            const canvas = await html2canvas(element, { 
                scale: 2.0, // Optimized lightweight resolution
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                allowTaint: true
            });
            results[item.id] = {
                img: canvas.toDataURL('image/jpeg', 0.8), // Enhanced compression for performance
                ratio: canvas.height / canvas.width
            };
            canvas.width = 0; canvas.height = 0;
        }
    }

    root.unmount();
    document.body.removeChild(container);
    return results;
};

export const generateBookletPDF = async (
    examName: string,
    questionsByTopic: Record<string, Question[]>,
    logoUrl: string = '/logo.webp',
    onProgress?: (msg: string) => void
) => {
    try {
        if (onProgress) onProgress("Initializing True Elite Engine...");
        const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const logoBase64 = await getBase64FromUrl(logoUrl);

        const addWatermark = (logo: string) => {
            if (!logo) return;
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: 0.12 })); 
            const size = 100;
            doc.addImage(logo, 'PNG', (pageWidth - size) / 2, (pageHeight - size) / 2, size, size);
            doc.restoreGraphicsState();
        };

        const addChrome = (pageNumber: number) => {
            doc.setDrawColor(0);
            doc.setLineWidth(0.4);
            doc.line(MARGINS.left, 15, pageWidth - MARGINS.right, 15);
            doc.line(MARGINS.left, pageHeight - 12, pageWidth - MARGINS.right, pageHeight - 12);

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text("ITALOSTUDY.COM", MARGINS.left, 11);
            doc.text(`${(examName || "").toUpperCase()} - OFFICIAL MASTER PUBLICATION`, pageWidth / 2, 11, { align: 'center' });
            doc.text(`Page ${pageNumber}`, pageWidth - MARGINS.right, 11, { align: 'right' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text("ItaloStudy | Free CENT-S,IMAT Practice, lectures & Unlimited Free Mocks", pageWidth / 2, pageHeight - 6, { align: 'center' });
            
            doc.setDrawColor(220);
            doc.setLineWidth(0.1);
            doc.line(pageWidth / 2, 15, pageWidth / 2, pageHeight - 12); // Two-column divider
        };

        // 1. TRUE ELITE COVER
        if (onProgress) onProgress("Designing Professional Master Cover...");
        doc.setFillColor(COLORS.primary);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        if (logoBase64) doc.addImage(logoBase64, 'PNG', (pageWidth - 45) / 2, 60, 45, 45);
        
        doc.setTextColor('#ffffff');
        doc.setFontSize(38);
        doc.setFont('times', 'bold');
        doc.text("OFFICIAL MASTER BOOKLET", pageWidth / 2, 125, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#94a3b8');
        doc.text((examName || "EXAMINATION PREPARATION").toUpperCase(), pageWidth / 2, 135, { align: 'center' });
        doc.setLineWidth(1.5); doc.setDrawColor('#4f46e5');
        doc.line(pageWidth / 2 - 25, 142, pageWidth / 2 + 25, 142);

        // 2. DATA PREPARATION (Ultra Elite Hierarchy)
        const flatContent: { html: string, id: string, type: string }[] = [];
        let moduleIndex = 0;

        Object.keys(questionsByTopic).forEach(key => {
            const [subject, topic] = key.split('|||');
            moduleIndex++;
            const qCount = questionsByTopic[key].length;

            flatContent.push({ 
                html: `
                    <div class="true-subject-card">
                        <div class="module-id">${moduleIndex.toString().padStart(2, '0')}</div>
                        <h1>${subject}</h1>
                        <div class="stats">${qCount} Questions · 100% Official Syllabus Weightage · Master Prep</div>
                    </div>
                `, 
                id: `s-${subject}`, 
                type: 'subject' 
            });

            flatContent.push({ 
                html: `<div class="true-topic-pill">${topic}</div>`, 
                id: `t-${key}`, 
                type: 'topic' 
            });

            questionsByTopic[key].forEach((q, idx) => {
                let qHtml = `<div class="true-q-block">`;
                qHtml += `<div class="true-q-num">Q.${(idx + 1).toString().padStart(2, '0')}</div>`;
                qHtml += `<div class="true-q-text">${q.question_text}</div>`;
                if (q.options?.length) {
                    qHtml += `<div class="true-opt-list">`;
                    q.options.forEach((opt, oIdx) => {
                        qHtml += `<div><span class="true-opt-tag">(${String.fromCharCode(65 + oIdx)})</span> <span class="true-opt-label">${opt}</span></div>`;
                    });
                    qHtml += `</div>`;
                }
                qHtml += `</div>`;
                flatContent.push({ html: qHtml, id: `q-${key}-${idx}`, type: 'question' });
            });
        });

        // 3. HYBRID COLUMN ASSEMBLY (Elite Publication Flow)
        doc.addPage();
        addChrome(1);
        addWatermark(logoBase64);
        
        let currentColumn = 0; // 0 = left, 1 = right
        let currentY = 20;
        const colWidth = (pageWidth - MARGINS.left - MARGINS.right - MARGINS.gutter) / 2;

        for (let i = 0; i < flatContent.length; i += BATCH_SIZE) {
            const batch = flatContent.slice(i, i + BATCH_SIZE);
            if (onProgress) onProgress(`Elite Publishing: ${Math.round((i / flatContent.length) * 100)}% Complete...`);
            
            const rendered = await renderBatchToImages(batch, 500); 

            batch.forEach(item => {
                const res = rendered[item.id];
                if (!res) return;

                let drawW = colWidth;
                let drawH = colWidth * res.ratio;
                let xPos = currentColumn === 0 ? MARGINS.left : (pageWidth / 2 + MARGINS.gutter / 2);

                // If Subject Card OR Topic Pill, reset to full width if needed or ensure safe placement
                if (item.type === 'subject') {
                    // Check if enough space for subject card, otherwise new page
                    if (currentY + 60 > pageHeight - MARGINS.bottom || currentColumn === 1) {
                        doc.addPage();
                        addChrome(doc.getNumberOfPages());
                        addWatermark(logoBase64);
                        currentY = 20;
                    }
                    xPos = MARGINS.left;
                    drawW = pageWidth - MARGINS.left - MARGINS.right;
                    drawH = drawW * res.ratio;
                    currentColumn = 0; // Subject card always resets column flow
                } else if (item.type === 'topic') {
                    // Topics stay in column for DPP flow, but check height
                    if (currentY + drawH + 10 > pageHeight - MARGINS.bottom) {
                        if (currentColumn === 0) { currentColumn = 1; currentY = 20; }
                        else { 
                            doc.addPage(); 
                            addChrome(doc.getNumberOfPages()); 
                            addWatermark(logoBase64); 
                            currentColumn = 0; currentY = 20; 
                        }
                        xPos = currentColumn === 0 ? MARGINS.left : (pageWidth / 2 + MARGINS.gutter / 2);
                    }
                } else if (currentY + drawH > pageHeight - MARGINS.bottom) {
                    if (currentColumn === 0) {
                        currentColumn = 1;
                        currentY = 20;
                    } else {
                        doc.addPage();
                        addChrome(doc.getNumberOfPages());
                        addWatermark(logoBase64);
                        currentColumn = 0;
                        currentY = 20;
                    }
                    xPos = currentColumn === 0 ? MARGINS.left : (pageWidth / 2 + MARGINS.gutter / 2);
                }

                doc.addImage(res.img, 'JPEG', xPos, currentY, drawW, drawH, undefined, 'FAST');
                currentY += drawH + 3;
                if (item.type === 'subject') currentY += 5; // Extra breathing room after subject card
            });
        }

        // 4. ABOUT PAGE (Editorial Finale)
        doc.addPage();
        doc.setFillColor(COLORS.primary); doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setTextColor('#ffffff'); doc.setFontSize(28); doc.setFont('times', 'bold'); doc.text("ITALOSTUDY", 20, 60);
        doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.text("Master Your Preparation with India's Premier Medical Entrance Partner.", 20, 70);
        
        doc.setLineWidth(1); doc.setDrawColor('#4f46e5');
        doc.line(20, 78, 40, 78);

        const sections = [
            { t: "Comprehensive Analysis", c: "Our question banks are curated by successful medical students and subject experts to ensure full syllabus coverage and logical complexity." },
            { t: "Expert Lessons", c: "Visit our platform for expert-led video lectures and real-time exam simulations with detailed performance reports." },
            { t: "Connect With Us", c: "www.italostudy.com  |  Instagram: @italostudy_official" }
        ];

        let aboutY = 95;
        sections.forEach(s => {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(s.t.toUpperCase(), 20, aboutY);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
            const text = doc.splitTextToSize(s.c, pageWidth - 40);
            doc.text(text, 20, aboutY + 7);
            aboutY += 28;
        });

        doc.save(`ITALOSTUDY_${(examName || "BOOKLET").toUpperCase().replace(/\s+/g, '_')}_MASTER_ELITE.pdf`);
        if (onProgress) onProgress("Success! Final Elite PDF is ready.");
    } catch (error) {
        console.error("True Elite Engine Error:", error);
        if (onProgress) onProgress("System Failed - Check Console");
        throw error;
    }
};
