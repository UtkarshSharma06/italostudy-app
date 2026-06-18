const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://jyjhpqtqbwtxxgijxetq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5amhwcXRxYnd0eHhnaWp4ZXRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYxODI2NSwiZXhwIjoyMDgzMTk0MjY1fQ.1Z-cIYE7f8tY_KCzzsN6viXONOg_x6duW_umpAsCVWE');
async function test() {
    const { data, error } = await supabase.from('coupons').select('*').limit(1);
    console.log(data, error);
}
test();
