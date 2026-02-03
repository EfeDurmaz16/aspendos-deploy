export default {
  title: 'Faturalandırma',
  subtitle: 'Aboneliğinizi ve kullanımınızı yönetin',

  plans: {
    starter: {
      name: 'Başlangıç',
      description: 'Sonsuza kadar ücretsiz',
      price: '₺0',
      period: 'ay',
    },
    pro: {
      name: 'Pro',
      description: 'Güçlü kullanıcılar için',
      price: '₺299',
      period: 'ay',
      popular: 'En popüler',
    },
    ultra: {
      name: 'Ultra',
      description: 'Her şey sınırsız',
      price: '₺799',
      period: 'ay',
    },
  },

  features: {
    chatsPerMonth: 'Aylık {count} sohbet',
    unlimitedChats: 'Sınırsız sohbet',
    memoryStorage: '{size} hafıza depolama',
    unlimitedMemory: 'Sınırsız hafıza',
    voiceMinutes: 'Günlük {count} sesli dakika',
    unlimitedVoice: 'Sınırsız sesli',
    councilMode: 'Konsey modu',
    pacCallbacks: 'Proaktif geri aramalar',
    prioritySupport: 'Öncelikli destek',
    apiAccess: 'API erişimi',
    customModels: 'Özel model seçimi',
    advancedAnalytics: 'Gelişmiş analitik',
    teamFeatures: 'Takım özellikleri',
  },

  currentPlan: {
    title: 'Mevcut plan',
    activeSince: '{date} tarihinden beri aktif',
    renewsOn: '{date} tarihinde yenilenir',
    canceledOn: '{date} tarihinde iptal edildi',
    expiresOn: '{date} tarihinde sona erer',
  },

  usage: {
    title: 'Bu dönem kullanım',
    chats: 'Sohbetler',
    chatsUsed: '{used} / {total} sohbet kullanıldı',
    memory: 'Hafıza',
    memoryUsed: '{used} / {total} kullanıldı',
    voice: 'Sesli',
    voiceUsed: '{used} / {total} dakika kullanıldı',
    tokens: 'Token',
    tokensUsed: '{used}K / {total}K token kullanıldı',
    resetDate: '{date} tarihinde sıfırlanır',
  },

  actions: {
    upgrade: 'Yükselt',
    downgrade: 'Düşür',
    cancel: 'Aboneliği iptal et',
    reactivate: 'Aboneliği yeniden etkinleştir',
    manageBilling: 'Faturalandırmayı yönet',
    viewInvoices: 'Faturaları görüntüle',
    updatePayment: 'Ödeme yöntemini güncelle',
  },

  upgrade: {
    title: 'Planınızı yükseltin',
    subtitle: 'Daha fazla özellik ve daha yüksek limitler açın',
    currentPlan: 'Mevcut plan',
    selectPlan: 'Plan seç',
    confirm: 'Yükseltmeyi onayla',
    processing: 'İşleniyor...',
    success: 'Yükseltme başarılı!',
    successMessage: '{plan} planına hoş geldiniz! Yeni özellikleriniz artık aktif.',
  },

  cancel: {
    title: 'Aboneliği iptal et',
    subtitle: 'Gittiğinizi görmek bizi üzüyor',
    warning: 'Fatura döneminizin sonunda {plan} özelliklerine erişiminizi kaybedeceksiniz.',
    keepPlan: 'Planımı koru',
    confirmCancel: 'Aboneliği iptal et',
    reason: 'Geliştirmemize yardımcı olun',
    reasonPlaceholder: 'Neden iptal ediyorsunuz?',
  },

  payment: {
    title: 'Ödeme yöntemi',
    cardEnding: '{last4} ile biten kart',
    expires: '{date} tarihinde sona erer',
    addCard: 'Ödeme yöntemi ekle',
    updateCard: 'Kartı güncelle',
    removeCard: 'Kartı kaldır',
  },

  invoices: {
    title: 'Faturalar',
    date: 'Tarih',
    amount: 'Tutar',
    status: 'Durum',
    download: 'İndir',
    paid: 'Ödendi',
    pending: 'Beklemede',
    failed: 'Başarısız',
    noInvoices: 'Henüz fatura yok',
  },
};
