import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReportModalProps {
  targetId: string;
  targetType: 'question' | 'answer';
  targetPreview: string;
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

const REASONS = [
  "Scam or Spam",
  "Incorrect Information",
  "Harassment or Hate Speech",
  "Inappropriate Content",
  "Off-topic",
  "Other"
];

export function ReportModal({ targetId, targetType, targetPreview, user, onClose, onSuccess }: ReportModalProps) {
  const [reason, setReason] = useState(REASONS[0]);
  const [customNote, setCustomNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('qa_reports').insert({
        reporter_id: user.id,
        target_id: targetId,
        target_type: targetType,
        reason,
        custom_note: customNote.trim() || null,
        target_preview: targetPreview.substring(0, 200) + (targetPreview.length > 200 ? '...' : '')
      });
      if (error) throw error;
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440, boxShadow: "0 20px 40px rgba(0,0,0,0.2)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Report Content 🚩</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, padding: 0, cursor: "pointer", color: "#64748b", lineHeight: 1 }}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Content Preview</label>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#64748b", fontStyle: "italic", maxHeight: 80, overflowY: "auto" }}>
              "{targetPreview}"
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Reason for reporting</label>
            <select 
              value={reason} onChange={e => setReason(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, outline: "none", background: "#fff" }}
            >
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 8 }}>Additional Context (Optional)</label>
            <textarea 
              value={customNote} onChange={e => setCustomNote(e.target.value)}
              placeholder="Provide any details to help our admins investigate..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, minHeight: 80, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 16px", background: "none", border: "1px solid #cbd5e1", borderRadius: 8, color: "#475569", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: "10px 20px", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
