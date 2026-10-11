WEBASSEMBLY / JAVASCRIPT HIZ KARŞILAŞTIRMASI

ÇALIŞTIRMA
1. ZIP dosyasını bir klasöre çıkar. ZIP içinden doğrudan çalıştırma.
2. BASLAT.bat dosyasına çift tıkla. Mevcut Python 3 kurulumunu kullanır.
3. Açılan tarayıcıda "Karşılaştırmayı başlat" düğmesine bas.
4. "Ölçümleri CSV indir" ile sonuçlarını kaydet. Sunucu penceresini açık tut.
5. Sunucuyu kapatmak için pencereye dönüp Ctrl+C yap.

Elle açmak için: bu klasörü VS Code'da aç, terminalde şu komutu çalıştır:
python server.py
Ardından http://127.0.0.1:8000 adresini aç.
index.html dosyasına çift tıklamak yerine yerel sunucuyu kullan.
8000 portu doluysa eski demo sunucu penceresini kapat.

DOSYALAR
matrix.c: C ile matris çarpımı; araştırmanın hesaplama kaynak kodu.
matrix.wasm: Bu C kodundan Clang 15.0.7 / LLD 15.0.7 ile derlenen hazır modül.
app.js: Aynı algoritmanın JavaScript sürümü, Wasm bağlantısı ve ölçüm akışı.
index.html: Demo arayüzü.
server.py / BASLAT.bat: Yerel sunucu ve Windows başlatıcısı.
build.sh: Yeniden derleme komutu; yalnız derlemek isteyenler içindir.
BUILD.json: Derleme ayarları ve dosya SHA-256 özeti.

Emscripten kullanılmamıştır. Hazır modülü çalıştırmak için Clang, Git,
Emscripten veya WSL kurman gerekmez. Python yalnızca yerel dosya sunucusudur;
hız karşılaştırmasına katılmaz. Demo hesaplamaları C/Wasm ve JavaScript'tir.

ÖLÇÜM YÖNTEMİ
Boyutlar: 64×64, 128×128, 256×256. Varsayılan: uygulama başına ve boyut
başına 5 ısınma turu, ardından 20 ölçüm. Tek iş parçacığı, klasik i-j-k döngüsü.
C double ile JS Float64Array aynı 64 bit sayı biçimini ve aynı girdileri kullanır.
Clang -O3 ile derlenmiştir; fast-math, SIMD veya paralellik bayrakları yoktur.
Kayan nokta işlemlerinin birleştirilmesi -ffp-contract=off ile kapatılmıştır.

performance.now() yalnız çarpım işlevinin süresini ölçer. Wasm çağrı geçişi
bu süreye dahildir. Hazırlık, bellek büyütme, verileri kopyalama, doğruluk
kontrolü ve ekran çizimi bu sürenin dışındadır. Modül hazırlığı ayrıca kaydedilir.
Her tekrar JS-Wasm ve Wasm-JS olarak sırayla değiştirilir. Sonuçların bütün
elemanları her turdan sonra kontrol edilir. Tolerans:
|JS-Wasm| <= 1e-10 × max(1, |JS|, |Wasm|).
Matris tamponları C'nin __heap_base alanından sonra hizalı biçimde ayrılır;
sonraki boyutta tekrar kullanılır. Standart C kütüphanesine ihtiyaç yoktur.

Tabloda 20 sürenin medyanı bulunur. Oran = JS medyanı / Wasm medyanı.
Oran > 1: Wasm hızlı; oran < 1: JS hızlı. Wasm'ın her durumda daha hızlı
olması beklenmemelidir. Süre çözünürlüğü ve tarayıcının JIT davranışı etkilidir.

CSV'de 60 ham ölçüm satırı, ölçüm sırası, maksimum mutlak hata, tarih,
tarayıcı bilgisi, platform, mantıksal işlemci sayısı ve derleme ayarları vardır.
Platform/user-agent alanları işletim sistemi ve tarayıcı sürümünü her zaman
tam göstermez. Raporda cihaz, işlemci, RAM, Windows sürümü ve tarayıcı sürümünü
ayrıca yaz. Ölçümü sekme görünürken yap; arka plana geçerse yeniden başlat.
Sonuçları farklı cihazlara veya bütün algoritmalara genelleme.

RAPORA UYARLAMA
Önceki raporda derleyici Emscripten olarak yazılmışsa yöntem bölümünü ve
ilgili kavramsal çerçeveyi bu uygulamaya göre güncelle: bu sürüm doğrudan
Clang/LLVM ve LLD kullanır. C ve JavaScript karşılaştırması değişmemiştir.
Bulgular tablosunu gerçek CSV ölçümlerinden doldur; pakette örnek/uydurma
ölçüm sonucu yoktur.

Yöntem için kullanılabilecek metin:
"Deneysel uygulamada aynı matris çarpımı algoritmasının C ve JavaScript
uygulamaları karşılaştırılmıştır. C kodu Clang 15.0.7 ve LLD 15.0.7 ile
WebAssembly biçimine derlenmiş, tarayıcıda WebAssembly API üzerinden
çalıştırılmıştır. Emscripten kullanılmamıştır. Her matris boyutunda beş
ısınma turundan sonra yirmi ölçüm yapılmış, hesaplama sürelerinin medyanları
karşılaştırılmıştır. Verilerin hazırlanması ve kopyalanması ölçüm dışında
tutulmuş; her turda hesaplanan sonuçların doğruluğu kontrol edilmiştir."

DOĞRULAMA
C'den üretilen modül Node.js WebAssembly motorunda bilinen 2×2 matris
çarpımıyla ve üç deney boyutunda JavaScript sonuçlarının tüm elemanlarıyla
kontrol edilmiştir. Uygulama akışı ve CSV çıktısı DOM taklidi ile kontrol
edilmiştir. Windows tarayıcısındaki görsel ve çalıştırma kontrolü kullanıcı
bilgisayarında yapılacaktır. Bu geliştirme kontrolleri rapor ölçümü değildir.
