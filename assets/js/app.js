document.addEventListener('DOMContentLoaded', async () => {
    const adminId = window.getAdminId();
    const liveIndicator = document.getElementById('live-indicator');

    if (window.isDemoMode()) {
        liveIndicator.innerHTML = '<span style="color:var(--warning);"><i class="ri-error-warning-line"></i> Sadece Yerel Cihaz (İnternetsiz)</span>';
    }

    const shareModal = document.getElementById('share-modal');
    document.getElementById('close-share-btn').addEventListener('click', () => shareModal.classList.remove('active'));
    
    document.getElementById('btn-copy-link').addEventListener('click', () => {
        const input = document.getElementById('share-link-input');
        input.select();
        document.execCommand('copy');
        alert('Bağlantı kopyalandı!');
    });

    // QR Kod İndirme Fonksiyonları
    const downloadQRCode = (type) => {
        const canvas = document.getElementById('qrcode');
        if (!canvas) {
            alert('Lütfen önce QR kodun oluşmasını bekleyin.');
            return;
        }
        
        // Sadece Canvas üzerindeki resmi veriye dönüştür (şeffaf arkaplan olmaması için jpg'de beyaz arkaplan eklemek gerekebilir ama varsayılan qrcode.js beyaz yapıyor)
        const dataUrl = canvas.toDataURL(`image/${type}`, 1.0);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `anket-karekod.${type === 'jpeg' ? 'jpg' : 'png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    document.getElementById('btn-download-qr-png').addEventListener('click', () => downloadQRCode('png'));
    document.getElementById('btn-download-qr-jpg').addEventListener('click', () => downloadQRCode('jpeg'));

    const loadSurveys = async () => {
        const tbody = document.getElementById('table-body');
        
        if (window.isDemoMode()) {
            const surveys = JSON.parse(localStorage.getItem('demo_surveys') || '[]');
            renderTable(surveys, tbody);
            updateStats(surveys);
            return;
        }

        if (window.supabaseClient) {
            const { data: surveys, error } = await window.supabaseClient
                .from('surveys')
                .select(`id, title, status, created_at, responses (id)`)
                .eq('admin_id', adminId)
                .order('created_at', { ascending: false });
                
            if (!error) {
                const formattedSurveys = surveys.map(s => ({
                    id: s.id,
                    title: s.title,
                    status: s.status,
                    date: s.created_at,
                    responses: s.responses ? s.responses.length : 0
                }));
                renderTable(formattedSurveys, tbody);
                updateStats(formattedSurveys);
            }
        }
    };

    const renderTable = (surveys, tbody) => {
        tbody.innerHTML = '';
        if (surveys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; font-size: 1.125rem; padding: 3rem;">Henüz bir anket oluşturmadınız. "Yeni Anket Oluştur" butonu ile başlayabilirsiniz.</td></tr>';
            return;
        }
        
        surveys.forEach(s => {
            const tr = document.createElement('tr');
            tr.id = `survey-${s.id}`;
            const date = new Date(s.date).toLocaleDateString('tr-TR');
            const statusBadge = s.status === 'active' 
                ? '<span class="badge active">Yayında</span>' 
                : '<span class="badge completed">Bitti</span>';
            
            tr.innerHTML = `
                <td>${date}</td>
                <td style="font-weight: 500;">${s.title}</td>
                <td><span class="response-count" style="font-size: 1.125rem; font-weight: 600;">${s.responses}</span> kişi</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-outline btn-share" data-id="${s.id}" style="padding: 0.4rem 0.6rem;" title="Paylaş"><i class="ri-share-line"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-share').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const path = window.location.pathname.replace('index.html', '').replace('dashboard.html', '');
                const link = `${window.location.origin}${path}survey.html?id=${id}`;
                document.getElementById('share-link-input').value = link;
                
                const qrContainer = document.getElementById('qr-container');
                qrContainer.innerHTML = '<canvas id="qrcode"></canvas>';
                if (window.QRCode) {
                    window.QRCode.toCanvas(document.getElementById('qrcode'), link, function (error) {
                        if (error) console.error(error);
                    });
                }
                shareModal.classList.add('active');
            });
        });
    };

    const updateStats = (surveys) => {
        document.getElementById('stat-total-surveys').textContent = surveys.length;
        const active = surveys.filter(s => s.status === 'active').length;
        document.getElementById('stat-active-surveys').textContent = active;
        document.getElementById('stat-completed-surveys').textContent = surveys.length - active;
        const totalResp = surveys.reduce((acc, curr) => acc + curr.responses, 0);
        document.getElementById('stat-total-responses').textContent = totalResp;
    };

    if (!window.isDemoMode() && window.supabaseClient) {
        window.supabaseClient.channel('public:responses')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses' }, async payload => {
                const surveyRow = document.getElementById(`survey-${payload.new.survey_id}`);
                if (surveyRow) {
                    const countEl = surveyRow.querySelector('.response-count');
                    countEl.textContent = parseInt(countEl.textContent) + 1;
                    
                    const statTotal = document.getElementById('stat-total-responses');
                    statTotal.textContent = parseInt(statTotal.textContent) + 1;

                    surveyRow.classList.remove('new-row');
                    void surveyRow.offsetWidth; 
                    surveyRow.classList.add('new-row');
                }
            })
            .subscribe();
    }

    document.getElementById('btn-export-data').addEventListener('click', async () => {
        let exportData = { adminId: adminId, version: 1 };
        
        if (window.isDemoMode()) {
            exportData.surveys = JSON.parse(localStorage.getItem('demo_surveys') || '[]');
            exportData.questions = JSON.parse(localStorage.getItem('demo_questions') || '{}');
        } else {
            const { data: surveys } = await window.supabaseClient.from('surveys').select('*').eq('admin_id', adminId);
            const { data: questions } = await window.supabaseClient.from('questions').select('*').in('survey_id', surveys.map(s=>s.id));
            const { data: responses } = await window.supabaseClient.from('responses').select('*').in('survey_id', surveys.map(s=>s.id));
            const { data: response_answers } = await window.supabaseClient.from('response_answers').select('*').in('response_id', responses.map(r=>r.id));
            
            exportData.surveys = surveys;
            exportData.questions = questions;
            exportData.responses = responses;
            exportData.response_answers = response_answers;
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", "anket-asistani-yedek.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    document.getElementById('btn-import-data').addEventListener('click', () => {
        document.getElementById('file-import').click();
    });

    document.getElementById('file-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.adminId) {
                    localStorage.setItem('survey_admin_id', data.adminId);
                    if (window.isDemoMode() && data.surveys && !Array.isArray(data.surveys)) {
                        localStorage.setItem('demo_surveys', JSON.stringify(data.surveys));
                        localStorage.setItem('demo_questions', JSON.stringify(data.questions));
                    }
                    alert('Veriler başarıyla yüklendi! Sayfa yenileniyor.');
                    window.location.reload();
                } else {
                    alert('Geçersiz dosya formatı.');
                }
            } catch (err) {
                alert('Dosya okuma hatası: ' + err.message);
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('btn-clear-all-data').addEventListener('click', async () => {
        if (!confirm('DİKKAT: Tüm anketler, sorular ve yanıtlar KALICI olarak silinecek. Yedek aldığınıza emin misiniz? Devam edilsin mi?')) {
            return;
        }

        if (window.isDemoMode()) {
            localStorage.setItem('demo_surveys', JSON.stringify([]));
            localStorage.setItem('demo_questions', JSON.stringify({}));
            alert('Tüm veriler temizlendi!');
            window.location.reload();
        } else {
            const btn = document.getElementById('btn-clear-all-data');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Siliniyor...';
            btn.disabled = true;

            const { error } = await window.supabaseClient
                .from('surveys')
                .delete()
                .eq('admin_id', adminId);

            if (error) {
                alert('Silme sırasında hata oluştu: ' + error.message);
                btn.innerHTML = originalText;
                btn.disabled = false;
            } else {
                alert('Tüm veriler başarıyla temizlendi!');
                window.location.reload();
            }
        }
    });

    loadSurveys();
});
