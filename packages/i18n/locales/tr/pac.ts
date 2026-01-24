export default {
  title: 'Proaktif Geri Aramalar',
  subtitle: 'İhtiyacınız olduğunda size ulaşan AI',

  types: {
    reminder: 'Hatırlatıcı',
    suggestion: 'Öneri',
    followUp: 'Takip',
    insight: 'İçgörü',
  },

  status: {
    pending: 'Beklemede',
    approved: 'Onaylandı',
    snoozed: 'Ertelendi',
    dismissed: 'Reddedildi',
    delivered: 'İletildi',
  },

  priority: {
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek',
  },

  actions: {
    approve: 'Onayla',
    snooze: 'Ertele',
    dismiss: 'Reddet',
    reply: 'Yanıtla',
    viewContext: 'Bağlamı görüntüle',
  },

  snooze: {
    title: 'Şu kadar ertele',
    fifteenMinutes: '15 dakika',
    oneHour: '1 saat',
    threeHours: '3 saat',
    tomorrow: 'Yarın',
    nextWeek: 'Gelecek hafta',
    custom: 'Özel...',
  },

  notifications: {
    title: 'YULA Bildirimi',
    newCallback: 'Yeni proaktif geri arama',
    tapToView: 'Görüntülemek için dokunun',
  },

  empty: {
    title: 'Bekleyen geri arama yok',
    subtitle: 'YULA konuşmalarınızda taahhütler tespit ettiğinde size ulaşacak',
  },

  settings: {
    title: 'PAC Ayarları',
    enabled: 'Proaktif geri aramaları etkinleştir',
    enabledDescription: "YULA'nın size proaktif bildirimler göndermesine izin verin",
    explicitOnly: 'Yalnızca açık taahhütler',
    explicitOnlyDescription: 'Yalnızca "hatırlat" gibi açık taahhütler için bildir',
    implicitDetection: 'Örtük tespit',
    implicitDetectionDescription: 'Konuşmalardaki ima edilen taahhütleri de tespit et',
    channels: {
      title: 'Bildirim kanalları',
      push: 'Anlık bildirimler',
      email: 'E-posta bildirimleri',
      inApp: 'Uygulama içi bildirimler',
    },
    quietHours: {
      title: 'Sessiz saatler',
      description: 'Bu saatlerde bildirim yok',
      start: 'Başlangıç saati',
      end: 'Bitiş saati',
    },
  },

  demo: {
    notification1: {
      title: 'Toplantı hazırlığını hatırlıyor musun?',
      message: 'Q4 incelemesi için hazırlanmaktan bahsetmiştin. Konuşma noktaları hazırlamana yardımcı olmamı ister misin?',
    },
    notification2: {
      title: 'Annenin doğum günü yarın!',
      message: 'Çiçek siparişi vermek istediğinden bahsetmiştin. Yakındaki çiçekçileri bulmana yardımcı olayım mı?',
    },
    notification3: {
      title: 'Projeni takip et',
      message: 'Kimlik doğrulama sorununu çözmeye çalışıyordun. Token yenilemeyi düzeltebildin mi?',
    },
  },
};
