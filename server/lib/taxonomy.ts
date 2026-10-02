// A small knowledge map of professional fields. It lets the relevance ranking
// recognise that, say, CAD, electronics and ROS all relate to robotics even
// when two profiles share no tag verbatim.

interface DomainDef {
  id: string;
  label: string;
  related: string[];
  /** Exact skill / interest names that belong to this field. */
  terms: string[];
  /** Word prefixes used to place free text (job titles, custom tags) in a field. */
  keywords: string[];
}

const DOMAIN_DEFS: DomainDef[] = [
  {
    id: 'robotics',
    label: 'Robotics',
    related: ['engineering', 'software', 'ai'],
    terms: [
      'Robotics', 'ROS', 'SLAM', 'Motion Planning', 'Control Systems', 'Mechatronics', 'Embedded Systems',
      'Electronics', 'PCB Design', 'Arduino', 'CAD', 'SolidWorks', '3D Printing', 'Computer Vision',
      'Autonomous Systems', 'Drones', 'Sensors', 'C++', 'Mechanical Design', 'PLC Programming', 'RTOS',
      'Human-Robot Interaction', 'Open Hardware', 'Assistive Technology', 'Simulation',
    ],
    keywords: ['robot', 'mechatronic', 'autonomous', 'drone', 'uav', 'actuat'],
  },
  {
    id: 'software',
    label: 'Software engineering',
    related: ['ai', 'data', 'robotics', 'product'],
    terms: [
      'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Go', 'Rust', 'Java', 'C++', 'SQL', 'PostgreSQL',
      'GraphQL', 'AWS', 'Docker', 'Kubernetes', 'Terraform', 'System Design', 'APIs', 'CI/CD', 'Linux', 'Testing',
      'Swift', 'Kotlin', 'React Native', 'Open Source', 'Developer Tools', 'Cloud Infrastructure', 'Web Performance',
      'Mobile', 'Security', 'Git',
    ],
    keywords: ['software', 'developer', 'backend', 'frontend', 'full-stack', 'fullstack', 'devops', 'platform', 'web', 'mobile', 'ios', 'android', 'distributed'],
  },
  {
    id: 'ai',
    label: 'AI & machine learning',
    related: ['software', 'data', 'research', 'robotics'],
    terms: [
      'Machine Learning', 'Deep Learning', 'NLP', 'LLMs', 'Computer Vision', 'PyTorch', 'TensorFlow', 'MLOps',
      'Reinforcement Learning', 'Generative AI', 'AI', 'AI Safety', 'Data Science', 'Python', 'Autonomous Systems',
    ],
    keywords: ['machine learning', 'ai', 'ml', 'artificial intelligence', 'nlp', 'vision', 'deep learning', 'perception', 'reinforcement'],
  },
  {
    id: 'data',
    label: 'Data & analytics',
    related: ['ai', 'finance', 'research', 'product'],
    terms: [
      'SQL', 'Statistics', 'Data Analysis', 'Data Visualisation', 'R', 'Data Science', 'Analytics', 'Excel',
      'Quantitative Analysis', 'A/B Testing', 'Marketing Analytics', 'Sports Analytics', 'Forecasting',
    ],
    keywords: ['data', 'analyst', 'analytics', 'forecast', 'quantitative'],
  },
  {
    id: 'engineering',
    label: 'Engineering & hardware',
    related: ['robotics', 'climate'],
    terms: [
      'Mechanical Design', 'CAD', 'SolidWorks', 'AutoCAD', 'FEA', 'Prototyping', '3D Printing', 'Manufacturing',
      'Electrical Engineering', 'Electronics', 'PCB Design', 'Power Systems', 'MATLAB', 'Systems Engineering',
      'Control Systems', 'Structural Analysis', 'BIM', 'Embedded Systems', 'Simulation', 'Electric Vehicles',
      'IoT', 'Space', 'Urban Planning', 'Project Management',
    ],
    keywords: ['mechanical', 'electrical', 'aerospace', 'civil', 'embedded', 'hardware', 'structural', 'firmware', 'manufactur', 'industrial'],
  },
  {
    id: 'design',
    label: 'Design',
    related: ['product', 'marketing'],
    terms: [
      'UX Design', 'UI Design', 'Figma', 'Design Systems', 'Prototyping', 'User Research', 'Usability Testing',
      'Accessibility', 'Interaction Design', 'Visual Design', 'Branding', 'Illustration', 'Motion Design',
      'After Effects', 'Typography', 'Workshop Facilitation', 'Sustainable Design',
    ],
    keywords: ['design', 'ux', 'ui', 'brand', 'illustrat', 'motion', 'typograph'],
  },
  {
    id: 'product',
    label: 'Product',
    related: ['design', 'business', 'data', 'software'],
    terms: [
      'Product Strategy', 'Roadmapping', 'User Research', 'Analytics', 'A/B Testing', 'Agile',
      'Stakeholder Management', 'Product Discovery', 'Prototyping',
    ],
    keywords: ['product', 'roadmap', 'marketplace'],
  },
  {
    id: 'business',
    label: 'Entrepreneurship',
    related: ['product', 'finance', 'marketing'],
    terms: [
      'Fundraising', 'Business Strategy', 'Leadership', 'Pitching', 'Operations', 'Go-to-Market', 'Sales',
      'Partnerships', 'Startups', 'Venture Capital', 'Mentoring', 'E-commerce', 'Deep Tech',
    ],
    keywords: ['founder', 'ceo', 'entrepreneur', 'startup', 'venture', 'business'],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    related: ['business', 'design', 'product'],
    terms: [
      'Growth Marketing', 'SEO', 'Paid Ads', 'Marketing Analytics', 'Copywriting', 'Content Marketing',
      'Storytelling', 'Social Media', 'Brand Strategy', 'Community Building', 'Event Planning',
      'Behavioural Science', 'Podcasts',
    ],
    keywords: ['marketing', 'growth', 'content', 'community', 'social', 'seo', 'copywrit'],
  },
  {
    id: 'finance',
    label: 'Finance',
    related: ['business', 'data'],
    terms: [
      'Financial Modelling', 'Valuation', 'Investment Analysis', 'Accounting', 'Due Diligence', 'Venture Capital',
      'Risk Management', 'Quantitative Analysis', 'Excel', 'FinTech', 'Economics', 'Market Research',
    ],
    keywords: ['financ', 'invest', 'capital', 'fintech', 'accounting', 'risk', 'valuation'],
  },
  {
    id: 'research',
    label: 'Research',
    related: ['ai', 'data', 'climate', 'health'],
    terms: [
      'Research', 'Academic Writing', 'Experiment Design', 'Statistics', 'Data Analysis', 'Reinforcement Learning',
      'Neuroscience', 'Science Communication', 'Lab Techniques', 'Human-Computer Interaction', 'Education',
    ],
    keywords: ['research', 'phd', 'scientist', 'academic', 'institute', 'laboratory'],
  },
  {
    id: 'climate',
    label: 'Climate & energy',
    related: ['engineering', 'research'],
    terms: [
      'Renewable Energy', 'Climate Tech', 'Climate Modelling', 'Sustainability', 'Sustainable Design',
      'Power Systems', 'Electric Vehicles',
    ],
    keywords: ['climate', 'energy', 'solar', 'sustainab', 'renewable'],
  },
  {
    id: 'health',
    label: 'Health & biotech',
    related: ['research'],
    terms: ['Healthcare', 'Biotech', 'Lab Techniques', 'Neuroscience', 'Assistive Technology'],
    keywords: ['health', 'biomedical', 'biotech', 'medical', 'clinical'],
  },
];

export const normalise = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const labels = new Map(DOMAIN_DEFS.map((d) => [d.id, d.label]));

const termIndex = new Map<string, string[]>();
for (const domain of DOMAIN_DEFS) {
  for (const term of domain.terms) {
    const key = normalise(term);
    termIndex.set(key, [...(termIndex.get(key) ?? []), domain.id]);
  }
}

// Short keywords must match a whole word ("ai", "ux"); longer ones match as prefixes ("robot" → "robotics").
const keywordMatchers = DOMAIN_DEFS.map((domain) => ({
  id: domain.id,
  patterns: domain.keywords.map(
    (keyword) => new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword)}${keyword.length <= 3 ? '($|[^a-z0-9])' : ''}`),
  ),
}));

const neighbours = new Map<string, Set<string>>(DOMAIN_DEFS.map((d) => [d.id, new Set<string>()]));
for (const domain of DOMAIN_DEFS) {
  for (const other of domain.related) {
    neighbours.get(domain.id)!.add(other);
    neighbours.get(other)?.add(domain.id);
  }
}

export function domainLabel(id: string): string {
  return labels.get(id) ?? id;
}

/** Fields suggested by free text such as a job title. */
export function textDomains(text: string): string[] {
  const value = normalise(text);
  if (!value) return [];
  return keywordMatchers.filter((m) => m.patterns.some((p) => p.test(value))).map((m) => m.id);
}

/** Fields a skill or interest tag belongs to. Falls back to keyword detection for tags outside the map. */
export function termDomains(term: string): string[] {
  return termIndex.get(normalise(term)) ?? textDomains(term);
}

export type DomainVector = Map<string, number>;

export function addToVector(vector: DomainVector, domains: string[], weight: number): void {
  for (const id of domains) vector.set(id, (vector.get(id) ?? 0) + weight);
}

/** Spreads a little weight into neighbouring fields so "robotics" and "engineering" count as close. */
function smooth(vector: DomainVector): DomainVector {
  const result: DomainVector = new Map(vector);
  for (const [id, weight] of vector) {
    for (const other of neighbours.get(id) ?? []) {
      result.set(other, (result.get(other) ?? 0) + weight * 0.25);
    }
  }
  return result;
}

/** Cosine similarity between two field profiles, from 0 (unrelated) to 1 (same mix of fields). */
export function fieldSimilarity(a: DomainVector, b: DomainVector): number {
  if (a.size === 0 || b.size === 0) return 0;
  const sa = smooth(a);
  const sb = smooth(b);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [id, weight] of sa) {
    normA += weight * weight;
    dot += weight * (sb.get(id) ?? 0);
  }
  for (const weight of sb.values()) normB += weight * weight;
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

export function primaryDomain(vector: DomainVector): string | null {
  let best: string | null = null;
  let bestWeight = 0;
  for (const [id, weight] of vector) {
    if (weight > bestWeight) {
      best = id;
      bestWeight = weight;
    }
  }
  return best;
}

export function topDomains(vector: DomainVector, count: number): string[] {
  return [...vector.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, count)
    .map(([id]) => id);
}
