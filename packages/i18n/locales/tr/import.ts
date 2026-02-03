export default {
  title: 'Geçmişi İçe Aktar',
  subtitle: 'Diğer AI asistanlarından konuşmalarınızı aktarın',

  sources: {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    other: 'Diğer',
  },

  upload: {
    title: 'Dışa aktarma dosyanızı yükleyin',
    description: 'Dosyanızı buraya sürükleyip bırakın veya göz atmak için tıklayın',
    browse: 'Dosyalara göz at',
    supportedFormats: 'Desteklenen formatlar: JSON, ZIP',
    maxSize: 'Maksimum dosya boyutu: 100MB',
    uploading: 'Yükleniyor...',
    processing: 'İşleniyor...',
  },

  instructions: {
    chatgpt: {
      title: "ChatGPT'den nasıl dışa aktarılır",
      steps: [
        'ChatGPT Ayarlarına gidin',
        '"Veri Kontrolleri"ne tıklayın',
        '"Veriyi dışa aktar"a tıklayın',
        'İndirme bağlantısı içeren e-postayı bekleyin',
        'ZIP dosyasını indirin ve buraya yükleyin',
      ],
    },
    claude: {
      title: "Claude'dan nasıl dışa aktarılır",
      steps: [
        'Claude Ayarlarına gidin',
        '"Verileriniz"e gidin',
        '"Konuşmaları dışa aktar"a tıklayın',
        'Dışa aktarılan dosyayı indirin',
        'Dosyayı buraya yükleyin',
      ],
    },
  },

  preview: {
    title: 'İçe aktarmayı önizle',
    subtitle: 'Hangi konuşmaları içe aktaracağınızı inceleyin ve seçin',
    selectAll: 'Tümünü seç',
    deselectAll: 'Tümünün seçimini kaldır',
    selected: '{count} seçili',
    conversations: '{count} konuşma',
    conversations_plural: '{count} konuşma',
    messages: '{count} mesaj',
    messages_plural: '{count} mesaj',
  },

  progress: {
    importing: 'İçe aktarılıyor...',
    imported: '{current} / {total} içe aktarıldı',
    complete: 'İçe aktarma tamamlandı!',
    failed: 'İçe aktarma başarısız',
  },

  results: {
    success: 'Başarıyla içe aktarıldı!',
    conversationsImported: '{count} konuşma içe aktarıldı',
    conversationsImported_plural: '{count} konuşma içe aktarıldı',
    messagesImported: '{count} mesaj içe aktarıldı',
    messagesImported_plural: '{count} mesaj içe aktarıldı',
    viewConversations: 'Konuşmaları görüntüle',
    importMore: 'Daha fazla içe aktar',
  },

  errors: {
    invalidFile: 'Geçersiz dosya formatı',
    fileTooLarge: 'Dosya çok büyük',
    parsingFailed: 'Dosya ayrıştırılamadı',
    importFailed: 'İçe aktarma başarısız',
    noConversations: 'Dosyada konuşma bulunamadı',
  },
};
