// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendTelegramMessage(chatId: number, text: string) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error("FATAL: TELEGRAM_BOT_TOKEN is missing in environment!");
        return;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: "Markdown",
            }),
        });

        const respText = await response.text();
        if (!response.ok) {
            console.error(`Telegram API Error (${response.status}):`, respText);
        } else {
            console.log("Message sent successfully.");
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

serve(async (req: Request) => {
    try {
        // Log setup status
        console.log("Function invoked. Token present:", !!TELEGRAM_BOT_TOKEN);

        // DEBUG: Return status to caller to verify secrets
        if (!TELEGRAM_BOT_TOKEN) {
            return new Response(JSON.stringify({
                error: "MISSING_SECRET",
                message: "TELEGRAM_BOT_TOKEN is not set in Supabase Secrets."
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        const update = await req.json();
        console.log("Received Update:", JSON.stringify(update));

        if (!update.message || !update.message.text) {
            console.log("Ignored: No text message.");
            return new Response("ok");
        }

        const chatId = update.message.chat.id;
        const text = update.message.text.trim();

        console.log(`Processing message: "${text}" from ${chatId}`);

        // Helper to check plan status and expiry
        const getProfile = async (id: number) => {
            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("telegram_chat_id", id)
                .single();
            return data;
        };

        const checkAccess = (profile: any) => {
            if (!profile) return { active: false, msg: "❓ *Unknown User*\n\nYour account is not linked yet. Please start from the website." };

            const isGlobal = profile.selected_plan?.toLowerCase() === 'global' ||
                profile.selected_plan?.toLowerCase() === 'elite' ||
                profile.subscription_tier?.toLowerCase() === 'global' ||
                profile.subscription_tier?.toLowerCase() === 'elite';

            const expiryDate = profile.subscription_expiry_date;
            const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;

            if (!isGlobal) {
                return {
                    active: false,
                    msg: `⚠️ *Standard Plan*\n\nYour current plan (${profile.selected_plan || 'Free'}) does not support Telegram bot commands.\n\nUpdate to Global Admission for full access: https://italostudy.com/pricing`
                };
            }

            if (isExpired) {
                return {
                    active: false,
                    msg: `🔔 *Plan Expired*\n\nYour Global Admission plan has expired. To continue receiving seat alerts and using bot commands, please renew your plan: https://italostudy.com/pricing`
                };
            }

            return { active: true };
        };

        // --- COMMAND: /start ---
        if (text.startsWith("/start")) {
            const parts = text.split(" ");

            // 1. Direct Start (No Token)
            if (parts.length === 1) {
                // Check if already linked
                const { data: existingLink } = await supabase
                    .from("profiles")
                    .select("id, full_name, display_name")
                    .eq("telegram_chat_id", chatId)
                    .maybeSingle();

                if (existingLink) {
                    await sendTelegramMessage(chatId, `✅ *Account Connected*\n\nYou are already linked as *${existingLink.display_name || existingLink.full_name || 'User'}*.\n\nUse /track to manage alerts or /billing to check your plan.`);
                } else {
                    await sendTelegramMessage(chatId, "👋 Welcome to ItaloStudy Bot!\n\nThis bot is your personal assistant for CEnT-S Seat Tracking.\n\nTo activate it, please go to your Dashboard on the website and click the Telegram button.");
                }
                return new Response("ok");
            }

            // 2. Start with Token (Linking)
            const token = parts[1];

            // Find user by token
            const { data: profile, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("telegram_verification_token", token)
                .single();

            if (error || !profile) {
                console.error("Token lookup failed:", error);
                await sendTelegramMessage(chatId, "❌ Invalid Token\n\nThis link seems to be expired or invalid. Please get a new link from your ItaloStudy Dashboard.");
                return new Response("ok");
            }

            // First check if this chatId is already linked to another account
            const { data: existingLink } = await supabase
                .from("profiles")
                .select("id")
                .eq("telegram_chat_id", chatId)
                .neq("id", profile.id)
                .maybeSingle();

            if (existingLink) {
                await sendTelegramMessage(chatId, "⚠️ *Account Already Linked*\n\nThis Telegram account is already connected to another ItaloStudy user. Please unlink it from the other account first.");
                return new Response("ok");
            }

            // Link the telegram_chat_id
            const { error: updateError } = await supabase
                .from("profiles")
                .update({
                    telegram_chat_id: chatId,
                    telegram_verification_token: null // Clear token after use
                })
                .eq("id", profile.id);

            if (updateError) {
                console.error("Link Update Error:", updateError);
                await sendTelegramMessage(chatId, `❌ *System Error*\n\nCould not link account: ${updateError.message}\n\nPlease contact support with this error.`);
                return new Response("ok");
            }

            // Check plan status - Global plan gives full access
            const isGlobal = profile.subscription_tier?.toLowerCase() === 'global' ||
                profile.subscription_tier?.toLowerCase() === 'elite' ||
                profile.selected_plan?.toLowerCase() === 'global' ||
                profile.selected_plan?.toLowerCase() === 'elite';

            if (isGlobal) {
                await sendTelegramMessage(chatId, `✅ Success! Your ItaloStudy account is linked.\n\n🌟 Plan: Global Admission\n📡 Status: Scanning for seats...\n\nSit back and relax. I'll text you the moment a seat opens up!`);

                // Give immediate value: Send current available seats if any
                const { data: currentSlots } = await supabase
                    .from("cent_exam_slots")
                    .select("*")
                    .eq("seats_available", true)
                    .order("test_date", { ascending: true })
                    .limit(5);

                if (currentSlots && currentSlots.length > 0) {
                    let welcomeMsg = "📑 *Current Available Seats:*\n\n";
                    currentSlots.forEach(s => {
                        const emoji = s.location.includes("@CASA") ? "🏠" : "🏛️";
                        welcomeMsg += `${emoji} *${s.university}*\n📅 ${new Date(s.test_date).toLocaleDateString('it-IT')} | 🏙️ ${s.city}\n\n`;
                    });
                    welcomeMsg += "⚡ [Book Now](https://testcisia.it/studenti_tolc/login_sso.php)";
                    await sendTelegramMessage(chatId, welcomeMsg);
                }
            } else {
                await sendTelegramMessage(chatId, `✅ Account Linked!\n\n⚠️ Note: You are currently on the ${profile.selected_plan || 'Free'} plan.\n\nTo get automated Seat Alerts, you need the Global Plan.\nUpgrade here: https://italostudy.com/pricing`);
            }
            return new Response("ok");
        }

        // --- COMMAND: /unlink ---
        if (text === "/unlink") {
            const { error: unlinkError } = await supabase
                .from("profiles")
                .update({ telegram_chat_id: null })
                .eq("telegram_chat_id", chatId);

            if (unlinkError) {
                console.error("Unlink Error:", unlinkError);
                await sendTelegramMessage(chatId, "❌ *System Error*\n\nCould not unlink account. Please try again later.");
            } else {
                await sendTelegramMessage(chatId, "🔓 *Disconnected*\n\nYour Telegram account has been unlinked from ItaloStudy. You will no longer receive seat alerts here.");
            }
            return new Response("ok");
        }

        // --- AUTHENTICATED COMMANDS CHECK ---
        const profile = await getProfile(chatId);
        const access = checkAccess(profile);

        if (!access.active) {
            await sendTelegramMessage(chatId, access.msg);
            return new Response("ok");
        }

        // --- COMMAND: /billing ---
        if (text === "/billing" || text === "/plan") {
            const plan = profile.selected_plan || "Free";
            await sendTelegramMessage(chatId, `💳 Your Billing Info\n\n👤 Name: ${profile.display_name || profile.full_name || 'Student'}\n📧 Email: ${profile.email || 'Hidden'}\n🏷️ Current Plan: ${plan.toUpperCase()}\n\nManage Subscription: https://italostudy.com/billing`);
            return new Response("ok");
        }

        // --- COMMAND: /slots ---
        if (text === "/slots") {
            const { data: slots, error } = await supabase
                .from("cent_exam_slots")
                .select("*")
                .eq("seats_available", true)
                .order("test_date", { ascending: true })
                .limit(10);

            if (error || !slots || slots.length === 0) {
                await sendTelegramMessage(chatId, "📭 No seats currently available in the database.\n\nKeep tracking on! I'll alert you the moment one opens.");
                return new Response("ok");
            }

            let msg = "🎯 *Available CENT Slots*\n\n";
            slots.forEach(s => {
                const emoji = s.location.includes("@CASA") ? "🏠" : "🏛️";
                const date = new Date(s.test_date).toLocaleDateString('en-GB');
                msg += `${emoji} *${s.university}*\n📅 ${date} | 🏙️ ${s.city}\n📍 ${s.location}\n\n`;
            });
            msg += "⚡ [Book Now](https://testcisia.it/studenti_tolc/login_sso.php)";

            await sendTelegramMessage(chatId, msg);
            return new Response("ok");
        }

        // --- COMMAND: /track ---
        if (text.startsWith("/track")) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("track_cent_uni, track_cent_casa")
                .eq("telegram_chat_id", chatId)
                .single();

            if (!profile) {
                await sendTelegramMessage(chatId, "❓ User not found. Link your account first.");
                return new Response("ok");
            }

            const parts = text.split(" ");
            if (parts.length > 1) {
                const subCommand = parts[1].toLowerCase();
                const update = {};
                if (subCommand === "uni") update.track_cent_uni = !profile.track_cent_uni;
                if (subCommand === "casa") update.track_cent_casa = !profile.track_cent_casa;

                if (Object.keys(update).length > 0) {
                    await supabase.from("profiles").update(update).eq("telegram_chat_id", chatId);
                    const type = subCommand === "uni" ? "University (UNI)" : "Home (CASA)";
                    const status = update[Object.keys(update)[0]] ? "ENABLED ✅" : "DISABLED ❌";
                    await sendTelegramMessage(chatId, `Updated! Tracking for ${type} is now ${status}`);
                    return new Response("ok");
                }
            }

            const uniStatus = profile.track_cent_uni ? "✅ Enabled" : "❌ Disabled";
            const casaStatus = profile.track_cent_casa ? "✅ Enabled" : "❌ Disabled";

            await sendTelegramMessage(chatId, `⚙️ *Tracking Preferences*\n\n🏛️ CENT@UNI: ${uniStatus}\n🏠 CENT@CASA: ${casaStatus}\n\nTo toggle, send:\n/track uni\n/track casa`);
            return new Response("ok");
        }

        // --- COMMAND: /unlink ---
        if (text === "/unlink") {
            const { error: unlinkError } = await supabase
                .from("profiles")
                .update({ telegram_chat_id: null })
                .eq("telegram_chat_id", chatId);

            if (unlinkError) {
                console.error("Unlink Error:", unlinkError);
                await sendTelegramMessage(chatId, "❌ *System Error*\n\nCould not unlink account. Please try again later.");
            } else {
                await sendTelegramMessage(chatId, "🔓 *Disconnected*\n\nYour Telegram account has been unlinked from ItaloStudy. You will no longer receive seat alerts here.");
            }
            return new Response("ok");
        }

        // --- COMMAND: /help ---
        if (text === "/help") {
            await sendTelegramMessage(chatId, `🤖 *ItaloStudy Bot Help*

/start - Connect your account
/slots - View current available seats
/track - Manage tracking preferences
/billing - Check your plan status
/unlink - Disconnect your account
/help - Show this menu`);
            return new Response("ok");
        }

        // --- FALLBACK ---
        await sendTelegramMessage(chatId, "I didn't understand that command. Try /help.");

        return new Response("ok");

    } catch (error) {
        console.error("CRITICAL BOT ERROR:", error);
        return new Response("error", { status: 500 });
    }
});
