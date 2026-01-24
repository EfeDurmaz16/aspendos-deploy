export default {
  general: {
    somethingWentWrong: 'Bir şeyler ters gitti',
    tryAgain: 'Lütfen tekrar deneyin',
    contactSupport: 'Destek ile iletişime geçin',
    goBack: 'Geri dön',
    goHome: 'Ana sayfaya git',
  },

  http: {
    400: 'Geçersiz istek',
    401: 'Yetkisiz',
    403: 'Yasaklandı',
    404: 'Bulunamadı',
    408: 'İstek zaman aşımı',
    429: 'Çok fazla istek',
    500: 'Sunucu hatası',
    502: 'Geçersiz ağ geçidi',
    503: 'Hizmet kullanılamıyor',
    504: 'Ağ geçidi zaman aşımı',
  },

  network: {
    offline: 'Çevrimdışı görünüyorsunuz',
    offlineDescription: 'Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin',
    timeout: 'İstek zaman aşımına uğradı',
    timeoutDescription: 'Sunucu yanıt vermekte çok uzun sürdü. Lütfen tekrar deneyin.',
    connectionFailed: 'Bağlantı başarısız',
    connectionFailedDescription: 'Sunucuya bağlanılamıyor. Lütfen daha sonra tekrar deneyin.',
  },

  auth: {
    sessionExpired: 'Oturum süresi doldu',
    sessionExpiredDescription: 'Devam etmek için lütfen tekrar giriş yapın',
    unauthorized: 'Yetkisiz',
    unauthorizedDescription: 'Bu kaynağa erişim izniniz yok',
    invalidToken: 'Geçersiz veya süresi dolmuş token',
    accountLocked: 'Hesap kilitlendi',
    accountLockedDescription: 'Hesabınız kilitlendi. Lütfen destek ile iletişime geçin.',
  },

  rateLimit: {
    title: 'Yavaşlayın',
    description: 'Çok fazla istek yaptınız. Lütfen bir an bekleyin.',
    retryIn: '{seconds} saniye içinde tekrar deneyin',
  },

  ai: {
    modelUnavailable: 'AI modeli kullanılamıyor',
    modelUnavailableDescription: 'İstenen AI modeli şu anda kullanılamıyor. Yedek deneniyor...',
    generationFailed: 'Yanıt oluşturma başarısız',
    generationFailedDescription: 'Yanıt oluşturulamıyor. Lütfen tekrar deneyin.',
    contextTooLong: 'Bağlam çok uzun',
    contextTooLongDescription: 'Konuşma çok uzun. Lütfen yeni bir konuşma başlatın.',
    contentFiltered: 'İçerik filtrelendi',
    contentFilteredDescription: 'Yanıt içerik politikası nedeniyle filtrelendi.',
  },

  form: {
    required: 'Bu alan zorunludur',
    invalidEmail: 'Geçerli bir e-posta adresi girin',
    invalidUrl: 'Geçerli bir URL girin',
    tooShort: 'En az {min} karakter olmalıdır',
    tooLong: 'En fazla {max} karakter olmalıdır',
    invalidFormat: 'Geçersiz format',
    passwordMismatch: 'Şifreler eşleşmiyor',
  },

  file: {
    tooLarge: 'Dosya çok büyük',
    tooLargeDescription: 'Maksimum dosya boyutu {maxSize}MB',
    invalidType: 'Geçersiz dosya türü',
    invalidTypeDescription: 'Desteklenen formatlar: {formats}',
    uploadFailed: 'Yükleme başarısız',
    uploadFailedDescription: 'Dosya yüklenemiyor. Lütfen tekrar deneyin.',
  },

  feature: {
    notAvailable: 'Özellik kullanılamıyor',
    notAvailableDescription: 'Bu özellik mevcut planınızda kullanılamıyor',
    upgradeRequired: 'Yükseltme gerekli',
    upgradeRequiredDescription: 'Bu özelliğe erişmek için lütfen {plan} planına yükseltin',
    comingSoon: 'Yakında',
    comingSoonDescription: 'Bu özellik yakında geliyor',
  },

  notFound: {
    title: 'Sayfa bulunamadı',
    description: 'Aradığınız sayfa mevcut değil veya taşındı.',
  },

  serverError: {
    title: 'Sunucu hatası',
    description: 'Teknik sorunlar yaşıyoruz. Lütfen daha sonra tekrar deneyin.',
  },

  maintenance: {
    title: 'Bakımda',
    description: 'Planlı bakım gerçekleştiriyoruz. Kısa süre içinde döneceğiz.',
    eta: 'Tahmini süre: {time}',
  },
};
