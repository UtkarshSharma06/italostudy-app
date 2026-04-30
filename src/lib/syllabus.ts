// CEN-S Official Syllabus Structure
export interface Topic {
  id: string;
  name: string;
  description?: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  topics: Topic[];
  totalQuestions: number;
}

export const SUBJECTS: Subject[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    icon: '📐',
    description: 'Algebra, geometry, calculus, and mathematical reasoning',
    color: 'primary',
    totalQuestions: 250,
    topics: [
      { id: 'numbers', name: 'Numbers & Arithmetic', description: 'Operations, fractions, decimals, percentages' },
      { id: 'algebra', name: 'Algebra', description: 'Equations, inequalities, polynomials' },
      { id: 'geometry', name: 'Geometry', description: 'Shapes, areas, volumes, angles' },
      { id: 'cartesian', name: 'Lines in Cartesian Plane', description: 'Coordinate geometry, slopes, distances' },
      { id: 'functions', name: 'Functions', description: 'Linear, quadratic, exponential functions' },
      { id: 'trigonometry', name: 'Trigonometry', description: 'Sine, cosine, tangent, identities' },
      { id: 'calculus', name: 'Calculus Basics', description: 'Limits, derivatives, integrals' },
      { id: 'statistics', name: 'Statistics & Probability', description: 'Mean, median, probability distributions' },
      { id: 'matrices', name: 'Matrices & Vectors', description: 'Matrix operations, vector algebra' },
      { id: 'sequences', name: 'Sequences & Series', description: 'Arithmetic, geometric progressions' },
    ],
  },
  {
    id: 'reasoning',
    name: 'Reasoning on texts & data',
    icon: '🧠',
    description: 'Critical thinking, data interpretation, and logical analysis',
    color: 'accent',
    totalQuestions: 200,
    topics: [
      { id: 'reading', name: 'Reading Comprehension', description: 'Understanding passages and arguments' },
      { id: 'critical', name: 'Critical Thinking', description: 'Analyzing arguments and conclusions' },
      { id: 'data-interpretation', name: 'Data Interpretation', description: 'Charts, graphs, tables' },
      { id: 'logical', name: 'Logical Reasoning', description: 'Deductive and inductive reasoning' },
      { id: 'verbal', name: 'Verbal Reasoning', description: 'Analogies, sentence completion' },
      { id: 'numerical', name: 'Numerical Reasoning', description: 'Number patterns, calculations' },
    ],
  },
  {
    id: 'biology',
    name: 'Biology',
    icon: '🧬',
    description: 'Cell biology, genetics, human physiology, and ecology',
    color: 'success',
    totalQuestions: 300,
    topics: [
      { id: 'cell', name: 'Cell Biology', description: 'Cell structure, organelles, division' },
      { id: 'genetics', name: 'Genetics', description: 'DNA, RNA, inheritance, mutations' },
      { id: 'physiology', name: 'Human Physiology', description: 'Body systems and functions' },
      { id: 'ecology', name: 'Ecology', description: 'Ecosystems, biodiversity, environment' },
      { id: 'evolution', name: 'Evolution', description: 'Natural selection, speciation' },
      { id: 'microbiology', name: 'Microbiology', description: 'Bacteria, viruses, immunity' },
      { id: 'botany', name: 'Plant Biology', description: 'Photosynthesis, plant systems' },
      { id: 'biotechnology', name: 'Biotechnology', description: 'Genetic engineering, applications' },
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    icon: '⚗️',
    description: 'Organic, inorganic, and physical chemistry fundamentals',
    color: 'warning',
    totalQuestions: 250,
    topics: [
      { id: 'atomic', name: 'Atomic Structure', description: 'Atoms, electrons, orbitals' },
      { id: 'periodic', name: 'Periodic Table', description: 'Elements, trends, properties' },
      { id: 'bonding', name: 'Chemical Bonding', description: 'Ionic, covalent, metallic bonds' },
      { id: 'reactions', name: 'Chemical Reactions', description: 'Equations, balancing, types' },
      { id: 'organic', name: 'Organic Chemistry', description: 'Hydrocarbons, functional groups' },
      { id: 'inorganic', name: 'Inorganic Chemistry', description: 'Metals, compounds, reactions' },
      { id: 'physical', name: 'Physical Chemistry', description: 'Thermodynamics, kinetics' },
      { id: 'solutions', name: 'Solutions & Acids/Bases', description: 'Concentration, pH, buffers' },
    ],
  },
  {
    id: 'physics',
    name: 'Physics',
    icon: '⚛️',
    description: 'Mechanics, thermodynamics, waves, and modern physics',
    color: 'destructive',
    totalQuestions: 250,
    topics: [
      { id: 'mechanics', name: 'Mechanics', description: 'Motion, forces, energy, momentum' },
      { id: 'thermodynamics', name: 'Thermodynamics', description: 'Heat, temperature, laws' },
      { id: 'waves', name: 'Waves & Optics', description: 'Light, sound, interference' },
      { id: 'electromagnetism', name: 'Electromagnetism', description: 'Electric fields, magnetism' },
      { id: 'circuits', name: 'Circuits', description: 'Current, resistance, capacitors' },
      { id: 'modern', name: 'Modern Physics', description: 'Quantum, relativity basics' },
      { id: 'fluids', name: 'Fluid Mechanics', description: 'Pressure, buoyancy, flow' },
      { id: 'nuclear', name: 'Nuclear Physics', description: 'Radioactivity, fission, fusion' },
    ],
  },
];

export const getSubjectById = (id: string): Subject | undefined => {
  return SUBJECTS.find(s => s.id === id);
};

export const getTopicById = (subjectId: string, topicId: string): Topic | undefined => {
  const subject = getSubjectById(subjectId);
  return subject?.topics.find(t => t.id === topicId);
};

export const getSubjectColor = (subjectId: string): string => {
  const subject = getSubjectById(subjectId);
  return subject?.color || 'primary';
};
