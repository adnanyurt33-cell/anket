// Lütfen kendi Supabase projenizin bilgilerini buraya girin.
const SUPABASE_URL = 'https://setcvlvapnpulehkponp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iRjtS6WDQc8IYDawJvx6-A_AXji42Qj';

window.supabaseClient = null;

if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && window.supabase) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Admin ID Üretimi (Local Storage)
window.getAdminId = () => {
    let adminId = localStorage.getItem('survey_admin_id');
    if (!adminId) {
        // Rastgele UUID
        adminId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem('survey_admin_id', adminId);
    }
    return adminId;
};

// Demo Modu
window.isDemoMode = () => {
    return !window.supabaseClient;
};

// Demo Modu Başlatma (Bomboş olacak şekilde güncellendi)
window.setDemoMode = (active) => {
    localStorage.setItem('demo_mode', active ? 'true' : 'false');
    if (active && !localStorage.getItem('demo_surveys')) {
        localStorage.setItem('demo_surveys', JSON.stringify([]));
    }
};

// Uygulama ilk açılışta demo verilerini temiz bir şekilde hazırlasın
if (!localStorage.getItem('demo_surveys')) {
    window.setDemoMode(true);
}
