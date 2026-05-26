# Anket Asistanı (Survey Assistant)

Anket Asistanı, kullanıcıların Google Forms mantığında ancak ondan bağımsız, Excel hızında ve pratikliğinde kendi anketlerini oluşturup yönetebilecekleri **şifresiz ve sunucusuz (serverless)** bir web uygulamasıdır.

## 🎯 Projenin Amacı ve İşlevselliği

Bu projenin temel çıkış noktası; anket oluşturan kişilerin (anketörlerin) üyelik formlarıyla, şifrelerle veya karmaşık yönetim panelleriyle vakit kaybetmeden anında anket hazırlayıp sahaya inebilmesidir. 

**Öne Çıkan Özellikler:**
- **Şifresiz ve Üyeliksiz Yönetim:** Uygulama açıldığı an sizi kendi özel paneline alır. Giriş yapmanıza veya hesap oluşturmanıza gerek kalmaz.
- **Görünmez Veritabanı Mimarisi:** Arka planda Supabase kullanılarak veriler tamamen gerçek zamanlı (real-time) işlenir, ancak kullanıcı bu veritabanı karmaşasını asla hissetmez. 
- **Zengin Soru Tipleri:** Kısa metin, uzun paragraf, tekli seçim (yuvarlak/radio), çoklu seçim (kare/checkbox) ve açılır menü (dropdown) desteklenir.
- **Resim Desteği:** İster anketin ana başlığına, ister sorulara, isterse de şıklara resim eklenebilir. Resimler otomatik sıkıştırılarak (Canvas yardımıyla) veritabanı limitlerini yormadan kaydedilir.
- **Anında Paylaşım:** Oluşturulan her anket için sistem otomatik bir Karekod (QR Code) üretir. Bu karekod PNG veya JPG olarak indirilip her yerde paylaşılabilir.
- **Gelişmiş Sonuç İnceleme:** Toplanan veriler sadece rakam olarak değil; **Kişi Bazlı** (kim ne cevap vermiş) ve **Soru Bazlı** (şıkların seçilme oranlarını gösteren Chart.js destekli Halka Grafikler) olarak detaylıca incelenebilir.

---

## 🛠 Teknik Altyapı ve Kod Mimarisi

Proje tamamen statik web teknolojileri (**HTML, CSS, Vanilla JavaScript**) kullanılarak geliştirilmiş olup, arka uç (backend) hizmeti olarak **Supabase** (PostgreSQL) hizmetinden faydalanmaktadır. Sunucu (Node.js vb.) gerektirmediği için doğrudan GitHub Pages, Vercel veya Netlify gibi platformlarda barındırılabilir.

### Klasör ve Dosya Yapısı

- `index.html` : Anketçinin giriş yaptığı, geçmiş anketleri listelediği ve yeni anket butonunun bulunduğu Ana Dashboard ekranı.
- `create.html` : Sürükle bırak mantığına yakın, esnek ve tam sayfa Anket Oluşturma ekranı.
- `survey.html` : Katılımcıların (müşterilerin/kullanıcıların) anketi doldurduğu ön yüz.
- `results.html` : Anketçi için anket sonuçlarının grafiklerle ve kişi listesiyle detaylı gösterildiği ekran.
- `supabase/schema.sql` : Veritabanı tablolarını (surveys, questions, responses, response_answers) ve RLS (Güvenlik) politikalarını oluşturan SQL şeması.

### JavaScript Mantığı (`assets/js/`)

1. **`supabase.js`**
   - Sistemin kalbidir. Supabase bağlantısını kurar. Tarayıcının `localStorage` alanına rastgele bir `admin_id` atayarak kullanıcının anketlerini cihazında kalıcı olarak takip etmesini sağlar.
2. **`app.js`**
   - Ana sayfadaki (`index.html`) anket listeleme, QR kod üretme, istatistik gösterme ve verileri içe/dışa aktarma (Yedekleme) işlemlerini yönetir.
3. **`create.js`**
   - Anket oluşturma mantığını içerir. Soruları kopyalama, soruya ve şıklara resim ekleme, Canvas API ile resim sıkıştırma (compressImage) ve verileri Supabase'e JSON formatında yollama işlevlerini barındırır.
4. **`survey.js`**
   - Katılımcı ekranında soruların dinamik olarak render edilmesini sağlar. Gelen verinin `select`, `radio` veya `checkbox` olmasına göre HTML yapısını kurar ve zorunlu soru kontrollerini yapar.
5. **`results.js`**
   - Katılımcıların verdiği cevapları Supabase'den çeker. Hem kişi bazlı (her kişinin cevabını alt alta dizerek) hem de soru bazlı gruplama yapar. **Chart.js** kullanarak çoktan seçmeli sorular için Halka (Doughnut) grafikleri çizer.

### Güvenlik ve Veri Tabanı Mimarisi (RLS)
Proje, sunucusuz (BaaS - Backend as a Service) çalıştığı için veri güvenliği doğrudan Supabase üzerinden sağlanmaktadır. Ancak kullanım kolaylığı (üyeliksiz yapı) amacıyla tablolarda `Row Level Security (RLS)` politikaları dışarıdan okuma ve yazmaya (`anon` rolü için) tam açık bırakılmıştır.

- **`surveys` tablosu:** Anket başlıklarını ve kimin oluşturduğunu (admin_id) tutar.
- **`questions` tablosu:** Soru metni, tipi, şıkları (JSONB formatında) ve zorunluluk (isRequired) ayarlarını barındırır.
- **`responses` tablosu:** Katılımcı bilgisini ve ankete giriş zamanını tutar.
- **`response_answers` tablosu:** Hangi katılımcının (`response_id`) hangi soruya (`question_id`) ne cevap verdiğini tutar. 

Bu yapı, ilerleyen aşamalarda kolayca ölçeklendirilebilir ve anket başına binlerce yanıt sorunsuz şekilde depolanabilir.
