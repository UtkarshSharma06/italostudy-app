// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CALENDAR_URL = "https://testcisia.it/calendario.php?tolc=cents&lingua=inglese";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
};

interface SeatInfo {
    modality: string;
    university: string;
    region: string;
    state: string;
    city: string;
    registrationDeadline: string;
    seats: string;
    status: string;
    testDate: string;
}

// Convert DD/MM/YYYY text date to ISO format for Postgres
function parseItalianDate(dateStr: string): string | null {
    if (!dateStr || dateStr === '---' || dateStr.includes('TBD')) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    // Parts: [DD, MM, YYYY]
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

async function broadcastAlert(seatInfo: SeatInfo): Promise<number> {
    const isCasa = seatInfo.modality.includes("@CASA");
    const isUni = seatInfo.modality.includes("@UNI");
    const emoji = isCasa ? "🏠" : "🏛️";
    const typeLabel = isCasa ? "CENT@CASA (Home)" : "CENT@UNI (University)";

    // Fetch subscribers based on their plan AND their preferences
    // Plans: Global or Elite (ilike matches with wildcards)
    // Preference: track_cent_uni or track_cent_casa based on modality
    // Also ensures subscription is NOT expired
    let query = supabase
        .from('profiles')
        .select('telegram_chat_id, full_name, selected_plan, subscription_tier, subscription_expiry_date')
        .not('telegram_chat_id', 'is', null)
        .or('selected_plan.ilike.%global%,selected_plan.ilike.%elite%,subscription_tier.ilike.%global%,subscription_tier.ilike.%elite%')
        .or(`subscription_expiry_date.gt.${new Date().toISOString()},subscription_expiry_date.is.null`);

    if (isCasa) query = query.eq('track_cent_casa', true);
    if (isUni) query = query.eq('track_cent_uni', true);

    const { data: subscribers, error } = await query;

    if (error) {
        console.error("Error fetching subscribers:", error);
        return 0;
    }

    if (!subscribers || subscribers.length === 0) {
        console.log(`No subscribers found for ${seatInfo.modality} (Casa: ${isCasa}, Uni: ${isUni})`);
        return 0;
    }

    const statusEmoji = parseInt(seatInfo.seats) <= 10 ? "🟠" : "🟢";
    const telegramMessage = `🎯 *SEAT AVAILABLE!* ${emoji} ${statusEmoji}
    
📍 *Type:* ${typeLabel}
🏛️ *University:* ${seatInfo.university}
📍 *City:* ${seatInfo.city} (${seatInfo.region})
📅 *Test Date:* ${seatInfo.testDate}
⏰ *Deadline:* ${seatInfo.registrationDeadline}
💺 *Seats:* *${seatInfo.seats}*

⚡ *Action:* [Book Now](https://testcisia.it/studenti_tolc/login_sso.php)

_Sent via ItaloStudy Seat Monitor_`.replace(/^\s+/gm, '');

    console.log(`Broadcasting alert for ${seatInfo.university} on ${seatInfo.testDate} to ${subscribers.length} users...`);

    // Send Telegram alerts
    const results = await Promise.allSettled(
        subscribers.map(user =>
            fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: user.telegram_chat_id,
                    text: telegramMessage,
                    parse_mode: "Markdown"
                })
            })
        )
    );

    // Create website notification for global visibility
    await supabase.from('site_notifications').insert({
        title: `🎯 ${isCasa ? 'Home' : 'Uni'} Seat Available: ${seatInfo.city}`,
        short_description: `${seatInfo.university} - ${seatInfo.testDate}`,
        content_html: `
            <div class="seat-alert">
                <p>A seat has just opened up at <strong>${seatInfo.university}</strong> for the test on <strong>${seatInfo.testDate}</strong>.</p>
                <p><strong>Mode:</strong> ${seatInfo.modality}</p>
                <p><a href="https://testcisia.it/studenti_tolc/login_sso.php" target="_blank">Book Now →</a></p>
            </div>
        `,
        exam_type: 'cents',
        is_active: true,
        target_role: 'global'
    });

    return subscribers.length;
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log(`[${new Date().toISOString()}] Starting CENT Seat Scraper...`);
        const { force } = await req.json().catch(() => ({ force: false }));

        // Fetch the calendar
        const response = await fetch(CALENDAR_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const html = await response.text();

        // Parse HTML
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (!doc) throw new Error("Failed to parse HTML");

        const tables = doc.querySelectorAll("table");
        let processedCount = 0;
        let changeCount = 0;

        for (const table of tables) {
            const rows = table.querySelectorAll("tr");
            for (let i = 1; i < rows.length; i++) { // Skip header
                const cells = rows[i].querySelectorAll("td");
                if (cells.length < 8) continue;

                const modality = cells[0].textContent.trim();

                // Track BOTH CENT@UNI and CENT@CASA
                if (!modality.includes("CENT@")) continue;

                const university = cells[1].textContent.trim();
                const region = cells[2].textContent.trim();
                const city = cells[3].textContent.trim();
                const deadlineText = cells[4].textContent.trim();
                const seatsValue = cells[5].textContent.trim();
                const statusText = cells[6].textContent.trim();
                const testDateText = cells[7].textContent.trim();

                // Robust check for "Available" or "Disponibili"
                // Being broad to avoid issues with accents (e.g., DisponibilitÃ ) or English vs Italian
                const lowerStatus = statusText.toLowerCase();
                const isAvailable = (lowerStatus.includes("disponib") || lowerStatus.includes("availabl") || lowerStatus.includes("open")) &&
                    !lowerStatus.includes("esaurit") && !lowerStatus.includes("sold out") && !lowerStatus.includes("close");

                console.log(`Row found: [${modality}] ${university} | Status: ${statusText} | Available: ${isAvailable}`);

                const seatInfo: SeatInfo = {
                    modality, university, region, state: region,
                    city, registrationDeadline: deadlineText, seats: seatsValue,
                    status: statusText, testDate: testDateText
                };

                // Database update logic
                const locationType = modality.includes("@CASA") ? "CENT@CASA" : "CENT@UNI";
                const dbTestDate = parseItalianDate(testDateText);
                const dbDeadline = parseItalianDate(deadlineText);

                if (!dbTestDate) continue;

                // 1. Check existing status
                const { data: existingSlot } = await supabase
                    .from('cent_exam_slots')
                    .select('*')
                    .eq('test_date', dbTestDate)
                    .eq('location', locationType)
                    .eq('university', university)
                    .single();

                // 2. Upsert the current status
                const { data: updatedSlot, error: upsertError } = await supabase
                    .from('cent_exam_slots')
                    .upsert({
                        test_date: dbTestDate,
                        location: locationType,
                        university: university,
                        region: region,
                        city: city,
                        registration_deadline: dbDeadline,
                        seats_available: isAvailable,
                        seats_status: statusText,
                        seats_count: seatsValue,
                        last_checked_at: new Date().toISOString()
                    }, { onConflict: 'test_date, location, university' })
                    .select()
                    .single();

                if (upsertError) {
                    console.error(`Upsert Error for ${university}:`, upsertError);
                    continue;
                } else {
                    console.log(`Successfully updated ${university} (${locationType}) - Available: ${isAvailable}`);
                }

                // 3. Detect Transition: ESAURITI -> DISPONIBILI
                // ALSO trigger if force is true and seat is available
                const statusChangedToAvailable = (isAvailable && (!existingSlot || !existingSlot.seats_available)) || (force && isAvailable);

                if (statusChangedToAvailable) {
                    console.log(`✨ SEAT ALERT TRIGGERED: ${university} on ${testDateText} (${locationType}) - Force: ${force}`);

                    // Log the change in notifications table
                    await supabase.from('cent_slot_notifications').insert({
                        slot_id: updatedSlot.id,
                        previous_status: existingSlot?.seats_status || 'NEW',
                        new_status: statusText,
                        user_count: 0 // Will be updated by broadcast if needed
                    });

                    // Prepare seat info for broadcast
                    const seatInfo: SeatInfo = {
                        modality: locationType,
                        university,
                        region,
                        state: region, // Mapping region to state
                        city,
                        registrationDeadline: deadlineText,
                        seats: seatsValue || (isAvailable ? "Available" : "Full"),
                        status: statusText,
                        testDate: testDateText
                    };

                    // Broadcast immediately
                    await broadcastAlert(seatInfo);
                    changeCount++;
                }

                processedCount++;
            }
        }

        return new Response(JSON.stringify({
            success: true,
            processed: processedCount,
            changes_detected: changeCount,
            timestamp: new Date().toISOString()
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Critical Scraper Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
