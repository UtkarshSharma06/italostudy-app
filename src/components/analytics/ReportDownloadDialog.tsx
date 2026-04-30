import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileText, Loader2, CheckCircle2, TrendingUp, Clock, Award } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { toast } from "sonner";

interface ReportDownloadDialogProps {
    userData: {
        name: string;
        exam: string;
        stats: {
            accuracy: string;
            timeSpent: string;
            verifiedSkills: string;
            percentile: string;
            rank: number;
            points: number;
        };
        subjectData: any[];
        mockHistory: any[];
        topicMastery: any[];
    };
    syllabus?: any; // Added syllabus to show all topics
    trigger?: React.ReactNode;
}

export default function ReportDownloadDialog({ userData, syllabus, trigger }: ReportDownloadDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [includeMocks, setIncludeMocks] = useState(true);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
        userData.subjectData.map(s => s.subject)
    );

    const toggleSubject = (subject: string) => {
        setSelectedSubjects(prev =>
            prev.includes(subject)
                ? prev.filter(s => s !== subject)
                : [...prev, subject]
        );
    };

    const generatePDF = async () => {
        setIsGenerating(true);
        try {
            const doc = new jsPDF({ unit: 'mm', format: 'a4' });
            const W = doc.internal.pageSize.width;
            const H = doc.internal.pageSize.height;

            // ── Premium Brand Palette ──────────────────────────────
            const brand      = [79,  70, 229] as [number,number,number]; // Indigo-600
            const brandLight = [129, 140, 248] as [number,number,number]; // Indigo-400
            const brandDark  = [49,  46, 129] as [number,number,number]; // Indigo-900
            const rose       = [225,  29, 72] as [number,number,number]; // Rose-600
            const emerald    = [16,  185, 129] as [number,number,number]; // Emerald-500
            const amber      = [245, 158,  11] as [number,number,number]; // Amber-500
            const slate200   = [226, 232, 240] as [number,number,number];
            const slate600   = [71,  85,  105] as [number,number,number];
            const slate900   = [15,  23,  42] as [number,number,number];
            const bgSlate    = [248, 250, 252] as [number,number,number];

            const M = 15; // page margin

            const addFooter = (pageNum: number, totalPages: number) => {
                doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
                doc.setLineWidth(0.2);
                doc.line(M, H - 15, W - M, H - 15);
                
                doc.setTextColor(slate600[0], slate600[1], slate600[2]);
                doc.setFontSize(9); // Increased
                doc.setFont('helvetica', 'normal');
                doc.text('ITALOSTUDY™ • PERFORMANCE INTELLIGENCE SYSTEM', M, H - 10);
                doc.text(`Page ${pageNum} of ${totalPages}`, W - M, H - 10, { align: 'right' });
            };

            const loadImage = (src: string): Promise<HTMLImageElement> =>
                new Promise((res, rej) => {
                    const img = new Image();
                    const timeout = setTimeout(() => rej(new Error('Timeout')), 5000);
                    img.onload = () => { clearTimeout(timeout); res(img); };
                    img.onerror = () => { clearTimeout(timeout); rej(new Error('Failed')); };
                    img.crossOrigin = 'anonymous';
                    img.src = src;
                });

            // ─────────────────────────────────────────────────────────
            // PAGE 1 — Premium High-Contrast Cover (Filled version)
            // ─────────────────────────────────────────────────────────
            
            // Full-page dark navy background for the header area
            doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
            doc.rect(0, 0, W, 100, 'F');

            // Header Accents
            doc.setDrawColor(brandLight[0], brandLight[1], brandLight[2]);
            doc.setLineWidth(0.5);
            doc.line(M, 15, M+20, 15);
            
            // Logo area with High Visibility
            try {
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(M - 2, 25, 54, 18, 2, 2, 'F');
                const logo = await loadImage('/logo.webp');
                const lW = 46;
                const lH = (logo.height * lW) / logo.width;
                doc.addImage(logo, 'PNG', M + 2, 28, lW, lH);
            } catch (_) {
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(28);
                doc.setFont('helvetica', 'bold');
                doc.text('ITALOSTUDY', M, 38);
            }

            // Report Title
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(42);
            doc.setFont('helvetica', 'bold');
            doc.text('ACADEMIC', M, 65);
            doc.text('INTELLIGENCE', M, 80);
            
            doc.setTextColor(brandLight[0], brandLight[1], brandLight[2]);
            doc.setFontSize(16); // Increased
            doc.setFont('helvetica', 'normal');
            doc.text('PERFORMANCE DATA REPORT 2026', M, 88);

            // Large White Student Box
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(M, 110, W - M * 2, 35, 4, 4, 'F');
            doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
            doc.setLineWidth(1);
            doc.roundedRect(M, 110, W - M * 2, 35, 4, 4, 'S');

            doc.setTextColor(slate900[0], slate900[1], slate900[2]);
            doc.setFontSize(26); // Increased
            doc.setFont('helvetica', 'bold');
            doc.text(userData.name.toUpperCase(), M + 10, 128);
            
            doc.setTextColor(slate600[0], slate600[1], slate600[2]);
            doc.setFontSize(11); // Increased
            doc.setFont('helvetica', 'normal');
            doc.text(`EXAM TRACK: ${userData.exam.toUpperCase()}`, M + 10, 137);

            // Executive Summary Stats
            let currentY = 155;
            const cardW = (W - M * 2 - 10) / 4;
            const summaryStats = [
                { label: 'ACCURACY', value: userData.stats.accuracy, col: amber },
                { label: 'TIME SPENT', value: userData.stats.timeSpent, col: brand },
                { label: 'SKILLS', value: userData.stats.verifiedSkills, col: rose },
                { label: 'PERCENTILE', value: userData.stats.percentile, col: emerald },
            ];

            summaryStats.forEach((s, i) => {
                const x = M + i * (cardW + 3.3);
                doc.setFillColor(bgSlate[0], bgSlate[1], bgSlate[2]);
                doc.roundedRect(x, currentY, cardW, 45, 4, 4, 'F'); // Increased H
                
                doc.setTextColor(s.col[0], s.col[1], s.col[2]);
                doc.setFontSize(22); // Increased
                doc.setFont('helvetica', 'bold');
                doc.text(s.value, x + cardW / 2, currentY + 20, { align: 'center' });
                
                doc.setTextColor(slate600[0], slate600[1], slate600[2]);
                doc.setFontSize(10); // Increased
                doc.setFont('helvetica', 'bold');
                doc.text(s.label, x + cardW / 2, currentY + 32, { align: 'center' });
            });

            // ADDED: EXECUTIVE OVERVIEW ON PAGE 1
            currentY += 60;
            doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
            doc.roundedRect(M, currentY, W - M * 2, 45, 4, 4, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('EXECUTIVE PERFORMANCE OVERVIEW', M + 10, currentY + 12);
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            const overviewText = `Your current standing on the Italostudy platform indicates a ${userData.stats.percentile} percentile performance with a global rank of #${userData.stats.rank}. Your average accuracy across all attempted subjects is ${userData.stats.accuracy}, showing a ${parseFloat(userData.stats.accuracy) > 70 ? 'strong' : 'developing'} command of the core syllabus. This report provides a subject-by-subject deconstruction of your mastery levels and a dedicated intelligence blueprint for your upcoming exams.`;
            const overviewLines = doc.splitTextToSize(overviewText, W - M * 2 - 20);
            doc.text(overviewLines, M + 10, currentY + 22);

            // Branding footer for cover
            doc.setTextColor(slate600[0], slate600[1], slate600[2]);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Report Generated: ${format(new Date(), 'MMMM dd, yyyy')}`, W / 2, 275, { align: 'center' });
            doc.text('© ITALOSTUDY Academic Preparation Intelligence', W / 2, 282, { align: 'center' });

            // ─────────────────────────────────────────────────────────
            // PAGE 2 — Subject & Topic Deep Dive (BY SUBJECT)
            // ─────────────────────────────────────────────────────────
            doc.addPage();
            currentY = 25;

            doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
            doc.setFontSize(24); // Increased
            doc.setFont('helvetica', 'bold');
            doc.text('SUBJECT PROFICIENCY', M, currentY);
            
            currentY += 15;

            const sortedSubjects = [...userData.subjectData]
                .filter(s => selectedSubjects.includes(s.subject))
                .sort((a, b) => parseFloat(a.accuracy) - parseFloat(b.accuracy));

            for (const subj of sortedSubjects) {
                if (currentY > H - 60) {
                    doc.addPage();
                    currentY = 25;
                }

                // Subject Heading
                doc.setFillColor(brand[0], brand[1], brand[2]);
                doc.roundedRect(M, currentY, W - M * 2, 14, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.text(subj.subject.toUpperCase(), M + 5, currentY + 9);
                
                doc.setFontSize(12);
                doc.text(`${subj.accuracy}% Accuracy  |  ${subj.total} Questions`, W - M - 5, currentY + 9, { align: 'right' });

                currentY += 18;

                // --- NEW: LOGIC TO SHOW ALL TOPICS FOR THIS SUBJECT ---
                let topics: any[] = [];
                
                // Try to get official topics from syllabus
                const selectedSubjLower = subj.subject.toLowerCase().trim();
                let officialTopicNames: string[] = [];
                
                if (syllabus) {
                    Object.entries(syllabus).forEach(([cat, tList]: [string, any]) => {
                        const catLower = cat.toLowerCase().trim();
                        if (catLower === selectedSubjLower || catLower.includes(selectedSubjLower) || selectedSubjLower.includes(catLower)) {
                            (tList as any[]).forEach(t => officialTopicNames.push(t.name));
                        }
                    });
                }

                // Match attempted topics with official list
                const attemptedMap = new Map();
                userData.topicMastery.forEach(t => {
                    if (t.subject === subj.subject) {
                        attemptedMap.set(t.topic.toLowerCase().trim(), t);
                    }
                });

                if (officialTopicNames.length > 0) {
                    topics = officialTopicNames.map(name => {
                        const key = name.toLowerCase().trim();
                        const attempted = attemptedMap.get(key);
                        if (attempted) {
                            const acc = attempted.accuracy_percentage ?? attempted.accuracy ?? 0;
                            let status = 'Not Started Yet';
                            if (attempted.total_answered > 0) {
                                status = acc >= 90 ? 'Mastered' : acc >= 75 ? 'Strong' : acc >= 50 ? 'Improving' : 'Weak';
                            }
                            return {
                                topic: name,
                                status: status,
                                accuracy: acc,
                                correct: attempted.correct_answered ?? attempted.correct ?? 0,
                                total: attempted.total_answered ?? 0
                            };
                        }
                        return { topic: name, status: 'Not Started Yet', accuracy: 0, correct: 0, total: 0 };
                    });
                } else {
                    // Fallback to only attempted if syllabus match failed
                    topics = userData.topicMastery
                        .filter(t => t.subject === subj.subject)
                        .map(t => {
                            const acc = t.accuracy_percentage ?? t.accuracy ?? 0;
                            return {
                                topic: t.topic,
                                status: acc >= 90 ? 'Mastered' : acc >= 75 ? 'Strong' : acc >= 50 ? 'Improving' : 'Weak',
                                accuracy: acc,
                                correct: t.correct_answered ?? t.correct ?? 0,
                                total: t.total_answered ?? 0
                            };
                        });
                }

                topics.sort((a, b) => b.accuracy - a.accuracy);

                if (topics.length > 0) {
                    autoTable(doc, {
                        startY: currentY,
                        margin: { left: M, right: M },
                        head: [['TOPIC NAME', 'STATUS', 'ACCURACY', 'CORRECT', 'TOTAL']],
                        body: topics.map(t => [
                            t.topic,
                            t.status,
                            t.status === 'Not Started Yet' ? '-' : `${t.accuracy}%`,
                            t.correct || '-',
                            t.total || '-'
                        ]),
                        theme: 'striped',
                        headStyles: { fillColor: slate900, fontSize: 11, cellPadding: 5 },
                        bodyStyles: { fontSize: 11, cellPadding: 5, textColor: slate900 },
                        alternateRowStyles: { fillColor: [249, 250, 251] },
                        columnStyles: {
                            0: { cellWidth: 70, fontStyle: 'bold' },
                            1: { halign: 'center', fontStyle: 'bold' },
                            2: { halign: 'center' },
                            3: { halign: 'center' },
                            4: { halign: 'center' },
                        },
                        didParseCell: (data) => {
                            if (data.section === 'body' && data.column.index === 1) {
                                const val = data.cell.text[0];
                                if (val === 'Mastered') data.cell.styles.textColor = emerald;
                                else if (val === 'Strong') data.cell.styles.textColor = brand;
                                else if (val === 'Improving') data.cell.styles.textColor = amber;
                                else if (val === 'Weak') data.cell.styles.textColor = rose;
                                else data.cell.styles.textColor = slate600;
                            }
                        }
                    });
                    currentY = (doc as any).lastAutoTable.finalY + 15;
                } else {
                    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
                    doc.setFontSize(12);
                    doc.text('No topic data available for this subject yet.', M + 5, currentY);
                    currentY += 15;
                }
            }

            // ─────────────────────────────────────────────────────────
            // PAGE 3 — MOCK EXAM PERFORMANCE HISTORY (HIGH VISIBILITY)
            // ─────────────────────────────────────────────────────────
            if (includeMocks && userData.mockHistory.length > 0) {
                doc.addPage();
                currentY = 25;
                
                doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
                doc.setFontSize(24);
                doc.setFont('helvetica', 'bold');
                doc.text('MOCK EXAM HISTORY', M, currentY);
                
                doc.setTextColor(rose[0], rose[1], rose[2]);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text('A deconstruction of your full-length practice examinations.', M, currentY + 8);

                autoTable(doc, {
                    startY: currentY + 15,
                    margin: { left: M, right: M },
                    head: [['DATE', 'SCORE %', 'CORRECT', 'WRONG', 'SKIPPED', 'TOTAL']],
                    body: userData.mockHistory.map(m => [
                        format(new Date(m.created_at || m.completed_at), 'MMM dd, yyyy'),
                        `${Math.round((m.correct_answers / m.total_questions) * 100)}%`,
                        m.correct_answers,
                        m.wrong_answers || 0,
                        m.skipped_answers || 0,
                        m.total_questions
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: rose, fontSize: 11, cellPadding: 5 },
                    bodyStyles: { fontSize: 12, cellPadding: 5, textColor: slate900 },
                    columnStyles: {
                        0: { fontStyle: 'bold' },
                        1: { halign: 'center', fontStyle: 'bold' },
                        2: { halign: 'center' },
                        3: { halign: 'center' },
                        4: { halign: 'center' },
                        5: { halign: 'center' },
                    }
                });
                
                currentY = (doc as any).lastAutoTable.finalY + 20;

                const scores = userData.mockHistory.map(m => (m.correct_answers / m.total_questions) * 100);
                const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
                const latest = scores[0];
                const trend = latest > avg ? 'POSITIVE (UPWARDLY TRENDING)' : 'NEUTRAL (STABILIZING)';
                
                const strategyMsg = `Based on your average score of ${Math.round(avg)}% across ${userData.mockHistory.length} examinations, your performance trajectory is ${trend}. \n\nCRITICAL OBSERVATIONS:\n1. Your average accuracy is ${latest > 70 ? 'exceeding' : 'below'} the global success threshold of 75% for top-tier tracks.\n2. Penalty accumulation from wrong answers is currently draining ${Math.round((userData.mockHistory.reduce((a,b)=>a+(b.wrong_answers||0),0)/userData.mockHistory.reduce((a,b)=>a+(b.total_questions||1),0))*40)} potential points per 100 questions.\n3. ACTION: Implementation of the 'Educated Guessing Protocol' is required. Every skipped answer (averaging ${Math.round(userData.mockHistory.reduce((a,b)=>a+(b.skipped_answers||0),0)/userData.mockHistory.length)} per mock) should be an opportunity to apply process-of-elimination logic. \n4. TIMING: Ensure your next 3 mocks are simulated under strict AM conditions (9 AM - 12 PM) to align with peak cognitive demand during the actual exam window.`;
                
                const strategyLines = doc.splitTextToSize(strategyMsg, W - M * 2 - 20);
                const boxHeight = (strategyLines.length * 5) + 30; // Dynamic height based on lines + padding

                // Personalized Mock Strategy Box
                doc.setFillColor(bgSlate[0], bgSlate[1], bgSlate[2]);
                doc.roundedRect(M, currentY, W - M * 2, boxHeight, 3, 3, 'F');
                doc.setDrawColor(rose[0], rose[1], rose[2]);
                doc.setLineWidth(0.5);
                doc.roundedRect(M, currentY, W - M * 2, boxHeight, 3, 3, 'S');

                doc.setTextColor(rose[0], rose[1], rose[2]);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('MOCK PERFORMANCE ANALYSIS', M + 10, currentY + 12);

                doc.setTextColor(slate900[0], slate900[1], slate900[2]);
                doc.setFontSize(11);
                doc.text(strategyLines, M + 10, currentY + 22);
                
                currentY += boxHeight + 10;
            }

            // ─────────────────────────────────────────────────────────
            // PAGE 4+ — THE INTELLIGENCE SYSTEM (DYNAMIC ADVICE)
            // ─────────────────────────────────────────────────────────
            doc.addPage();
            currentY = 25;

            doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
            doc.rect(M, currentY, 4, 10, 'F');
            doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('PERFORMANCE INTELLIGENCE', M + 8, currentY + 8);
            
            currentY += 20;

            const renderAdviceSection = (title: string, items: string[], color: [number,number,number]) => {
                if (currentY > H - 50) { 
                    doc.addPage(); 
                    currentY = 25; 
                }
                
                // Section Title with underline
                doc.setTextColor(color[0], color[1], color[2]);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text(title, M, currentY);
                doc.setDrawColor(color[0], color[1], color[2]);
                doc.setLineWidth(0.5);
                doc.line(M, currentY + 2, M + 40, currentY + 2);
                currentY += 15;

                doc.setTextColor(slate900[0], slate900[1], slate900[2]);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');

                items.forEach(point => {
                    const lines = doc.splitTextToSize(point, W - M * 2 - 15);
                    if (currentY + (lines.length * 7) > H - 25) {
                        doc.addPage();
                        currentY = 25;
                    }
                    // Bullet decoration
                    doc.setFillColor(color[0], color[1], color[2]);
                    doc.circle(M + 3, currentY - 3.5, 1, 'F');
                    
                    doc.text(lines, M + 9, currentY);
                    currentY += (lines.length * 7) + 4;
                });
                currentY += 12;
            };

            // DYNAMIC: TIME MANAGEMENT
            const timeSeconds = (s: string) => {
                const parts = s.split(' ');
                let total = 0;
                parts.forEach(p => {
                    if (p.includes('m')) total += parseInt(p) * 60;
                    else if (p.includes('s')) total += parseInt(p);
                });
                return total;
            };
            const timeVal = timeSeconds(userData.stats.timeSpent);

            const timeAdvice = [];
            if (timeVal > 100) {
                timeAdvice.push("Your average response time is currently high. This indicates conceptual hesitation. Action: Practice 45-second flashcard drills for basic definitions to build split-second recognition.");
                timeAdvice.push("You are likely re-reading questions. Use the 'Key Word Circle' method—locate the 'NOT', 'EXCEPT', or 'ALWAYS' immediately to avoid trap-answers.");
            } else if (timeVal < 45) {
                timeAdvice.push("Your speed is high, but check your accuracy correlate. If accuracy < 80%, you are being impulsive. Slow down by exactly 10 seconds per question to verify your calculation.");
            } else {
                timeAdvice.push("Pacing is optimal. Maintain this rhythm by integrating 'timed blocks' of 20 questions into your daily routine.");
            }
            renderAdviceSection("I. PACING & TIME MANAGEMENT", timeAdvice, brand);

            // DYNAMIC: SUBJECT FOCUS
            const weakSubjs = sortedSubjects.filter(s => parseFloat(s.accuracy) < 65);
            const strongSubjs = sortedSubjects.filter(s => parseFloat(s.accuracy) >= 80);

            if (weakSubjs.length > 0) {
                const weakTips = weakSubjs.map(s => `Immediate Focus: ${s.subject}. Your current ${s.accuracy}% accuracy is the primary drag on your global percentile. Re-study the foundational 'Mastery topics' first.`);
                weakTips.push("Allocate 60% of your upcoming week to these areas. Do not start new mocks until these hit the 65% benchmark.");
                renderAdviceSection("II. CRITICAL SUBJECT INTERVENTION", weakTips, rose);
            }

            if (strongSubjs.length > 0) {
                const strongTips = strongSubjs.map(s => `Maintain Edge: ${s.subject}. You are a master here. Keep this sharp with a 'Quick 15' (15 hardest questions) every 48 hours.`);
                renderAdviceSection("III. STRENGTH PRESERVATION", strongTips, emerald);
            }

            // MASSIVE INTEL - DYNAMICALLY SIZED BLOCKS
            const masterIntel = [
                "COGNITIVE LOAD: Your brain has finite RAM. When stuck, write down known variables immediately to clear mental space.",
                "ELIMINATION LOGIC: Never search for the RIGHT answer. Search for why 4 options are WRONG. It is scientifically more robust under pressure.",
                "SPACED REPETITION: Your 'Mistake Log' (last 100 missed questions) is your bible. Review it every night before sleep for maximum consolidation.",
                "STRESS REFLEX: If you feel panic at question 40, stop for 5 seconds. Do one deep box-breath. This 'resets' the prefrontal cortex.",
                "THE FEYNMAN TEST: If you can't explain why a Biology answer is correct to a 10-year-old, you don't actually know the concept—you've just memorized a pattern.",
                "NUTRITION: Slow-release carbs only. Avoid sugar-spikes during 3-hour mock sessions. Your brain needs stable glucose for logical stamina.",
                "THE FINAL 14 DAYS: Week 1 is for 'Rescue' subjects. Week 2 is for 'Confidence Building' with strong subjects. No mocks in the final 48 hours."
            ];
            renderAdviceSection("IV. THE TACTICAL MASTERY PROTOCOL", masterIntel, brandDark);
            
            // V. TOPIC-SPECIFIC MASTERY BLUEPRINTS (Hyperspecific)
            const topicAdvice = [];
            const sortedTopics = [...userData.topicMastery].sort((a,b) => a.accuracy_percentage - b.accuracy_percentage);
            const worstTopics = sortedTopics.filter(t => t.total_answered > 5).slice(0, 3);
            const bestTopics = sortedTopics.filter(t => t.total_answered > 5).slice(-3).reverse();

            if (worstTopics.length > 0) {
                worstTopics.forEach(t => {
                    topicAdvice.push(`RESCUE OPERATION: ${t.topic} (${t.accuracy_percentage}%). You are losing significant points here due to fundamental misinterpretation. ACTION: Stop practicing questions for this topic immediately. Re-read the primary theory source for 45 minutes, then attempt only 'Level 1' questions until you hit 5 consecutive correct answers.`);
                });
            }
            if (bestTopics.length > 0) {
                bestTopics.forEach(t => {
                    topicAdvice.push(`LEVERAGE STRENGTH: ${t.topic} (${t.accuracy_percentage}%). This is your tactical anchor. Use this topic as a 'confidence booster' during the first 10 minutes of your mock exams to stabilize your heart rate and cognitive flow.`);
                });
            }
            if (topicAdvice.length > 0) {
                renderAdviceSection("V. TOPIC-SPECIFIC STRATEGIC BLUEPRINTS", topicAdvice, slate900);
            }

            // FINAL PAGE
            doc.addPage();
            currentY = H / 2 - 60;
            doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
            doc.roundedRect(M, currentY, W - M * 2, 80, 5, 5, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(28);
            doc.setFont('helvetica', 'bold');
            doc.text('THE VERDICT:', W / 2, currentY + 25, { align: 'center' });
            doc.setFontSize(32);
            doc.text('YOU ARE READY.', W / 2, currentY + 45, { align: 'center' });
            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text('Data-driven preparation wins every time.', W / 2, currentY + 65, { align: 'center' });

            const finalPgs = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= finalPgs; i++) {
                doc.setPage(i);
                addFooter(i, finalPgs);
            }

            doc.save(`Italostudy_Performance_Report_${userData.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
            toast.success("Performance Report Generated!");
            setIsOpen(false);
        } catch (error) {
            console.error("PDF Fail:", error);
            toast.error("Failed to generate premium report.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2 rounded-2xl border-indigo-100 hover:bg-indigo-50">
                        <TrendingUp className="w-4 h-4" />
                        Download Report
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-8">
                <DialogHeader>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                        <Award className="w-6 h-6 text-indigo-600" />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight">Download Report</DialogTitle>
                    <DialogDescription className="text-slate-500 font-medium">
                        Personalized blueprint based on your live performance data.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Focus Subjects</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {userData.subjectData.map((s) => (
                                <div 
                                    key={s.subject} 
                                    className={`flex items-center space-x-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                                        selectedSubjects.includes(s.subject) 
                                        ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                                        : 'bg-white border-slate-100 hover:border-slate-200'
                                    }`}
                                    onClick={() => toggleSubject(s.subject)}
                                >
                                    <Checkbox 
                                        id={s.subject} 
                                        checked={selectedSubjects.includes(s.subject)}
                                        onCheckedChange={() => toggleSubject(s.subject)}
                                        className="rounded-lg data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                    />
                                    <label
                                        htmlFor={s.subject}
                                        className="text-xs font-bold text-slate-700 leading-none flex-1 cursor-pointer"
                                    >
                                        {s.subject}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        <div className="grid gap-1.5 leading-none cursor-pointer" onClick={() => setIncludeMocks(!includeMocks)}>
                            <label htmlFor="mocks" className="text-sm font-black text-slate-700 cursor-pointer">
                                Include Mock Analysis
                            </label>
                            <p className="text-[11px] text-slate-400 font-medium">
                                Cross-references mock trends with topics.
                            </p>
                        </div>
                        <Checkbox 
                            id="mocks" 
                            checked={includeMocks} 
                            onCheckedChange={(checked) => setIncludeMocks(checked as boolean)}
                            className="ml-auto w-5 h-5 rounded-lg data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                    </div>
                </div>

                <DialogFooter className="sm:justify-center">
                    <Button 
                        onClick={generatePDF} 
                        disabled={isGenerating || selectedSubjects.length === 0}
                        className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-8 font-black uppercase tracking-widest h-14 relative overflow-hidden group shadow-xl shadow-indigo-500/20"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Generating Report...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-5 w-5" />
                                DOWNLOAD REPORT
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
