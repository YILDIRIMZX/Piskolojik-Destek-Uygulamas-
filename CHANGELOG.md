# Changelog / Sürüm notları

Every update is listed here with what changed and why. Newest first. Each entry is written in English and Turkish.

Her güncelleme, neyin neden değiştiğiyle birlikte burada listelenir. En yenisi en üstte. Her kayıt İngilizce ve Türkçe yazılmıştır.

---

## 2.1.2 (2026-10-08)

**EN.** The 24-character title limit was too tight: the counselor squeezed names into vague fragments ("Öfkenin altı", "Gitme dürtüsü") that no longer said what the tool does. Titles may now be 2-6 words and up to 36 characters, the counselor is told to write a name that explains the tool on its own (with good and bad examples), and long titles wrap to two lines in lists. Titles cut by version 1 are still detected and replaced.

**TR.** 24 karakterlik başlık sınırı fazla darmış: danışman adları ne işe yaradığı anlaşılmayan parçalara sıkıştırıyordu ("Öfkenin altı", "Gitme dürtüsü"). Başlıklar artık 2-6 kelime ve en fazla 36 karakter olabiliyor. Danışmana, aracın ne işe yaradığını tek başına anlatan bir ad yazması söyleniyor (iyi ve kötü örneklerle). Uzun başlıklar listelerde iki satıra sarılıyor. 1. sürümün kestiği başlıklar hâlâ yakalanıp değiştiriliyor.

## 2.1.1 (2026-10-08)

**EN.** "Personalize" now starts from scratch. It used to send the current tool names to the counselor, and an old cut-off title ("…Değil, Dos") was shortened again instead of being fixed. The counselor no longer sees the old names during personalization and is told never to abbreviate or cut words, and to repair any cut-off word it finds.

**TR.** "Kişiselleştir" artık sıfırdan çalışıyor. Önceden mevcut araç adlarını danışmana gönderiyordu ve eski kesik bir başlık ("…Değil, Dos") düzeltilmek yerine yeniden kısaltılmıştı. Danışman kişiselleştirmede eski adları artık görmüyor; kelimeleri asla kısaltmaması ya da kesmemesi, yarım kalmış bir kelime görürse düzeltmesi söyleniyor.

## 2.1.0 (2026-10-08)

**EN.** Fixes reported from daily use on iPhone.
- **Tab bar no longer floats over content.** After the keyboard or dictation closed, iOS could leave the viewport offset, and the fixed tab bar drifted up over the tools. The page itself no longer scrolls; content scrolls inside the app and the bar is anchored to the app frame.
- **Screen stays on when it should.** Screen Wake Lock is held while recording, while a text field is in use (keyboard dictation), during a session and on every tool screen (breathing, urge surfing and other exercises you watch without touching).
- **Microphone works on the first press.** Azure recording now opens the microphone before creating its audio pipeline, which iOS could otherwise feed with silence. If no sound comes through, both engines now say so instead of failing silently.
- **Tool names are never cut mid-word.** A title was clipped to 28 characters ("…Değil, Dos"). Titles over 24 characters or 4 words are now rejected and the default name is used; subtitles shorten at a word boundary. The counselor is told the limit.

**TR.** iPhone'da günlük kullanımda bildirilen sorunların düzeltmeleri.
- **Alt menü artık içeriğin üstüne binmiyor.** Klavye ya da dikte kapandıktan sonra iOS ekranı kaymış bırakabiliyordu ve sabit alt menü araçların üstüne çıkıyordu. Artık sayfanın kendisi kaymıyor; içerik uygulamanın içinde kayıyor ve menü uygulamanın çerçevesine sabit.
- **Ekran gerektiğinde açık kalıyor.** Kayıt sırasında, bir yazı alanı kullanılırken (klavye diktesi), seans boyunca ve tüm araç ekranlarında (nefes, dürtü dalgası gibi dokunmadan izlenen egzersizler) ekran kapanmıyor.
- **Mikrofon ilk basışta çalışıyor.** Azure kaydı artık önce mikrofonu açıp sonra ses işlemeyi kuruyor; aksi halde iOS sessiz kayıt verebiliyordu. Hiç ses gelmezse iki motor da sessizce boş bırakmak yerine uyarı veriyor.
- **Araç adları kelime ortasından kesilmiyor.** Bir başlık 28 karakterde kesilmişti ("…Değil, Dos"). Artık 24 karakteri ya da 4 kelimeyi aşan başlıklar reddediliyor ve varsayılan ad kullanılıyor; açıklamalar kelime sınırında kısalıyor. Danışmana bu sınır bildiriliyor.

## 2.0.2 (2026-10-07)

**EN.** With an odd number of featured tools, the first home tile spanned two rows and stretched with long texts, leaving a large empty area. It now takes a full-width row with the icon beside the text.

**TR.** Ana ekranda tek sayıda araç varken ilk karo iki satır kaplıyor ve uzun metinlerle uzayıp büyük bir boşluk bırakıyordu. Artık tam genişlikte bir satır oluyor, simge yazının yanında duruyor.

## 2.0.1 (2026-10-07)

**EN.** Backups (.json) can be restored from the onboarding import step and from "Import files". iOS greyed out .json files when the file picker restricted types, so a backup could not be chosen.

**TR.** Yedek (.json) dosyaları artık kurulumdaki aktarma adımından ve "Dosya aktar"dan geri yüklenebiliyor. Dosya seçici tür kısıtladığı için iOS .json dosyalarını soluk gösteriyor ve yedek seçilemiyordu.

## 2.0.0 (2026-10-07)

**EN.** Shaped by a user's feedback after a session and by the goal of serving anyone, not one scenario.
- Counselor rules: leads with a session focus, balances validation with gentle challenge, catches drift into technical topics as possible avoidance, holds hypotheses with reasons and explains changes, prefers open questions, treats dictated input as possibly misrecognized.
- Universal library of nine evidence-based tools. The counselor picks, names and configures them through a validated patch that rides along with the end-of-session report and is approved by the user.
- Big Five personality test (Mini-IPIP, scored on the device) for new users; one request prepares their first case file and tools.
- Optional Azure speech-to-text next to keyboard and Safari dictation.
- Renamed from "Seans" to **İçgörü**.

**TR.** Bir kullanıcının seans sonrası geri bildirimi ve uygulamayı tek bir senaryoya değil herkese hitap eder hale getirme hedefiyle şekillendi.
- Danışman kuralları: seansa bir odakla yön veriyor, onaylamayla nazik sorgulamayı dengeliyor, teknik konulara kaymayı olası kaçınma olarak fark ediyor, hipotezleri gerekçeleriyle tutup değişiklikleri açıklıyor, açık uçlu soruları tercih ediyor, dikteyle gelen metnin hatalı tanınmış olabileceğini biliyor.
- Kanıta dayalı dokuz araçtan oluşan evrensel kütüphane. Danışman araçları seçiyor, adlandırıyor ve ayarlıyor; değişiklikler seans sonu raporuyla gelen doğrulanmış bir paketle yapılıyor ve kullanıcı onaylıyor.
- Yeni kullanıcılar için Büyük Beşli kişilik testi (Mini-IPIP, puanlama cihazda); tek bir istek ilk danışan dosyasını ve araçları hazırlıyor.
- Klavye ve Safari diktesinin yanında isteğe bağlı Azure konuşma tanıma.
- Uygulamanın adı "Seans"tan **İçgörü** oldu.

## 1.2.0 (2026-10-05)

**EN.** Turkish and English for the interface and the counselor; READMEs in English, Turkish and Russian; MIT license.

**TR.** Arayüz ve danışman için Türkçe ve İngilizce; İngilizce, Türkçe ve Rusça README; MIT lisansı.

## 1.1.0 (2026-10-04)

**EN.** Voice: keyboard dictation by default in iPhone Home Screen mode (Safari's recognizer could freeze), a watchdog that recovers a stuck recognizer, a device voice picker, and optional Azure neural voices for read-aloud.

**TR.** Ses: iPhone ana ekran modunda varsayılan olarak klavye diktesi (Safari'nin tanıması donabiliyordu), takılan tanımayı toparlayan bir gözetleyici, cihaz sesi seçici ve sesli okuma için isteğe bağlı Azure sinirsel sesleri.

## 1.0.0 (2026-10-04)

**EN.** First release: PIN-encrypted local storage, 50-minute sessions with Claude, reports and case file with user approval, journal, cycle map, breathing and self-compassion tools, emergency button, installable PWA on GitHub Pages.

**TR.** İlk sürüm: PIN ile şifreli yerel depolama, Claude ile 50 dakikalık seanslar, kullanıcı onaylı rapor ve danışan dosyası, günlük, döngü haritası, nefes ve öz-şefkat araçları, acil yardım düğmesi, GitHub Pages üzerinde kurulabilir PWA.
