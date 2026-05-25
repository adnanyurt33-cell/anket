document.addEventListener('DOMContentLoaded', () => {
    const adminId = window.getAdminId();
    const questionsContainer = document.getElementById('questions-container');
    
    // Resim Sıkıştırma Fonksiyonu (Max 400px genişlik/yükseklik, düşük kalite JPEG)
    function compressImage(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 400;

                if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Kaliteyi %60'a düşürerek boyuttan tasarruf sağla
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
                callback(compressedBase64);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // İlk soruyu ekle
    addQuestionUI();

    document.getElementById('btn-add-question').addEventListener('click', () => addQuestionUI());

    function addQuestionUI(initialData = null) {
        const qDiv = document.createElement('div');
        qDiv.className = 'question-item';
        qDiv.style.flexDirection = 'column';
        qDiv.style.padding = '1.5rem';
        qDiv.style.background = 'white';
        qDiv.style.border = '1px solid var(--border-color)';
        qDiv.style.borderRadius = '8px';
        qDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
        qDiv.style.position = 'relative';

        const qType = initialData ? initialData.type : 'text';
        const qText = initialData ? initialData.question_text : '';
        const qIsRequired = initialData && initialData.isRequired !== undefined ? initialData.isRequired : true;
        const qImage = initialData && initialData.image ? initialData.image : '';
        const qOptions = initialData && initialData.options ? initialData.options : [];

        qDiv.innerHTML = `
            <div style="display:flex; gap:1rem; width:100%; align-items: flex-start; margin-bottom: 0.5rem;">
                <div style="flex:1; display:flex; flex-direction:column; gap:0.5rem;">
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <input type="text" placeholder="Soru metni (Örn: Hangi ürünleri tercih edersiniz?)" class="q-text" required value="${qText}" style="flex:1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size:0.875rem;">
                        <button class="btn btn-outline btn-add-q-img" type="button" style="padding: 0.75rem;" title="Soruya Resim Ekle"><i class="ri-image-add-line"></i></button>
                        <input type="file" class="q-img-input" accept="image/*" style="display:none;">
                    </div>
                    <div class="q-img-preview" style="display:${qImage ? 'block' : 'none'}; position:relative; width: fit-content;">
                        <img src="${qImage}" style="max-height: 100px; border-radius:4px; border: 1px solid #e2e8f0;">
                        <button class="btn-remove-q-img" type="button" style="position:absolute; top:-5px; right:-5px; background:var(--danger); color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; cursor:pointer;"><i class="ri-close-line"></i></button>
                    </div>
                </div>
                <select class="q-type" style="width:230px; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size:0.875rem;">
                    <option value="text" ${qType === 'text' ? 'selected' : ''}>Kısa Yanıt (Metin)</option>
                    <option value="textarea" ${qType === 'textarea' ? 'selected' : ''}>Uzun Yanıt (Paragraf)</option>
                    <option value="radio" ${qType === 'radio' ? 'selected' : ''}>Tekli Seçim (Yuvarlak)</option>
                    <option value="checkbox" ${qType === 'checkbox' ? 'selected' : ''}>Çoklu Seçim (Kare)</option>
                    <option value="select" ${qType === 'select' ? 'selected' : ''}>Açılır Menü (Dropdown)</option>
                </select>
                <div style="display:flex; gap:0.25rem;">
                    <button class="btn btn-outline btn-duplicate-q btn-sm" type="button" style="padding: 0.75rem;" title="Soruyu Kopyala"><i class="ri-file-copy-line"></i></button>
                    <button class="btn btn-danger btn-remove-q btn-sm" type="button" style="padding: 0.75rem;" title="Soruyu Sil"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
            
            <div class="q-options-container" style="display:${(qType==='radio'||qType==='checkbox'||qType==='select') ? 'block' : 'none'}; margin-top:1rem; padding: 1rem; background: #f8fafc; border-radius: 6px; border: 1px dashed #cbd5e1;">
                <div style="font-weight: 600; margin-bottom: 0.75rem; font-size: 0.875rem; color: var(--text-main);">Şıklar</div>
                <div class="options-list">
                    <!-- Şıklar buraya eklenecek -->
                </div>
                <button class="btn btn-outline btn-add-opt btn-sm" type="button" style="padding:0.4rem 0.8rem; margin-top:0.25rem;"><i class="ri-add-line"></i> Yeni Şık Ekle</button>
            </div>

            <div style="display:flex; justify-content:flex-end; align-items:center; margin-top:1rem; padding-top:1rem; border-top:1px solid #e2e8f0;">
                <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; font-weight:500; cursor:pointer;">
                    Zorunlu Soru
                    <div class="switch">
                        <input type="checkbox" class="q-required-toggle" ${qIsRequired ? 'checked' : ''}>
                        <span class="slider"></span>
                    </div>
                </label>
            </div>
        `;

        // Şıkları Yükle
        const optsList = qDiv.querySelector('.options-list');
        const typeSelect = qDiv.querySelector('.q-type');

        function createOptionRow(optText = '', optImage = '') {
            const rowCount = optsList.querySelectorAll('.opt-row').length + 1;
            const row = document.createElement('div');
            
            const isCheck = typeSelect.value === 'checkbox';
            let iconClass = 'ri-checkbox-blank-circle-line';
            if (typeSelect.value === 'checkbox') iconClass = 'ri-checkbox-blank-line';
            if (typeSelect.value === 'select') iconClass = 'ri-arrow-down-s-line';
            
            row.className = 'opt-row';
            row.style.cssText = 'display:flex; flex-direction:column; gap:0.25rem; margin-bottom:0.75rem;';
            row.innerHTML = `
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    <i class="${iconClass} opt-icon" style="color:var(--text-muted);"></i>
                    <input type="text" placeholder="${rowCount}. Şık" class="q-opt-input" value="${optText}" style="flex:1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.875rem;">
                    <button type="button" class="btn btn-outline btn-add-opt-img btn-sm" style="padding: 0.4rem;" title="Şıka Resim Ekle"><i class="ri-image-add-line"></i></button>
                    <input type="file" class="opt-img-input" accept="image/*" style="display:none;">
                    <button type="button" class="btn btn-outline btn-remove-opt btn-sm" style="padding: 0.4rem;" title="Şıkkı Sil"><i class="ri-close-line"></i></button>
                </div>
                <div class="opt-img-preview" style="display:${optImage ? 'block' : 'none'}; position:relative; width:fit-content; margin-left: 2rem;">
                    <img src="${optImage}" class="opt-img-data" style="max-height: 60px; border-radius:4px; border: 1px solid #e2e8f0;">
                    <button class="btn-remove-opt-img" type="button" style="position:absolute; top:-5px; right:-5px; background:var(--danger); color:white; border:none; border-radius:50%; width:16px; height:16px; font-size:8px; cursor:pointer;"><i class="ri-close-line"></i></button>
                </div>
            `;

            // Şık Resmi Ekleme
            const btnAddImg = row.querySelector('.btn-add-opt-img');
            const imgInput = row.querySelector('.opt-img-input');
            const previewDiv = row.querySelector('.opt-img-preview');
            const imgTag = row.querySelector('.opt-img-data');
            const btnRemoveImg = row.querySelector('.btn-remove-opt-img');

            btnAddImg.addEventListener('click', () => imgInput.click());
            imgInput.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    compressImage(e.target.files[0], (base64) => {
                        imgTag.src = base64;
                        previewDiv.style.display = 'block';
                    });
                }
            });
            btnRemoveImg.addEventListener('click', () => {
                imgTag.src = '';
                previewDiv.style.display = 'none';
                imgInput.value = '';
            });

            // Şık Silme
            row.querySelector('.btn-remove-opt').addEventListener('click', () => {
                row.remove();
                updateOptPlaceholders();
            });

            optsList.appendChild(row);
        }

        if (qOptions.length > 0) {
            qOptions.forEach(opt => createOptionRow(opt.text, opt.image));
        } else {
            createOptionRow();
            createOptionRow();
        }

        function updateOptPlaceholders() {
            const rows = optsList.querySelectorAll('.opt-row');
            rows.forEach((r, idx) => {
                r.querySelector('.q-opt-input').placeholder = `${idx + 1}. Şık`;
            });
        }

        // Soru Resmi Ekleme
        const btnAddQImg = qDiv.querySelector('.btn-add-q-img');
        const qImgInput = qDiv.querySelector('.q-img-input');
        const qImgPreview = qDiv.querySelector('.q-img-preview');
        const qImgTag = qImgPreview.querySelector('img');
        const btnRemoveQImg = qDiv.querySelector('.btn-remove-q-img');

        btnAddQImg.addEventListener('click', () => qImgInput.click());
        qImgInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                compressImage(e.target.files[0], (base64) => {
                    qImgTag.src = base64;
                    qImgPreview.style.display = 'block';
                });
            }
        });
        btnRemoveQImg.addEventListener('click', () => {
            qImgTag.src = '';
            qImgPreview.style.display = 'none';
            qImgInput.value = '';
        });

        // Soru Tipi Değişimi
        const optsContainer = qDiv.querySelector('.q-options-container');
        typeSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'radio' || val === 'checkbox' || val === 'select') {
                optsContainer.style.display = 'block';
                const isCheck = val === 'checkbox';
                const isSelect = val === 'select';
                qDiv.querySelectorAll('.opt-icon').forEach(icon => {
                    if (isSelect) icon.className = 'ri-arrow-down-s-line opt-icon';
                    else if (isCheck) icon.className = 'ri-checkbox-blank-line opt-icon';
                    else icon.className = 'ri-checkbox-blank-circle-line opt-icon';
                });
            } else {
                optsContainer.style.display = 'none';
            }
        });

        // Yeni Şık Butonu
        qDiv.querySelector('.btn-add-opt').addEventListener('click', () => createOptionRow());

        // Kopyala Butonu
        qDiv.querySelector('.btn-duplicate-q').addEventListener('click', () => {
            const currentType = typeSelect.value;
            const currentOptions = [];
            if (currentType === 'radio' || currentType === 'checkbox' || currentType === 'select') {
                optsList.querySelectorAll('.opt-row').forEach(row => {
                    const txt = row.querySelector('.q-opt-input').value;
                    const img = row.querySelector('.opt-img-preview').style.display === 'block' ? row.querySelector('.opt-img-data').src : '';
                    currentOptions.push({ text: txt, image: img });
                });
            }
            const copyData = {
                question_text: qDiv.querySelector('.q-text').value,
                type: currentType,
                isRequired: qDiv.querySelector('.q-required-toggle').checked,
                image: qImgPreview.style.display === 'block' ? qImgTag.src : '',
                options: currentOptions
            };
            addQuestionUI(copyData); // Alta ekler
        });

        // Sil Butonu
        qDiv.querySelector('.btn-remove-q').addEventListener('click', function() {
            qDiv.remove();
        });

        questionsContainer.appendChild(qDiv);
    }

    // Kaydetme İşlemi
    document.getElementById('btn-save-survey').addEventListener('click', async () => {
        const title = document.getElementById('survey-title').value;
        const requireName = document.getElementById('require-name').checked;
        const qItems = document.querySelectorAll('.question-item');
        
        if (!title) { alert('Lütfen anket başlığı girin.'); return; }
        if (qItems.length === 0) { alert('En az bir soru eklemelisiniz.'); return; }
        
        const btn = document.getElementById('btn-save-survey');
        btn.disabled = true;
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Kaydediliyor...';
        
        let isValid = true;
        let errorMessage = '';

        const questions = Array.from(qItems).map((qDiv, idx) => {
            const type = qDiv.querySelector('.q-type').value;
            const qImgPreview = qDiv.querySelector('.q-img-preview');
            const isRequired = qDiv.querySelector('.q-required-toggle').checked;
            let finalOptions = [];

            if (type === 'radio' || type === 'checkbox' || type === 'select') {
                const optRows = qDiv.querySelectorAll('.opt-row');
                finalOptions = Array.from(optRows).map(row => {
                    const txt = row.querySelector('.q-opt-input').value.trim();
                    const imgData = row.querySelector('.opt-img-data').src;
                    const imgVisible = row.querySelector('.opt-img-preview').style.display === 'block';
                    return {
                        text: txt,
                        image: imgVisible ? imgData : ''
                    };
                }).filter(v => v.text !== '' || v.image !== '');

                if (finalOptions.length < 2) {
                    isValid = false;
                    errorMessage = 'Lütfen tüm şıklı sorular için en az 2 geçerli şık girin (Metin veya Resim).';
                }
            }

            return {
                question_text: qDiv.querySelector('.q-text').value,
                type: type,
                isRequired: isRequired,
                image: qImgPreview.style.display === 'block' ? qDiv.querySelector('.q-img-preview img').src : '',
                options: finalOptions, // Array of objects {text, image}
                order_num: idx
            };
        });

        if (!isValid) {
            alert(errorMessage);
            btn.disabled = false;
            btn.innerHTML = '<i class="ri-save-line"></i> Oluştur ve Yayınla';
            return;
        }

        if (window.isDemoMode()) {
            const surveys = JSON.parse(localStorage.getItem('demo_surveys') || '[]');
            const newSurvey = {
                id: 'demo-' + Date.now(),
                title,
                status: 'active',
                responses: 0,
                date: new Date().toISOString()
            };
            surveys.unshift(newSurvey);
            localStorage.setItem('demo_surveys', JSON.stringify(surveys));
            
            const allDemoQs = JSON.parse(localStorage.getItem('demo_questions') || '{}');
            allDemoQs[newSurvey.id] = { title, requireName, questions };
            localStorage.setItem('demo_questions', JSON.stringify(allDemoQs));

            window.location.href = 'index.html';
            return;
        }

        if (window.supabaseClient) {
            const { data: surveyData, error: sErr } = await window.supabaseClient
                .from('surveys')
                .insert([{ title, require_name: requireName, admin_id: adminId }])
                .select()
                .single();
                
            if (sErr) { alert(sErr.message); btn.disabled=false; return; }

            const qsToInsert = questions.map(q => ({
                survey_id: surveyData.id,
                ...q
            }));
            
            await window.supabaseClient.from('questions').insert(qsToInsert);
            
            window.location.href = 'index.html';
        }
    });
});
