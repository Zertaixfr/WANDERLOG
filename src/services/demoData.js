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
    { id: 'c1', text: 'Trop beau ! Tu me donnes trop envie 😍', userName: 'Marie', userId: 'u1', createdAt: { toDate: () => new Date('2026-03-15') } },
    { id: 'c2', text: 'C\'est quel quartier exactement ?', userName: 'Lucas', userId: 'u2', createdAt: { toDate: () => new Date('2026-03-16') } },
  ],
  'post-2': [
    { id: 'c3', text: 'Le trek vaut le coup même si c\'est dur ?', userName: 'Sophie', userId: 'u3', createdAt: { toDate: () => new Date('2026-03-02') } },
  ],
  'post-4': [
    { id: 'c4', text: 'Bon voyage Kilian !! 🎉', userName: 'Maman', userId: 'u4', createdAt: { toDate: () => new Date('2026-01-10') } },
    { id: 'c5', text: 'Ramène des pastéis !!', userName: 'Théo', userId: 'u5', createdAt: { toDate: () => new Date('2026-01-11') } },
    { id: 'c6', text: 'Profite à fond frérot', userName: 'Emma', userId: 'u6', createdAt: { toDate: () => new Date('2026-01-11') } },
  ],
}

export const DEMO_TRAVELER_STATUS = {
  latitude: 35.6894,
  longitude: 139.6917,
  country: 'Japon',
  city: 'Tokyo',
  departureDate: { toDate: () => new Date('2026-01-10') },
  countriesVisited: ['Portugal', 'Thaïlande', 'Indonésie', 'Japon'],
  totalKm: 18420,
  postsCount: 4,
}
