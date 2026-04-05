// Données de démonstration — utilisées quand Firebase n'est pas configuré
export const DEMO_USER = {
  uid: 'demo-user',
  email: 'demo@wanderlog.app',
  displayName: 'Voyageur',
}

export const DEMO_ADMIN = {
  uid: 'demo-admin',
  email: 'kilian@wanderlog.app',
  displayName: 'Kilian',
}

export const DEMO_POSTS = [
  {
    id: 'post-1',
    text: 'Premier jour à Tokyo ! Les ruelles de Shinjuku sont incroyables la nuit, entre les néons et les izakayas cachés. J\'ai goûté les meilleurs ramen de ma vie dans un petit resto de 6 places.',
    location: 'Shinjuku, Tokyo',
    country: 'Japon',
    coordinates: { latitude: 35.6894, longitude: 139.6917 },
    media: [],
    likes: ['demo-user'],
    likesCount: 1,
    commentsCount: 2,
    createdAt: { toDate: () => new Date('2026-03-15') },
  },
  {
    id: 'post-2',
    text: 'Deux semaines à Bali, c\'est un rêve éveillé. Ce matin, lever de soleil depuis le Mont Batur après 2h de trek dans le noir. La vue sur le lac et le volcan Agung au loin... pas de mots.',
    location: 'Mont Batur, Bali',
    country: 'Indonésie',
    coordinates: { latitude: -8.2418, longitude: 115.3753 },
    media: [],
    likes: [],
    likesCount: 0,
    commentsCount: 1,
    createdAt: { toDate: () => new Date('2026-03-01') },
  },
  {
    id: 'post-3',
    text: 'Bangkok by night. Le rooftop du Vertigo m\'a mis une claque. La ville s\'étend à l\'infini, des temples dorés aux gratte-ciels. Demain direction les marchés flottants !',
    location: 'Bangkok',
    country: 'Thaïlande',
    coordinates: { latitude: 13.7563, longitude: 100.5018 },
    media: [],
    likes: ['demo-user', 'demo-admin'],
    likesCount: 2,
    commentsCount: 0,
    createdAt: { toDate: () => new Date('2026-02-20') },
  },
  {
    id: 'post-4',
    text: 'Arrivée à Lisbonne pour le début du voyage ! Le Tram 28, les pastéis de nata à Belém, et les azulejos partout dans l\'Alfama. Le Portugal est un bijou.',
    location: 'Lisbonne',
    country: 'Portugal',
    coordinates: { latitude: 38.7223, longitude: -9.1393 },
    media: [],
    likes: ['demo-admin'],
    likesCount: 1,
    commentsCount: 3,
    createdAt: { toDate: () => new Date('2026-01-10') },
  },
]

export const DEMO_COMMENTS = {
  'post-1': [
    { id: 'c1', text: 'Trop beau ! Tu me donnes trop envie \u{1F60D}', userName: 'Marie', userId: 'u1', createdAt: { toDate: () => new Date('2026-03-15') } },
    { id: 'c2', text: 'C\'est quel quartier exactement ?', userName: 'Lucas', userId: 'u2', createdAt: { toDate: () => new Date('2026-03-16') } },
  ],
  'post-2': [
    { id: 'c3', text: 'Le trek vaut le coup m\u00EAme si c\'est dur ?', userName: 'Sophie', userId: 'u3', createdAt: { toDate: () => new Date('2026-03-02') } },
  ],
  'post-4': [
    { id: 'c4', text: 'Bon voyage Kilian !! \u{1F389}', userName: 'Maman', userId: 'u4', createdAt: { toDate: () => new Date('2026-01-10') } },
    { id: 'c5', text: 'Ram\u00E8ne des past\u00E9is !!', userName: 'Th\u00E9o', userId: 'u5', createdAt: { toDate: () => new Date('2026-01-11') } },
    { id: 'c6', text: 'Profite \u00E0 fond fr\u00E9rot', userName: 'Emma', userId: 'u6', createdAt: { toDate: () => new Date('2026-01-11') } },
  ],
}

export const DEMO_TRAVELER_STATUS = {
  latitude: 35.6894,
  longitude: 139.6917,
  country: 'Japon',
  city: 'Tokyo',
  bio: 'Dev fran\u00E7ais en tour du monde \u2014 \u00E0 la recherche de ramen, de couchers de soleil et d\'aventures.',
  mood: '\u{1F60A} Heureux et fatigu\u00E9 apr\u00E8s 3h de marche dans Shibuya',
  weather: { icon: '\u2600\uFE0F', temp: '22\u00B0C' },
  departureDate: { toDate: () => new Date('2026-01-10') },
  countriesVisited: ['Portugal', 'Tha\u00EFlande', 'Indon\u00E9sie', 'Japon'],
  totalKm: 18420,
  postsCount: 4,
  nextDestinations: [
    { city: 'S\u00E9oul', country: 'Cor\u00E9e du Sud', date: 'Avril' },
    { city: 'Hano\u00EF', country: 'Vietnam', date: 'Mai' },
    { city: 'Sydney', country: 'Australie', date: 'Juin' },
  ],
  bucketList: [
    { text: 'Voir le lever de soleil sur le Mont Fuji', done: false },
    { text: 'Manger des vrais tacos au Mexique', done: false },
    { text: 'Plonger dans la Grande Barri\u00E8re de Corail', done: false },
    { text: 'Faire le trek du Mont Batur \u00E0 Bali', done: true },
    { text: 'Go\u00FBter les past\u00E9is de nata \u00E0 Bel\u00E9m', done: true },
    { text: 'Visiter un temple bouddhiste en Tha\u00EFlande', done: true },
    { text: 'Prendre le Shinkansen au Japon', done: true },
  ],
  tips: [
    {
      icon: '\u{1F35C}',
      title: 'Fuunji Ramen',
      description: 'Les meilleurs tsukemen de Tokyo. File d\'attente de 30min mais \u00E7a vaut le coup.',
      location: 'Shinjuku, Tokyo',
    },
    {
      icon: '\u{1F3D6}\uFE0F',
      title: 'Nusa Penida',
      description: '\u00CEle magnifique \u00E0 30min de bateau de Bali. Kelingking Beach est irr\u00E9el.',
      location: 'Bali, Indon\u00E9sie',
    },
    {
      icon: '\u{1F6F5}',
      title: 'Louer un scooter',
      description: 'Le meilleur moyen de d\u00E9couvrir Bali et Bangkok. ~5\u20AC/jour.',
      location: 'Asie du Sud-Est',
    },
    {
      icon: '\u{1F3DB}\uFE0F',
      title: 'Alfama au coucher du soleil',
      description: 'Monter au Miradouro da Gra\u00E7a pour la plus belle vue sur Lisbonne.',
      location: 'Lisbonne, Portugal',
    },
  ],
}
