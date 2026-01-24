export default {
  title: 'Ayarlar',
  subtitle: 'YULA deneyiminizi özelleştirin',

  sections: {
    account: 'Hesap',
    appearance: 'Görünüm',
    notifications: 'Bildirimler',
    privacy: 'Gizlilik ve Veri',
    integrations: 'Entegrasyonlar',
    advanced: 'Gelişmiş',
  },

  account: {
    title: 'Hesap',
    email: 'E-posta',
    name: 'Görünen ad',
    avatar: 'Profil fotoğrafı',
    changeAvatar: 'Fotoğrafı değiştir',
    removeAvatar: 'Fotoğrafı kaldır',
    changePassword: 'Şifre değiştir',
    deleteAccount: 'Hesabı sil',
    deleteAccountWarning: 'Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecektir.',
  },

  appearance: {
    title: 'Görünüm',
    theme: 'Tema',
    themeOptions: {
      light: 'Açık',
      dark: 'Koyu',
      system: 'Sistem',
    },
    language: 'Dil',
    fontSize: 'Yazı boyutu',
    fontSizeOptions: {
      small: 'Küçük',
      medium: 'Orta',
      large: 'Büyük',
    },
    reducedMotion: 'Hareketi azalt',
    reducedMotionDescription: 'Uygulama genelinde animasyonları en aza indir',
  },

  notifications: {
    title: 'Bildirimler',
    push: 'Anlık bildirimler',
    pushDescription: 'Cihazınızda bildirim alın',
    email: 'E-posta bildirimleri',
    emailDescription: 'Önemli güncellemeleri e-posta ile alın',
    sounds: 'Ses efektleri',
    soundsDescription: 'Mesajlar ve uyarılar için ses çal',
    pacNotifications: 'Proaktif geri aramalar',
    pacNotificationsDescription: "YULA'nın proaktif bildirimler göndermesine izin ver",
  },

  privacy: {
    title: 'Gizlilik ve Veri',
    memoryEnabled: 'Hafızayı etkinleştir',
    memoryEnabledDescription: "YULA'nın konuşmalardan bilgi hatırlamasına izin ver",
    analyticsEnabled: 'Kullanım analitiği',
    analyticsEnabledDescription: "Anonim kullanım verisi paylaşarak YULA'yı geliştirmeye yardımcı olun",
    exportData: 'Verilerinizi dışa aktarın',
    exportDataDescription: 'Tüm konuşmalarınızı ve hafızanızı indirin',
    clearMemory: 'Hafızayı temizle',
    clearMemoryDescription: 'Saklanan tüm hafızaları sil',
    clearMemoryWarning: 'Bu, tüm hafızanızı kalıcı olarak silecektir. Bu işlem geri alınamaz.',
  },

  integrations: {
    title: 'Entegrasyonlar',
    connected: 'Bağlı',
    notConnected: 'Bağlı değil',
    connect: 'Bağlan',
    disconnect: 'Bağlantıyı kes',
    calendar: 'Takvim',
    calendarDescription: 'Daha iyi planlama için takviminizle senkronize edin',
  },

  advanced: {
    title: 'Gelişmiş',
    engineMode: 'Motor modu',
    engineModeOptions: {
      speed: 'Hız',
      speedDescription: 'Daha hızlı yanıtlar, çoğu görev için iyi',
      deep: 'Derin',
      deepDescription: 'Daha kapsamlı analiz, karmaşık görevler için daha iyi',
    },
    preferredModels: 'Tercih edilen modeller',
    preferredModelsDescription: 'Hangi AI modellerinin kullanılacağını seçin',
    developerMode: 'Geliştirici modu',
    developerModeDescription: 'Ek hata ayıklama bilgisi göster',
    apiKeys: 'API anahtarları',
    apiKeysDescription: 'Harici erişim için API anahtarlarınızı yönetin',
  },

  actions: {
    save: 'Değişiklikleri kaydet',
    saved: 'Değişiklikler kaydedildi',
    reset: 'Varsayılanlara sıfırla',
    resetConfirm: 'Tüm ayarları varsayılanlara sıfırlamak istediğinizden emin misiniz?',
  },
};
