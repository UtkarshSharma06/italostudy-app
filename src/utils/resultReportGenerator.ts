// Heavy modules (jspdf, jspdf-autotable) are now dynamically imported only when needed

const COLORS = {
  primary: '#6366f1',
  primaryDark: '#4338ca',
  secondary: '#475569',
  accent: '#0f172a',
  success: '#059669',
  successLight: '#d1fae5',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  warning: '#d97706',
  warningLight: '#fef3c7',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
  amber: '#b45309',
  amberLight: '#fffbeb',
  indigo: '#4f46e5',
  indigoLight: '#eef2ff',
  slate500: '#64748b',
};

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b] as [number, number, number];
};

const getBase64FromUrl = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return '';
  }
};

const drawBar = (doc: any, x: number, y: number, w: number, pct: number, color: string) => {
  doc.setFillColor(...hexToRgb('#e2e8f0'));
  doc.roundedRect(x, y, w, 3, 1, 1, 'F');
  if (pct > 0) {
    doc.setFillColor(...hexToRgb(color));
    doc.roundedRect(x, y, Math.max(3, w * (pct / 100)), 3, 1, 1, 'F');
  }
};

export const generateResultReportPDF = async (data: {
  test: any;
  sessionTitle: string | null;
  user: any;
  marksObtained: number;
  maxMarks: number;
  accuracy: number;
  completedPct: string;
  rankings: any;
  avgData: any;
  sectionPerf: any[];
  isSessionLive?: boolean;
  testConfig?: any;
}) => {
  const { test, sessionTitle, user, marksObtained, maxMarks, accuracy, completedPct, rankings, avgData, sectionPerf, testConfig } = data;

  // DYNAMIC IMPORTS
  const jsPDF = (await import('jspdf')).default;
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  let y = margin;

  // ═══════════════════════════════════════════════════
  // 1. HEADER BAND
  // ═══════════════════════════════════════════════════
  doc.setFillColor(...hexToRgb(COLORS.primaryDark));
  doc.rect(0, 0, pageWidth, 28, 'F');

  try {
    const logoBase64 = await getBase64FromUrl('/logo.webp');
    if (logoBase64) doc.addImage(logoBase64, 'PNG', margin, 7, 32, 11);
  } catch (_) {}

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('ITALOSTUDY', margin + 35, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 190, 255);
  doc.text('Exam Preparation Platform', margin + 35, 18);

  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  doc.setTextColor(200, 210, 255);
  doc.setFontSize(7);
  doc.text(`Generated: ${dateStr}`, pageWidth - margin, 17, { align: 'right' });

  y = 36;

  // ═══════════════════════════════════════════════════
  // 2. TEST TITLE & STUDENT
  // ═══════════════════════════════════════════════════
  const testName = sessionTitle || test.subject || test.exam_type?.toUpperCase() || 'Mock Test';
  const studentName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Student';
  const testType = test.is_mock || test.test_type === 'mock' ? 'MOCK TEST' : 'PRACTICE SESSION';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...hexToRgb(COLORS.accent));
  doc.text(testName, margin, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text(`Student: ${studentName}`, margin, y);

  const badgeColor = test.is_mock || test.test_type === 'mock' ? COLORS.indigo : COLORS.success;
  const [br, bg, bb] = hexToRgb(badgeColor);
  doc.setFillColor(br, bg, bb);
  const badgeW = doc.getTextWidth(testType) + 6;
  doc.roundedRect(pageWidth - margin - badgeW, y - 5, badgeW, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(testType, pageWidth - margin - badgeW / 2, y - 0.5, { align: 'center' });

  y += 10;

  // ─── Divider
  doc.setDrawColor(...hexToRgb(COLORS.border));
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ═══════════════════════════════════════════════════
  // 3. SCORE + RANK ROW
  // ═══════════════════════════════════════════════════
  const isMock = test.is_mock || test.test_type === 'mock';
  const colW = isMock ? (pageWidth - margin * 2 - 8) / 2 : (pageWidth - margin * 2);
  const cardH = 34;

  // Score Card
  doc.setFillColor(242, 244, 255);
  doc.roundedRect(margin, y, colW, cardH, 4, 4, 'F');
  doc.setDrawColor(...hexToRgb('#c7d2fe'));
  doc.roundedRect(margin, y, colW, cardH, 4, 4, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...hexToRgb(COLORS.indigo));
  doc.text('TOTAL SCORE', margin + 6, y + 8);

  doc.setFontSize(26);
  doc.setTextColor(...hexToRgb(COLORS.primaryDark));
  const scoreStr = `${marksObtained}`;
  doc.text(scoreStr, margin + 6, y + 24);
  const sw = doc.getTextWidth(scoreStr);

  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text(`/ ${maxMarks}`, margin + 6 + sw + 2, y + 23);

  // Percentile badge inside score card
  if (rankings?.user_rank && rankings?.total_participants) {
    const pct = (((rankings.total_participants - rankings.user_rank + 1) / rankings.total_participants) * 100).toFixed(1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(COLORS.indigo));
    doc.text(`Top ${pct}%`, margin + colW - 6, y + 8, { align: 'right' });
  }

  // Rank Card
  if (isMock) {
    const rx = margin + colW + 8;
    doc.setFillColor(...hexToRgb(COLORS.amberLight));
    doc.roundedRect(rx, y, colW, cardH, 4, 4, 'F');
    doc.setDrawColor(...hexToRgb('#fde68a'));
    doc.roundedRect(rx, y, colW, cardH, 4, 4, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(COLORS.amber));
    doc.text('RANK', rx + 6, y + 8);

    doc.setFontSize(26);
    doc.setTextColor(...hexToRgb(COLORS.amber));
    doc.text(`${rankings?.user_rank || '—'}`, rx + 6, y + 24);

    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(COLORS.warning));
    doc.text(`of ${rankings?.total_participants || '—'} participants`, rx + colW - 6, y + 24, { align: 'right' });
  }

  y += cardH + 8;

  // ═══════════════════════════════════════════════════
  // 4. STATS ROW (4 metrics)
  // ═══════════════════════════════════════════════════
  const statsW = (pageWidth - margin * 2) / 4;
  const statsH = 22;

  const statsItems = [
    { label: 'CORRECT', val: `${test.correct_answers}`, sub: `/ ${test.total_questions}`, color: COLORS.success, bg: COLORS.successLight },
    { label: 'INCORRECT', val: `${test.wrong_answers}`, sub: `/ ${test.total_questions}`, color: COLORS.danger, bg: COLORS.dangerLight },
    { label: 'SKIPPED', val: `${test.skipped_answers}`, sub: `/ ${test.total_questions}`, color: COLORS.secondary, bg: COLORS.bg },
    { label: 'ACCURACY', val: `${accuracy}%`, sub: `${completedPct}% done`, color: COLORS.indigo, bg: COLORS.indigoLight },
  ];

  statsItems.forEach((s, i) => {
    const sx = margin + i * statsW;
    doc.setFillColor(...hexToRgb(s.bg));
    doc.roundedRect(sx + (i > 0 ? 2 : 0), y, statsW - 2, statsH, 3, 3, 'F');

    const cx = sx + statsW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...hexToRgb(COLORS.secondary));
    doc.text(s.label, cx, y + 7, { align: 'center' });

    doc.setFontSize(13);
    doc.setTextColor(...hexToRgb(s.color));
    doc.text(s.val, cx, y + 16, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setTextColor(...hexToRgb(COLORS.slate500));
    doc.text(s.sub, cx, y + 20, { align: 'center' });
  });

  y += statsH + 8;

  // ═══════════════════════════════════════════════════
  // 5. PERFORMANCE COMPARISON (if mock)
  // ═══════════════════════════════════════════════════
  if (isMock && (rankings || avgData)) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(COLORS.accent));
    doc.text('Performance Comparison', margin, y);
    y += 6;

    const topperEntry = rankings?.leaderboard?.[0];
    const topperScore = topperEntry
      ? testConfig
        ? Number(((topperEntry.correct_answers || 0) * testConfig.scoring.correct + (topperEntry.wrong_answers || 0) * testConfig.scoring.incorrect).toFixed(1))
        : topperEntry.score
      : null;
    const avgScore = avgData
      ? testConfig
        ? Number((avgData.correct * testConfig.scoring.correct + avgData.incorrect * testConfig.scoring.incorrect).toFixed(1))
        : avgData.score
      : null;

    const compItems = [
      { label: 'YOU', sub: studentName, score: marksObtained, correct: test.correct_answers, color: COLORS.primary, bg: COLORS.indigoLight },
      { label: 'TOPPER', sub: topperEntry?.display_name || 'Top Student', score: topperScore, correct: topperEntry?.correct_answers, color: COLORS.success, bg: COLORS.successLight },
      { label: 'AVERAGE', sub: `${rankings?.total_participants || '—'} students`, score: avgScore, correct: avgData?.correct, color: COLORS.warning, bg: COLORS.warningLight },
    ];

    const cw = (pageWidth - margin * 2 - 8) / 3;
    const ch = 32;

    compItems.forEach((c, i) => {
      const cx = margin + i * (cw + 4);
      doc.setFillColor(...hexToRgb(c.bg));
      doc.roundedRect(cx, y, cw, ch, 3, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...hexToRgb(c.color));
      doc.text(c.label, cx + cw / 2, y + 6, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...hexToRgb(COLORS.secondary));
      const subText = (c.sub || '').length > 18 ? (c.sub || '').substring(0, 16) + '…' : (c.sub || '');
      doc.text(subText, cx + cw / 2, y + 11, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...hexToRgb(c.color));
      doc.text(c.score !== null && c.score !== undefined ? `${c.score}` : '—', cx + cw / 2, y + 23, { align: 'center' });

      doc.setFontSize(7);
      doc.setTextColor(...hexToRgb(COLORS.secondary));
      doc.text(`/ ${maxMarks} marks`, cx + cw / 2, y + 29, { align: 'center' });
    });

    y += ch + 10;
  }

  // ═══════════════════════════════════════════════════
  // 6. SECTION WISE PERFORMANCE TABLE
  // ═══════════════════════════════════════════════════
  if (sectionPerf && sectionPerf.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(COLORS.accent));
    doc.text('Section Wise Performance', margin, y);
    y += 5;

    const tableBody = sectionPerf.map(sec => {
      const secScore = testConfig
        ? Number((sec.correct * testConfig.scoring.correct + sec.incorrect * testConfig.scoring.incorrect).toFixed(1))
        : sec.score;
      return [
        sec.name,
        `${secScore}`,
        `${sec.correct} / ${sec.total || '—'}`,
        `${sec.incorrect}`,
        `${sec.skipped}`,
        `${sec.accuracy}%`,
        formatHMSText(sec.timeSecs),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['Section', 'Score', 'Correct', 'Incorrect', 'Skipped', 'Accuracy', 'Time Spent']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3.5, font: 'helvetica' },
      headStyles: {
        fillColor: hexToRgb(COLORS.primaryDark),
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      alternateRowStyles: { fillColor: hexToRgb('#f8fafc') },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        5: { textColor: hexToRgb(COLORS.success) },
      },
      margin: { left: margin, right: margin },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════════════
  // 7. LEADERBOARD SNAPSHOT (top 5)
  // ═══════════════════════════════════════════════════
  if (isMock && rankings?.leaderboard?.length > 0) {
    if (y > pageHeight - 60) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(COLORS.accent));
    doc.text('Leaderboard Snapshot (Top 5)', margin, y);
    y += 5;

    const top5 = rankings.leaderboard.slice(0, 5);
    const tableBody2 = top5.map((e: any) => {
      const eScore = testConfig
        ? Number(((e.correct_answers || 0) * testConfig.scoring.correct + (e.wrong_answers || 0) * testConfig.scoring.incorrect).toFixed(1))
        : e.score;
      const isYou = e.user_id === user?.id;
      return [`#${e.rank}`, isYou ? `${e.display_name} (You)` : e.display_name, `${eScore}`, `${e.correct_answers || 0}`, `${e.wrong_answers || 0}`];
    });

    autoTable(doc, {
      startY: y,
      head: [['Rank', 'Student', 'Score', 'Correct', 'Incorrect']],
      body: tableBody2,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: hexToRgb('#b45309'), textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center', fontStyle: 'bold', cellWidth: 18 } },
      margin: { left: margin, right: margin },
      didParseCell: (d: any) => {
        const row = d.row?.raw;
        if (row && typeof row[1] === 'string' && row[1].includes('(You)')) {
          d.cell.styles.fillColor = [255, 251, 235] as [number, number, number];
          d.cell.styles.textColor = hexToRgb(COLORS.amber);
          d.cell.styles.fontStyle = 'bold';
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════════════
  // 8. FOOTER BAND
  // ═══════════════════════════════════════════════════
  if (y > pageHeight - 30) { doc.addPage(); y = pageHeight - 30; }

  const footerY = pageHeight - 22;
  doc.setFillColor(...hexToRgb(COLORS.primaryDark));
  doc.rect(0, footerY, pageWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('Master your Prep with ITALOSTUDY', pageWidth / 2, footerY + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 190, 255);
  doc.text('Real-exam simulations • Detailed Analysis • Expert Lessons  |  italostudy.com', pageWidth / 2, footerY + 16, { align: 'center' });

  doc.save(`ItaloStudy_Report_${test.id?.substring(0, 8) || 'report'}.pdf`);
};

const formatHMSText = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
};
