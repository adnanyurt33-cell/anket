document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const surveyId = urlParams.get('id');
    const content = document.getElementById('survey-content');

    if (!surveyId) {
        content.innerHTML = '<div style="text-align:center; padding: 3rem;"><h3>Geçersiz Link</h3><p>Anket bulunamadı.</p></div>';
        return;
    }

    // Demo Mode handling
    if (surveyId.startsWith('demo-')) {
        const allDemoQs = JSON.parse(localStorage.getItem('demo_questions') || '{}');
        const sData = allDemoQs[surveyId];
        if (!sData) {
            content.innerHTML = '<div style="text-align:center; padding: 3rem;"><h3>Geçersiz Demo Linki</h3><p>Anket bulunamadı.</p></div>';
            return;
        }
        renderSurvey(surveyId, sData.title, sData.requireName, sData.questions, true);
        return;
    }

    if (!window.supabaseClient) {
        content.innerHTML = '<div style="text-align:center; padding: 3rem;"><h3>Hata</h3><p>Bağlantı eksik.</p></div>';
        return;
    }

    // Fetch Survey Data
    const { data: survey, error: sErr } = await window.supabaseClient
        .from('surveys')
        .select('*')
        .eq('id', surveyId)
        .single();

    if (sErr || !survey || survey.status !== 'active') {
        content.innerHTML = '<div style="text-align:center; padding: 3rem;"><h3>Anket Bulunamadı veya Sona Erdi</h3></div>';
        return;
    }

    // Fetch Questions
    const { data: questions, error: qErr } = await window.supabaseClient
        .from('questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_num', { ascending: true });

    if (qErr) {
        content.innerHTML = '<div style="text-align:center; padding: 3rem;"><h3>Sorular yüklenirken hata oluştu.</h3></div>';
        return;
    }

    renderSurvey(survey.id, survey.title, survey.require_name, questions, false);

    function renderSurvey(id, title, requireName, questions, isDemo) {
        let html = `
            <div class="survey-header">
                <h1>${title}</h1>
            </div>
            <form id="survey-form">
        `;

        if (requireName) {
            html += `
                <div class="survey-question">
                    <h3>Adınız Soyadınız <span style="color:red">*</span></h3>
                    <input type="text" id="resp-name" required placeholder="Lütfen adınızı girin" class="survey-input">
                </div>
            `;
        }

        questions.forEach(q => {
            // Geriye dönük uyumluluk: eski anketler isRequired desteklemiyordu
            const isReq = q.isRequired !== undefined ? q.isRequired : true;
            const reqLabel = isReq ? '<span style="color:red">*</span>' : '<span style="font-size:0.875rem; color:var(--text-muted); font-weight:normal; margin-left:0.5rem;">(İsteğe Bağlı)</span>';
            const reqAttr = isReq ? 'required' : '';

            html += `
                <div class="survey-question">
                    <h3 style="margin-bottom:0.5rem;">${q.question_text} ${reqLabel}</h3>
            `;
            
            // Soru resmi varsa
            if (q.image) {
                html += `<div style="margin-bottom:1rem;"><img src="${q.image}" style="max-width:100%; border-radius:8px; border:1px solid #e2e8f0; max-height:300px;"></div>`;
            }
            
            // Şıkları parse et (Geriye dönük uyumluluk string array olabilir)
            let options = [];
            if (q.options) {
                if (typeof q.options === 'string') {
                    options = JSON.parse(q.options).map(o => ({ text: o, image: '' }));
                } else if (Array.isArray(q.options)) {
                    options = q.options.map(o => {
                        return typeof o === 'string' ? { text: o, image: '' } : o;
                    });
                }
            }

            if (q.type === 'textarea') {
                html += `<textarea data-qid="${q.id}" rows="4" ${reqAttr} class="survey-input"></textarea>`;
            } else if (q.type === 'text') {
                html += `<input type="text" data-qid="${q.id}" ${reqAttr} class="survey-input">`;
            } else if (q.type === 'select') {
                html += `<select data-qid="${q.id}" ${reqAttr} class="survey-input" style="cursor:pointer;">
                            <option value="">-- Seçiniz --</option>`;
                options.forEach(opt => {
                    html += `<option value="${opt.text}">${opt.text}</option>`;
                });
                html += `</select>`;
            } else if (q.type === 'radio') {
                html += `<div class="radio-group" style="display:flex; flex-direction:column; gap:0.75rem;">`;
                options.forEach((opt) => {
                    html += `
                        <label style="display:flex; align-items:center; gap:0.75rem; cursor:pointer; font-size:1.125rem; padding: 0.5rem; border: 1px solid transparent; border-radius: 6px;">
                            <input type="radio" name="q_${q.id}" value="${opt.text}" ${reqAttr} style="transform:scale(1.2);">
                            ${opt.image ? `<img src="${opt.image}" style="height:40px; border-radius:4px; border:1px solid #e2e8f0;">` : ''}
                            <span>${opt.text}</span>
                        </label>
                    `;
                });
                html += `</div>`;
            } else if (q.type === 'checkbox') {
                html += `<div class="checkbox-group" style="display:flex; flex-direction:column; gap:0.75rem;" data-req="${isReq}">`;
                options.forEach((opt) => {
                    html += `
                        <label style="display:flex; align-items:center; gap:0.75rem; cursor:pointer; font-size:1.125rem; padding: 0.5rem; border: 1px solid transparent; border-radius: 6px;">
                            <input type="checkbox" name="q_${q.id}" value="${opt.text}" class="chk-${q.id}" style="transform:scale(1.2);">
                            ${opt.image ? `<img src="${opt.image}" style="height:40px; border-radius:4px; border:1px solid #e2e8f0;">` : ''}
                            <span>${opt.text}</span>
                        </label>
                    `;
                });
                html += `</div>`;
            }
            
            html += `</div>`;
        });

        html += `
            <button type="submit" class="btn btn-primary btn-block" style="font-size: 1.125rem; padding: 1rem;" id="submit-btn">
                Anketi Tamamla ve Gönder
            </button>
            </form>
        `;

        content.innerHTML = html;

        document.getElementById('survey-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Checkbox validation (zorunluysa en az 1 tane seçilmeli)
            let checkValid = true;
            questions.forEach(q => {
                const isReq = q.isRequired !== undefined ? q.isRequired : true;
                if (q.type === 'checkbox' && isReq) {
                    const checked = document.querySelectorAll(`input.chk-${q.id}:checked`);
                    if (checked.length === 0) {
                        checkValid = false;
                    }
                }
            });

            if (!checkValid) {
                alert('Lütfen tüm zorunlu çoklu seçim (checkbox) sorularından en az bir şık seçin.');
                return;
            }

            const btn = document.getElementById('submit-btn');
            btn.disabled = true;
            btn.innerHTML = 'Gönderiliyor...';

            const respName = requireName ? document.getElementById('resp-name').value : 'Anonim';
            
            if (isDemo) {
                const surveys = JSON.parse(localStorage.getItem('demo_surveys') || '[]');
                const s = surveys.find(x => x.id === id);
                if (s) {
                    s.responses += 1;
                    localStorage.setItem('demo_surveys', JSON.stringify(surveys));
                }
                showSuccess();
                return;
            }

            const { data: responseData, error: rErr } = await window.supabaseClient
                .from('responses')
                .insert([{ survey_id: id, respondent_name: respName }])
                .select()
                .single();

            if (rErr) { alert('Hata: ' + rErr.message); btn.disabled=false; btn.innerHTML='Tekrar Dene'; return; }

            const answers = [];
            questions.forEach(q => {
                let ansText = '';
                if (q.type === 'radio') {
                    const checked = document.querySelector(`input[name="q_${q.id}"]:checked`);
                    if (checked) ansText = checked.value;
                } else if (q.type === 'checkbox') {
                    const checked = document.querySelectorAll(`input.chk-${q.id}:checked`);
                    const vals = Array.from(checked).map(c => c.value);
                    if (vals.length > 0) ansText = vals.join(', ');
                } else {
                    const el = document.querySelector(`[data-qid="${q.id}"]`);
                    if (el) ansText = el.value;
                }
                
                if (ansText) {
                    answers.push({
                        response_id: responseData.id,
                        question_id: q.id,
                        answer_text: ansText
                    });
                }
            });

            if (answers.length > 0) {
                await window.supabaseClient.from('response_answers').insert(answers);
            }

            showSuccess();
        });
    }

    function showSuccess() {
        content.innerHTML = `
            <div class="success-screen">
                <i class="ri-checkbox-circle-fill"></i>
                <h2>Teşekkürler!</h2>
                <p style="color: var(--text-muted); margin-top: 1rem;">Yanıtınız başarıyla kaydedildi. Sayfayı kapatabilirsiniz.</p>
            </div>
        `;
    }
});
