import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Smartphone, ShieldCheck, Key, Download } from 'lucide-react';

interface MFAGuideProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function MFAGuide({ open, onOpenChange }: MFAGuideProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 lg:p-10">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight text-center uppercase">MFA Setup Guide</DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center pb-6">
                        Secure your mission with factor authentication
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="flex gap-4 p-4 bg-slate-50 dark:bg-muted rounded-2xl border border-slate-100 dark:border-border">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                            <Download className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-1">1. Download App</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                                Install Google Authenticator, Authy, or Microsoft Authenticator from your app store.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-4 bg-slate-50 dark:bg-muted rounded-2xl border border-slate-100 dark:border-border">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                            <Smartphone className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-1">2. Scan QR Code</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                                Open the app and select "Scan a QR code". Point your camera at the code displayed in setup.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 p-4 bg-slate-50 dark:bg-muted rounded-2xl border border-slate-100 dark:border-border">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                            <Key className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-1">3. Enter Code</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                                The app will generate a 6-digit code. Enter it back here to verify your device.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Security Protocol</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold leading-relaxed mb-4">
                            Once enabled, you will be required to enter a code from your mobile device every time you sign in to Italostudy.
                        </p>
                        <div className="pt-4 border-t border-emerald-100/50 dark:border-emerald-900/30">
                            <h5 className="text-[9px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest mb-1">Troubleshooting: Code Rejected?</h5>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                                Most issues are caused by **Time Mismatch**. Ensure your mobile clock is set to "**Set Automatically**" in system settings.
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
