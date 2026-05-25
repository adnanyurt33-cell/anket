document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const surveyId = urlParams.get('id');
    const adminId = window.getAdminId();

    if (!surveyId) {
        document.getElementById('loading-area').innerHTML = 'Anket ID bulunamadı.';
        return;
    }

    // Sekme (Tab) Değiştirme Mantığı
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            const target = e.currentTarget.getAttribute('data-target');
            e.currentTarget.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // Veri Çekme ve İşleme
    if (window.isDemoMode()) {
        const surveys = JSON.parse(localStorage.getItem('demo_surveys') || '[]');
        const survey = surveys.find(s => s.id === surveyId);
        if (survey) {
            document.getElementById('survey-title').textContent = survey.title;
            document.getElementById('loading-area').innerHTML = 'Demo modunda detaylı yanıt kaydı tutulmamaktadır. Lütfen Supabase bağlantısını yapın.';
        } else {
            document.getElementById('loading-area').innerHTML = 'Anket bulunamadı.';
        }
        return;
    }

    if (!window.supabaseClient) return;

    try {
        // 1. Anket Bilgisi
        const { data: survey, error: sErr } = await window.supabaseClient
            .from('surveys')
            .select('*')
            .eq('id', surveyId)
            .eq('admin_id', adminId)
            .single();

        if (sErr || !survey) {
            document.getElementById('loading-area').innerHTML = 'Anket bulunamadı veya yetkiniz yok.';
            return;
        }

        document.getElementById('survey-title').textContent = survey.title;

        // 2. Sorular
        const { data: questions } = await window.supabaseClient
            .from('questions')
            .select('*')
            .eq('survey_id', surveyId)
            .order('order_num', { ascending: true });

        // 3. Yanıtlar (Kişiler)
        const { data: responses } = await window.supabaseClient
            .from('responses')
            .select('*')
            .eq('survey_id', surveyId)
            .order('created_at', { ascending: false });

        document.getElementById('total-responses').textContent = responses.length;

        // 4. Yanıt Detayları (Hangi soruya ne denmiş)
        const { data: answers } = await window.supabaseClient
            .from('response_answers')
            .select('*')
            .in('response_id', responses.map(r => r.id));

        document.getElementById('loading-area').style.display = 'none';
        document.getElementById('content-area').style.display = 'block';

        if (responses.length === 0) {
            document.getElementById('tab-individuals').innerHTML = '<div style="padding: 2rem; text-align:center; color:gray;">Henüz hiç yanıt yok.</div>';
            document.getElementById('tab-summary').innerHTML = '<div style="padding: 2rem; text-align:center; color:gray;">Henüz hiç yanıt yok.</div>';
            return;
        }

        // --- KİŞİ BAZLI (Detay) SEKME DOLDURMA ---
        const individualsDiv = document.getElementById('tab-individuals');
        responses.forEach((resp, index) => {
            const card = document.createElement('div');
            card.className = 'response-card';
            
            const date = new Date(resp.created_at).toLocaleString('tr-TR');
            const name = survey.require_name && resp.respondent_name ? resp.respondent_name : `Katılımcı #${responses.length - index}`;

            let html = `
                <div class="response-header">
                    <strong style="font-size: 1.125rem; color: var(--primary);"><i class="ri-user-smile-line"></i> ${name}</strong>
                    <span style="color: var(--text-muted); font-size: 0.875rem;">${date}</span>
                </div>
            `;

            questions.forEach(q => {
                const ans = answers.find(a => a.response_id === resp.id && a.question_id === q.id);
                const answerText = ans ? ans.answer_text : '<i style="color: #cbd5e1;">Boş bırakıldı</i>';
                
                html += `
                    <div class="answer-row">
                        <div class="answer-q">${q.question_text}</div>
                        <div class="answer-a">${answerText}</div>
                    </div>
                `;
            });

            card.innerHTML = html;
            individualsDiv.appendChild(card);
        });

        // --- SORU BAZLI (Özet) SEKME DOLDURMA ---
        const summaryDiv = document.getElementById('tab-summary');
        questions.forEach(q => {
            const card = document.createElement('div');
            card.className = 'summary-card';
            card.innerHTML = `<div class="summary-q">${q.question_text}</div>`;

            const qAnswers = answers.filter(a => a.question_id === q.id);

            if (q.type === 'text' || q.type === 'textarea') {
                // Metin cevapları için liste çıkar (Son 5 cevap veya hepsi)
                const list = document.createElement('div');
                list.style.background = '#f8fafc';
                list.style.padding = '1rem';
                list.style.borderRadius = '6px';
                list.style.maxHeight = '200px';
                list.style.overflowY = 'auto';

                if (qAnswers.length === 0) {
                    list.innerHTML = '<span style="color:gray;">Yanıt yok</span>';
                } else {
                    qAnswers.forEach(a => {
                        list.innerHTML += `<div style="padding: 0.5rem; border-bottom: 1px solid #e2e8f0; font-size:0.95rem;">- ${a.answer_text}</div>`;
                    });
                }
                card.appendChild(list);

            } else if (q.type === 'radio' || q.type === 'select' || q.type === 'checkbox') {
                // Çoktan seçmeliler için istatistik çıkar
                const counts = {};
                qAnswers.forEach(a => {
                    // Checkbox'lar virgülle ayrılmış olabilir "Seçenek 1, Seçenek 2"
                    if (q.type === 'checkbox') {
                        const splitted = a.answer_text.split(',').map(s => s.trim());
                        splitted.forEach(val => {
                            counts[val] = (counts[val] || 0) + 1;
                        });
                    } else {
                        counts[a.answer_text] = (counts[a.answer_text] || 0) + 1;
                    }
                });

                if (Object.keys(counts).length === 0) {
                    card.innerHTML += '<span style="color:gray;">Yanıt yok</span>';
                } else {
                    // Sayılara göre azalan sırada sırala
                    const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                    
                    sortedCounts.forEach(([ansText, count]) => {
                        const percent = Math.round((count / responses.length) * 100);
                        card.innerHTML += `
                            <div class="summary-stat">
                                <span style="flex:1;">${ansText}</span>
                                <span style="font-weight:600; color:var(--primary);">${count} kişi <span style="color:gray; font-size:0.85rem; font-weight:normal;">(%${percent})</span></span>
                            </div>
                            <div style="width:100%; background:#e2e8f0; height:6px; border-radius:3px; margin-bottom:0.5rem;">
                                <div style="width:${percent}%; background:var(--primary); height:6px; border-radius:3px;"></div>
                            </div>
                        `;
                    });
                }
            }

            summaryDiv.appendChild(card);
        });

    } catch (err) {
        document.getElementById('loading-area').innerHTML = 'Hata oluştu: ' + err.message;
    }
});
