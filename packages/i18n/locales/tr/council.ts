export default {
  title: 'AI Konseyi',
  subtitle: 'Herhangi bir soruya birden fazla bakış açısı alın',

  personas: {
    logical: {
      name: 'Mantık',
      description: 'Analitik ve veri odaklı',
      trait: 'Analitik',
      model: 'Claude',
    },
    creative: {
      name: 'Yaratıcı',
      description: 'Yenilikçi ve alışılmışın dışında',
      trait: 'Yenilikçi',
      model: 'GPT-4',
    },
    prudent: {
      name: 'İhtiyatlı',
      description: 'Temkinli ve risk farkındalıklı',
      trait: 'Temkinli',
      model: 'Gemini',
    },
    swift: {
      name: 'Hızlı',
      description: 'Çabuk ve verimli',
      trait: 'Çabuk',
      model: 'Groq',
    },
  },

  status: {
    pending: 'Bekliyor...',
    thinking: 'Düşünüyor...',
    streaming: 'Yanıtlıyor...',
    complete: 'Tamamlandı',
    failed: 'Başarısız',
  },

  actions: {
    askCouncil: 'Konseye Sor',
    selectResponse: 'Bu yanıtı kullan',
    compareAll: 'Tümünü karşılaştır',
    synthesis: 'Sentezle',
    retry: 'Tekrar dene',
    retryAll: 'Tümünü tekrar dene',
  },

  synthesis: {
    title: 'Sentez',
    description: 'Tüm bakış açılarından birleştirilmiş içgörüler',
    generating: 'Sentez oluşturuluyor...',
    basedOn: '{count} bakış açısına dayalı',
  },

  selection: {
    title: 'Bir yanıt seçin',
    selectedResponse: 'Seçili yanıt',
    continueWith: 'Bu yanıtla devam et',
    viewOthers: 'Diğer yanıtları görüntüle',
  },

  stats: {
    latency: 'Yanıt süresi',
    tokens: 'Kullanılan token',
    model: 'Model',
    perspectives: '{count} bakış açısı',
  },

  empty: {
    title: 'AI Konseyine Sorun',
    subtitle: 'Farklı AI modellerinden birden fazla bakış açısı alın',
    examples: [
      'Bu iş teklifini kabul etmeli miyim?',
      'Bu teknik soruna nasıl yaklaşmalıyım?',
      'Uzaktan çalışmanın artıları ve eksileri neler?',
      'Şu konuda karar vermeme yardım et...',
    ],
  },

  comparison: {
    title: 'Yanıtları Karşılaştır',
    similarities: 'Benzerlikler',
    differences: 'Temel farklılıklar',
    recommendation: 'Önerilen seçim',
  },
};
