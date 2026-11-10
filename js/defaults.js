// Dados iniciais GENÉRICOS (cardápio e treinos de exemplo). Nenhum registro pessoal fica no código.
// Calorias são estimativas aproximadas e podem ser editadas no app.

export const DEFAULT_KCAL_REFERENCE = 1500;

const BATIDA_ORIGINAL = 'Batida original (150 ml de leite de amêndoas zero, ½ banana, 30 g de mirtilos, 30 g de whey)';

export const DEFAULT_MENU = [
  {
    id: 'cafe', name: 'Café da manhã', emoji: '☕', time: '08:00', planned: true,
    options: [
      { id: 'cafe-1', name: 'Batida de banana e mirtilos', kcal: 200,
        ingredients: ['150 ml de leite de amêndoas zero', '½ banana', '30 g de mirtilos', '30 g de whey'],
        lactoseTip: 'Whey isolado ou vegetal costuma ter menos lactose.' },
      { id: 'cafe-2', name: 'Batida de morango', kcal: 175,
        ingredients: ['150 ml de leite de amêndoas zero', '100 g de morangos', '30 g de whey'],
        lactoseTip: 'Whey isolado ou vegetal costuma ter menos lactose.' },
      { id: 'cafe-3', name: 'Batida de manga', kcal: 190,
        ingredients: ['150 ml de leite de amêndoas zero', '80 g de manga', '30 g de whey'],
        lactoseTip: 'Whey isolado ou vegetal costuma ter menos lactose.' }
    ]
  },
  {
    id: 'almoco', name: 'Almoço', emoji: '🍽️', time: '12:30', planned: true,
    options: [
      { id: 'almoco-1', name: 'Arroz com carne moída', kcal: 530,
        ingredients: ['120 g de arroz cozido', '150 g de carne moída magra', '150 g de legumes', '1 colher de chá de azeite'] },
      { id: 'almoco-2', name: 'Arroz com frango', kcal: 535,
        ingredients: ['150 g de arroz cozido', '150 g de frango grelhado', '150 g de legumes', '1 colher de chá de azeite'] },
      { id: 'almoco-3', name: 'Peixe com batata', kcal: 515,
        ingredients: ['180 g de tilápia', '250 g de batata cozida', '150 g de legumes', '1 colher de chá de azeite'] },
      { id: 'almoco-4', name: 'Macarrão à bolonhesa', kcal: 525,
        ingredients: ['160 g de macarrão cozido', '120 g de carne moída magra', '80 g de molho de tomate'] }
    ]
  },
  {
    id: 'lanche', name: 'Lanche da tarde', emoji: '🍓', time: '16:00', planned: true,
    options: [
      { id: 'lanche-1', name: 'Batida + cacetinho com queijo', kcal: 400,
        ingredients: [BATIDA_ORIGINAL, '1 cacetinho de 50 g', '30 g de mussarela light'],
        lactoseTip: 'Troque por mussarela sem lactose, se preferir.' },
      { id: 'lanche-2', name: 'Batida + tapioca', kcal: 390,
        ingredients: [BATIDA_ORIGINAL, '40 g de goma de tapioca', '30 g de mussarela light'],
        lactoseTip: 'Troque por mussarela sem lactose, se preferir.' },
      { id: 'lanche-3', name: 'Batida + ovos', kcal: 345,
        ingredients: [BATIDA_ORIGINAL, '2 ovos cozidos'] },
      { id: 'lanche-4', name: 'Batida + torradas', kcal: 340,
        ingredients: [BATIDA_ORIGINAL, '3 torradas integrais', '40 g de cottage sem lactose'] }
    ]
  },
  {
    id: 'jantar', name: 'Jantar', emoji: '🌙', time: '20:00', planned: true,
    options: [
      { id: 'jantar-1', name: 'Hambúrguer caseiro', kcal: 355,
        ingredients: ['Pão de hambúrguer de 50 g', 'Hambúrguer de carne moída magra de 100 g (pesado cru)', '20 g de mussarela light', 'Alface e tomate', '10 g de ketchup'],
        lactoseTip: 'Troque por mussarela sem lactose, se preferir.' },
      { id: 'jantar-2', name: 'Carne moída com arroz', kcal: 330,
        ingredients: ['120 g de carne moída magra', '70 g de arroz cozido', '100 g de salada'] },
      { id: 'jantar-3', name: 'Frango com arroz', kcal: 330,
        ingredients: ['120 g de frango', '80 g de arroz cozido', '100 g de salada'] },
      { id: 'jantar-4', name: 'Omelete com pão', kcal: 325,
        ingredients: ['2 ovos', '30 g de mussarela light', '1 fatia de pão integral', 'Tomate'],
        lactoseTip: 'Troque por mussarela sem lactose, se preferir.' },
      { id: 'jantar-5', name: 'Frango com batata', kcal: 340,
        ingredients: ['120 g de frango', '130 g de batata cozida', '100 g de legumes'] }
    ]
  }
];

const bike = (id) => ({ id, name: 'Bicicleta ergométrica', sets: '', reps: '5 minutos', note: 'Aquecimento' });

export const DEFAULT_WORKOUTS = [
  {
    id: 'A', name: 'Treino A', subtitle: 'Quadríceps e glúteos', emoji: '🍑',
    exercises: [
      bike('a1'),
      { id: 'a2', name: 'Leg press 45°', sets: '4', reps: '10–12', note: '' },
      { id: 'a3', name: 'Cadeira extensora', sets: '3', reps: '12–15', note: '' },
      { id: 'a4', name: 'Cadeira flexora', sets: '3', reps: '10–12', note: '' },
      { id: 'a5', name: 'Cadeira abdutora', sets: '3', reps: '15–20', note: '' },
      { id: 'a6', name: 'Elevação pélvica', sets: '3', reps: '10–12', note: '' },
      { id: 'a7', name: 'Panturrilha na máquina', sets: '3', reps: '15–20', note: '' }
    ]
  },
  {
    id: 'B', name: 'Treino B', subtitle: 'Superiores', emoji: '💗',
    exercises: [
      bike('b1'),
      { id: 'b2', name: 'Puxada alta pronada', sets: '3', reps: '10–12', note: '' },
      { id: 'b3', name: 'Remada baixa', sets: '3', reps: '10–12', note: '' },
      { id: 'b4', name: 'Desenvolvimento na máquina', sets: '3', reps: '10–12', note: '' },
      { id: 'b5', name: 'Voador invertido', sets: '3', reps: '12–15', note: '' },
      { id: 'b6', name: 'Chest press', sets: '3', reps: '10–12', note: '' },
      { id: 'b7', name: 'Bíceps na polia', sets: '3', reps: '10–12', note: '' },
      { id: 'b8', name: 'Tríceps na corda', sets: '3', reps: '10–12', note: '' }
    ]
  },
  {
    id: 'C', name: 'Treino C', subtitle: 'Posteriores e glúteos', emoji: '🌸',
    exercises: [
      bike('c1'),
      { id: 'c2', name: 'Elevação pélvica', sets: '4', reps: '10–12', note: '' },
      { id: 'c3', name: 'Leg press 45°', sets: '3', reps: '10–12', note: '' },
      { id: 'c4', name: 'Cadeira flexora', sets: '3', reps: '10–12', note: '' },
      { id: 'c5', name: 'Flexora em pé', sets: '3', reps: '10–12', note: '' },
      { id: 'c6', name: 'Cadeira abdutora', sets: '3', reps: '15–20', note: '' },
      { id: 'c7', name: 'Panturrilha na máquina', sets: '3', reps: '15–20', note: '' }
    ]
  }
];

export const DEFAULT_PREFERENCES = [
  'Prefiro máquinas.',
  'Não gosto de afundos.',
  'Não gosto de agachamento livre.',
  'Não tenho Smith.',
  'Não tenho glúteo na polia.',
  'Tenho histórico de desconforto na patela — respeitar o conforto do joelho.',
  'Prefiro treinos de 40–60 minutos.'
].join('\n');

export const SYMPTOMS = [
  { id: 'colicas', name: 'Cólicas' },
  { id: 'dor-cabeca', name: 'Dor de cabeça' },
  { id: 'inchaco', name: 'Inchaço' },
  { id: 'seios', name: 'Sensibilidade nos seios' },
  { id: 'acne', name: 'Acne' },
  { id: 'nausea', name: 'Náusea' },
  { id: 'cansaco', name: 'Cansaço' },
  { id: 'lombar', name: 'Dor lombar' },
  { id: 'intestino', name: 'Alterações intestinais' },
  { id: 'apetite', name: 'Aumento do apetite' },
  { id: 'doces', name: 'Desejo por doces' },
  { id: 'sono', name: 'Alterações do sono' },
  { id: 'libido', name: 'Alterações da libido' }
];

export const INTENSITIES = [
  { id: 1, name: 'leve' },
  { id: 2, name: 'moderada' },
  { id: 3, name: 'intensa' }
];

export const FLOWS = [
  { id: 'none', name: 'Sem sangramento', emoji: '⚪' },
  { id: 'spotting', name: 'Escape', emoji: '🩷' },
  { id: 'light', name: 'Leve', emoji: '💧' },
  { id: 'medium', name: 'Moderado', emoji: '💧💧' },
  { id: 'heavy', name: 'Intenso', emoji: '💧💧💧' }
];
export const BLEEDING_FLOWS = ['light', 'medium', 'heavy'];

export const MOODS = [
  { id: 'feliz', name: 'Feliz', emoji: '😊' },
  { id: 'tranquila', name: 'Tranquila', emoji: '😌' },
  { id: 'animada', name: 'Animada', emoji: '🥰' },
  { id: 'sensivel', name: 'Sensível', emoji: '🥹' },
  { id: 'irritada', name: 'Irritada', emoji: '😤' },
  { id: 'ansiosa', name: 'Ansiosa', emoji: '😟' },
  { id: 'triste', name: 'Triste', emoji: '😢' }
];

export const ENERGY = [
  { id: 'baixa', name: 'Baixa', emoji: '🪫', value: 1 },
  { id: 'media', name: 'Média', emoji: '🔋', value: 2 },
  { id: 'alta', name: 'Alta', emoji: '⚡', value: 3 }
];

export const SLEEP_QUALITY = [
  { id: 'ruim', name: 'Ruim', emoji: '😣' },
  { id: 'regular', name: 'Regular', emoji: '😐' },
  { id: 'boa', name: 'Boa', emoji: '😊' },
  { id: 'otima', name: 'Ótima', emoji: '😴💗' }
];

export const DEFAULT_CYCLE = { cycleLength: 28, periodLength: 5 };
