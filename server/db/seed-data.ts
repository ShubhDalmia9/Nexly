import type { ConnectionTypeId, ProjectType } from '../../shared/constants';

// Demo content. Every person and company below is fictional.

export interface SeedProject {
  title: string;
  description: string;
  type: ProjectType;
  role: string;
  year: number;
  skills: string[];
}

export interface SeedPerson {
  /** Unique key; also the local part of the demo email address. */
  key: string;
  fullName: string;
  profession: string;
  workplace: string;
  specialisation: string;
  location: string;
  about: string;
  aspirations: string;
  skills: string[];
  interests: string[];
  goals: string[];
  lookingFor: ConnectionTypeId[];
  projects: SeedProject[];
  joinedDaysAgo: number;
}

export const DEMO_EMAIL_DOMAIN = 'nexly.example';

export const CURATED_SKILLS = [
  'Python', 'C++', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Java', 'Swift', 'Kotlin', 'SQL', 'R', 'MATLAB',
  'React', 'Node.js', 'React Native', 'GraphQL', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes', 'Terraform', 'Linux',
  'CI/CD', 'APIs', 'System Design', 'Testing', 'Machine Learning', 'Deep Learning', 'NLP', 'LLMs', 'Computer Vision',
  'PyTorch', 'TensorFlow', 'MLOps', 'Reinforcement Learning', 'Data Science', 'Statistics', 'Data Analysis',
  'Data Visualisation', 'Robotics', 'ROS', 'SLAM', 'Motion Planning', 'Control Systems', 'Mechatronics',
  'Embedded Systems', 'Electronics', 'PCB Design', 'Arduino', 'RTOS', 'PLC Programming', 'CAD', 'SolidWorks',
  'AutoCAD', 'FEA', '3D Printing', 'Mechanical Design', 'Prototyping', 'Systems Engineering', 'Simulation',
  'Electrical Engineering', 'Power Systems', 'Structural Analysis', 'BIM', 'Project Management', 'UX Design',
  'UI Design', 'Figma', 'Design Systems', 'User Research', 'Usability Testing', 'Accessibility', 'Branding',
  'Illustration', 'Motion Design', 'Visual Design', 'After Effects', 'Workshop Facilitation', 'Product Strategy',
  'Roadmapping', 'Analytics', 'A/B Testing', 'Agile', 'Stakeholder Management', 'Fundraising', 'Business Strategy',
  'Leadership', 'Pitching', 'Operations', 'Go-to-Market', 'Sales', 'Partnerships', 'Growth Marketing', 'SEO',
  'Paid Ads', 'Marketing Analytics', 'Copywriting', 'Content Marketing', 'Storytelling', 'Social Media',
  'Brand Strategy', 'Community Building', 'Event Planning', 'Financial Modelling', 'Valuation',
  'Investment Analysis', 'Accounting', 'Due Diligence', 'Venture Capital', 'Risk Management',
  'Quantitative Analysis', 'Excel', 'Market Research', 'Research', 'Academic Writing', 'Experiment Design',
  'Lab Techniques', 'Climate Modelling', 'Renewable Energy', 'Sustainability',
];

export const CURATED_INTERESTS = [
  'Robotics', 'Autonomous Systems', 'Drones', 'AI', 'AI Safety', 'Open Source', 'Developer Tools',
  'Cloud Infrastructure', 'Startups', 'Climate Tech', 'Renewable Energy', 'FinTech', 'Healthcare', 'Biotech',
  'Education', 'Design Systems', 'Accessibility', 'Typography', 'Sustainability', 'Sustainable Design', 'IoT',
  'Electric Vehicles', 'Space', 'Open Hardware', 'Venture Capital', 'Behavioural Science', 'E-commerce',
  'Community Building', 'Mentoring', 'Web Performance', 'Mobile', 'Security', 'Manufacturing', 'Neuroscience',
  'Science Communication', 'Urban Planning', 'AR/VR', 'Sports Analytics', 'Economics', 'Deep Tech', 'Podcasts',
  'Music', 'Assistive Technology', 'Human-Computer Interaction',
];

export const CURATED_GOALS = [
  'Launch a startup', 'Become a technical lead', 'Find a mentor', 'Mentor others', 'Publish research',
  'Switch into AI', 'Build open-source tools', 'Grow a personal brand', 'Move into product', 'Raise a seed round',
  'Lead a team', 'Work on climate tech', 'Ship a hardware product', 'Join an early-stage startup',
  'Speak at conferences', 'Start a PhD', 'Build in public', 'Go freelance', 'Move into venture capital',
];

export const PEOPLE: SeedPerson[] = [
  // ---------- Robotics ----------
  {
    key: 'alex',
    fullName: 'Alex Rivera',
    profession: 'Robotics Software Engineer',
    workplace: 'Helix Robotics',
    specialisation: 'Autonomous navigation',
    location: 'Bengaluru, India',
    about:
      'I write the software that lets mobile robots find their way around warehouses. Most of my week is spent between perception code, path planners and a test floor full of rovers.',
    aspirations: 'Grow into a technical lead and take a robot from prototype to a product that ships at scale.',
    skills: ['Python', 'C++', 'ROS', 'Computer Vision', 'Motion Planning', 'SLAM', 'Linux'],
    interests: ['Robotics', 'Autonomous Systems', 'Open Source', 'Drones', 'AI'],
    goals: ['Become a technical lead', 'Ship a hardware product', 'Build open-source tools'],
    lookingFor: ['mentor', 'collaborator', 'project_partner'],
    projects: [
      {
        title: 'Warehouse rover navigation stack',
        description: 'Localisation and path planning for a fleet of 40 autonomous rovers working alongside people.',
        type: 'Hardware',
        role: 'Navigation engineer',
        year: 2025,
        skills: ['ROS', 'SLAM', 'C++', 'Motion Planning'],
      },
      {
        title: 'OpenLidar toolkit',
        description: 'An open-source Python library for cleaning and visualising lidar point clouds.',
        type: 'Open source',
        role: 'Maintainer',
        year: 2024,
        skills: ['Python', 'Computer Vision'],
      },
    ],
    joinedDaysAgo: 60,
  },
  {
    key: 'maya',
    fullName: 'Maya Okafor',
    profession: 'Mechanical Design Engineer',
    workplace: 'Kestrel Dynamics',
    specialisation: 'Robotic mechanisms and actuation',
    location: 'Lagos, Nigeria',
    about:
      'I design the moving parts of robots: joints, grippers and the frames that hold everything together. I like quick prototypes and designs that can be built without exotic tooling.',
    aspirations: 'Bring an affordable robotic arm to market for schools and small workshops.',
    skills: ['CAD', 'SolidWorks', 'Mechanical Design', '3D Printing', 'Prototyping', 'FEA', 'Robotics'],
    interests: ['Robotics', 'Drones', 'Sustainable Design', 'Open Source'],
    goals: ['Ship a hardware product', 'Launch a startup'],
    lookingFor: ['collaborator', 'project_partner', 'cofounder'],
    projects: [
      {
        title: 'Low-cost 6-axis robotic arm',
        description: 'A printable desktop arm with 1 kg payload, designed so a school lab can build it for under $400.',
        type: 'Hardware',
        role: 'Lead designer',
        year: 2025,
        skills: ['CAD', '3D Printing', 'Robotics', 'Mechanical Design'],
      },
      {
        title: 'Foldable survey drone frame',
        description: 'A carbon-fibre quadcopter frame that folds into a backpack for field mapping teams.',
        type: 'Hardware',
        role: 'Mechanical engineer',
        year: 2023,
        skills: ['SolidWorks', 'FEA', 'Prototyping'],
      },
    ],
    joinedDaysAgo: 41,
  },
  {
    key: 'kenji',
    fullName: 'Kenji Watanabe',
    profession: 'Embedded Systems Engineer',
    workplace: 'Voltline Labs',
    specialisation: 'Motor control and firmware',
    location: 'Osaka, Japan',
    about:
      'Fifteen years of firmware for things that spin: motor drivers, gimbals and robot joints. I enjoy helping newer engineers get comfortable close to the hardware.',
    aspirations: 'Mentor the next generation of robotics engineers while shipping a new open motor controller.',
    skills: ['Embedded Systems', 'C++', 'Electronics', 'PCB Design', 'Control Systems', 'Arduino', 'RTOS'],
    interests: ['Robotics', 'IoT', 'Electric Vehicles', 'Open Hardware'],
    goals: ['Mentor others', 'Ship a hardware product'],
    lookingFor: ['mentee', 'collaborator', 'project_partner'],
    projects: [
      {
        title: 'Open brushless motor controller',
        description: 'An open-hardware FOC controller for robot joints, with a CAN interface and a ROS driver.',
        type: 'Open source',
        role: 'Creator',
        year: 2025,
        skills: ['PCB Design', 'Embedded Systems', 'C++', 'Control Systems'],
      },
    ],
    joinedDaysAgo: 75,
  },
  {
    key: 'sofia',
    fullName: 'Sofia Lindqvist',
    profession: 'Robotics Research Engineer',
    workplace: 'Nordlys Autonomy',
    specialisation: 'Perception for mobile robots',
    location: 'Stockholm, Sweden',
    about:
      'I work on how robots see: turning camera and lidar data into maps a planner can trust, especially in snow, rain and low light.',
    aspirations: 'Publish robust-perception research that makes it out of the lab and onto real vehicles.',
    skills: ['Computer Vision', 'Python', 'ROS', 'Deep Learning', 'SLAM', 'PyTorch'],
    interests: ['Autonomous Systems', 'Robotics', 'AI', 'Open Source'],
    goals: ['Publish research', 'Become a technical lead'],
    lookingFor: ['collaborator', 'peer', 'mentee'],
    projects: [
      {
        title: 'All-weather visual SLAM',
        description: 'A SLAM pipeline that keeps tracking through snowfall by fusing thermal and RGB cameras.',
        type: 'Research',
        role: 'Research engineer',
        year: 2025,
        skills: ['SLAM', 'Computer Vision', 'PyTorch'],
      },
    ],
    joinedDaysAgo: 52,
  },
  {
    key: 'diego',
    fullName: 'Diego Fernández',
    profession: 'Mechatronics Engineer',
    workplace: 'Andes Automation',
    specialisation: 'Industrial automation',
    location: 'Santiago, Chile',
    about:
      'I automate production lines for food and packaging plants, from the control cabinet to the robot cell. I am now sketching a product of my own.',
    aspirations: 'Start a company that makes small-batch factory automation affordable in Latin America.',
    skills: ['Mechatronics', 'PLC Programming', 'Control Systems', 'Electronics', 'CAD', 'Python'],
    interests: ['Robotics', 'Manufacturing', 'IoT', 'Startups'],
    goals: ['Launch a startup', 'Lead a team'],
    lookingFor: ['cofounder', 'investor', 'peer'],
    projects: [
      {
        title: 'Modular pick-and-place cell',
        description: 'A robot cell that can be reconfigured for a new product in under an hour.',
        type: 'Hardware',
        role: 'Project lead',
        year: 2024,
        skills: ['PLC Programming', 'Mechatronics', 'CAD'],
      },
    ],
    joinedDaysAgo: 33,
  },

  // ---------- Software engineering ----------
  {
    key: 'priyanka',
    fullName: 'Priyanka Sharma',
    profession: 'Senior Backend Engineer',
    workplace: 'Lumen Stack',
    specialisation: 'Distributed systems',
    location: 'Bengaluru, India',
    about:
      'I build the services that keep a developer platform fast under load. I care about clear system design and about making on-call boring.',
    aspirations: 'Share what I have learned about scaling systems through talks and mentoring.',
    skills: ['Go', 'Python', 'PostgreSQL', 'Kubernetes', 'System Design', 'AWS', 'Docker'],
    interests: ['Open Source', 'Developer Tools', 'Cloud Infrastructure', 'Mentoring'],
    goals: ['Mentor others', 'Speak at conferences'],
    lookingFor: ['mentee', 'peer', 'collaborator'],
    projects: [
      {
        title: 'Queue-backed job scheduler',
        description: 'A Postgres-based job scheduler handling 20 million tasks a day with exactly-once semantics.',
        type: 'Product',
        role: 'Tech lead',
        year: 2025,
        skills: ['Go', 'PostgreSQL', 'System Design'],
      },
    ],
    joinedDaysAgo: 88,
  },
  {
    key: 'tom',
    fullName: 'Tom Becker',
    profession: 'Full-Stack Developer',
    workplace: 'Pinecrest Digital',
    specialisation: 'Web applications',
    location: 'Berlin, Germany',
    about:
      'Agency developer who has shipped more than thirty web apps. I am happiest owning a product end to end, from database schema to the last pixel.',
    aspirations: 'Join or start an early-stage product company as its first engineer.',
    skills: ['TypeScript', 'React', 'Node.js', 'GraphQL', 'PostgreSQL', 'Testing'],
    interests: ['Open Source', 'Web Performance', 'Startups', 'Design Systems'],
    goals: ['Join an early-stage startup', 'Build open-source tools'],
    lookingFor: ['cofounder', 'hiring', 'collaborator'],
    projects: [
      {
        title: 'Formwise',
        description: 'An open-source React form library focused on accessibility and tiny bundle size.',
        type: 'Open source',
        role: 'Author',
        year: 2024,
        skills: ['TypeScript', 'React', 'Testing'],
      },
    ],
    joinedDaysAgo: 19,
  },
  {
    key: 'aisha',
    fullName: 'Aisha Rahman',
    profession: 'Mobile Engineer',
    workplace: 'Parcelway',
    specialisation: 'iOS and cross-platform apps',
    location: 'Dubai, UAE',
    about:
      'I build the courier and customer apps for a last-mile delivery company. Offline-first design and accessibility are the parts I enjoy most.',
    aspirations: 'Lead a mobile team, and eventually take on freelance work for products I believe in.',
    skills: ['Swift', 'Kotlin', 'React Native', 'APIs', 'Testing', 'UI Design'],
    interests: ['Mobile', 'Accessibility', 'FinTech', 'Startups'],
    goals: ['Become a technical lead', 'Go freelance'],
    lookingFor: ['mentor', 'peer', 'project_partner'],
    projects: [
      {
        title: 'Offline-first courier app',
        description: 'A delivery app that keeps working through patchy coverage and syncs when a signal returns.',
        type: 'Product',
        role: 'iOS lead',
        year: 2025,
        skills: ['Swift', 'APIs', 'Testing'],
      },
    ],
    joinedDaysAgo: 27,
  },
  {
    key: 'lucas',
    fullName: 'Lucas Moreau',
    profession: 'Platform Engineer',
    workplace: 'Cobalt Cloud',
    specialisation: 'Infrastructure and DevOps',
    location: 'Paris, France',
    about:
      'I look after the build and deploy pipeline for 200 engineers. At weekends I tinker with a small robot that waters my plants.',
    aspirations: 'Turn our internal deployment tooling into an open-source project.',
    skills: ['Kubernetes', 'Terraform', 'AWS', 'Docker', 'Linux', 'Python', 'CI/CD'],
    interests: ['Cloud Infrastructure', 'Open Source', 'Security', 'Robotics'],
    goals: ['Build open-source tools', 'Speak at conferences'],
    lookingFor: ['collaborator', 'peer'],
    projects: [
      {
        title: 'Shipyard',
        description: 'A deployment tool that gives every pull request its own short-lived environment.',
        type: 'Open source',
        role: 'Maintainer',
        year: 2025,
        skills: ['Kubernetes', 'Terraform', 'CI/CD'],
      },
    ],
    joinedDaysAgo: 46,
  },

  // ---------- AI ----------
  {
    key: 'hannah',
    fullName: 'Hannah Cole',
    profession: 'Machine Learning Engineer',
    workplace: 'Northwind AI',
    specialisation: 'Language models in production',
    location: 'Toronto, Canada',
    about:
      'I take language models from a notebook to something a support team can rely on: evaluation, retrieval, monitoring and cost control.',
    aspirations: 'Publish practical evaluation methods and mentor engineers moving into machine learning.',
    skills: ['Python', 'PyTorch', 'NLP', 'LLMs', 'MLOps', 'Deep Learning'],
    interests: ['AI', 'AI Safety', 'Open Source', 'Education'],
    goals: ['Publish research', 'Mentor others'],
    lookingFor: ['mentee', 'collaborator', 'peer'],
    projects: [
      {
        title: 'Evalkit',
        description: 'An open-source toolkit for regression-testing LLM applications against real conversations.',
        type: 'Open source',
        role: 'Creator',
        year: 2025,
        skills: ['Python', 'LLMs', 'MLOps'],
      },
    ],
    joinedDaysAgo: 38,
  },
  {
    key: 'arjun',
    fullName: 'Arjun Mehta',
    profession: 'Data Scientist',
    workplace: 'Quantleaf Analytics',
    specialisation: 'Demand forecasting',
    location: 'Mumbai, India',
    about:
      'I build forecasting models for retailers and spend a lot of time explaining uncertainty to people who would prefer a single number.',
    aspirations: 'Move closer to product decisions and lead a data team.',
    skills: ['Python', 'SQL', 'Statistics', 'Machine Learning', 'Data Visualisation', 'R'],
    interests: ['AI', 'FinTech', 'Sports Analytics', 'E-commerce'],
    goals: ['Move into product', 'Find a mentor'],
    lookingFor: ['mentor', 'hiring', 'peer'],
    projects: [
      {
        title: 'Festival-season demand model',
        description: 'A hierarchical forecast that cut stock-outs by 18% across 300 stores during peak season.',
        type: 'Client work',
        role: 'Lead data scientist',
        year: 2024,
        skills: ['Python', 'Statistics', 'Machine Learning'],
      },
    ],
    joinedDaysAgo: 23,
  },
  {
    key: 'wei',
    fullName: 'Wei Chen',
    profession: 'Computer Vision Engineer',
    workplace: 'Optica Labs',
    specialisation: '3D perception',
    location: 'Shenzhen, China',
    about:
      'I build depth and 3D reconstruction systems for drones and handheld scanners, and I am looking for people to build a product with.',
    aspirations: 'Found a company that gives small robots reliable 3D vision at a hobbyist price.',
    skills: ['Computer Vision', 'Deep Learning', 'PyTorch', 'C++', 'Python', 'SLAM'],
    interests: ['Robotics', 'Autonomous Systems', 'AR/VR', 'Drones'],
    goals: ['Launch a startup', 'Ship a hardware product'],
    lookingFor: ['cofounder', 'collaborator', 'project_partner'],
    projects: [
      {
        title: 'Pocket depth camera',
        description: 'A stereo depth module the size of a matchbox, with on-device neural depth estimation.',
        type: 'Hardware',
        role: 'Vision lead',
        year: 2025,
        skills: ['Computer Vision', 'Deep Learning', 'C++'],
      },
    ],
    joinedDaysAgo: 30,
  },
  {
    key: 'zainab',
    fullName: 'Zainab Hussain',
    profession: 'AI Research Scientist',
    workplace: 'Meridian Institute',
    specialisation: 'Reinforcement learning',
    location: 'London, UK',
    about:
      'My research is on agents that learn safely in the physical world, where a bad exploratory action can break something expensive.',
    aspirations: 'Publish work that makes learned controllers safe enough for real robots.',
    skills: ['Reinforcement Learning', 'Python', 'PyTorch', 'Deep Learning', 'Research', 'Statistics'],
    interests: ['AI Safety', 'Robotics', 'AI', 'Neuroscience'],
    goals: ['Publish research', 'Mentor others'],
    lookingFor: ['collaborator', 'mentee', 'peer'],
    projects: [
      {
        title: 'Safe exploration for legged robots',
        description: 'A constrained RL method that learned to walk on a quadruped without a single hardware fault.',
        type: 'Research',
        role: 'Principal investigator',
        year: 2025,
        skills: ['Reinforcement Learning', 'PyTorch', 'Robotics'],
      },
    ],
    joinedDaysAgo: 65,
  },

  // ---------- Design ----------
  {
    key: 'elena',
    fullName: 'Elena Rossi',
    profession: 'Product Designer',
    workplace: 'Studio Fieldnote',
    specialisation: 'Design systems',
    location: 'Milan, Italy',
    about:
      'I design product interfaces and the systems behind them: tokens, components and the documentation that gets a team using them.',
    aspirations: 'Lead a design team and speak about design systems that survive contact with engineering.',
    skills: ['UX Design', 'UI Design', 'Figma', 'Design Systems', 'Prototyping', 'User Research', 'Accessibility'],
    interests: ['Design Systems', 'Typography', 'Accessibility', 'Startups'],
    goals: ['Lead a team', 'Speak at conferences'],
    lookingFor: ['collaborator', 'mentee', 'cofounder'],
    projects: [
      {
        title: 'Fieldnote design system',
        description: 'A token-driven system of 60 components used across four client products.',
        type: 'Design',
        role: 'Design lead',
        year: 2025,
        skills: ['Design Systems', 'Figma', 'Accessibility'],
      },
      {
        title: 'Clinic booking redesign',
        description: 'Reduced the steps to book an appointment from nine to four for a regional clinic network.',
        type: 'Client work',
        role: 'Product designer',
        year: 2024,
        skills: ['UX Design', 'User Research', 'Prototyping'],
      },
    ],
    joinedDaysAgo: 58,
  },
  {
    key: 'noah',
    fullName: 'Noah Williams',
    profession: 'UX Researcher',
    workplace: 'Brightside Health',
    specialisation: 'Healthcare research',
    location: 'Sydney, Australia',
    about:
      'I run research with patients and clinicians to find out where digital health tools get in the way, then help teams fix it.',
    aspirations: 'Move from research into product management, with a mentor who has made that jump.',
    skills: ['User Research', 'Usability Testing', 'Data Analysis', 'Figma', 'Workshop Facilitation'],
    interests: ['Healthcare', 'Accessibility', 'Behavioural Science', 'Design Systems'],
    goals: ['Move into product', 'Find a mentor'],
    lookingFor: ['mentor', 'peer', 'collaborator'],
    projects: [
      {
        title: 'Medication reminder study',
        description: 'A twelve-week diary study with 40 patients that reshaped how reminders are scheduled.',
        type: 'Research',
        role: 'Lead researcher',
        year: 2025,
        skills: ['User Research', 'Data Analysis'],
      },
    ],
    joinedDaysAgo: 21,
  },
  {
    key: 'camila',
    fullName: 'Camila Santos',
    profession: 'Brand and Motion Designer',
    workplace: 'Independent',
    specialisation: 'Brand identity for startups',
    location: 'São Paulo, Brazil',
    about:
      'I give young companies a face and a voice: logos, motion and the guidelines that keep it all consistent once the team grows.',
    aspirations: 'Build a small studio with collaborators I trust and a reputation for honest, lively brands.',
    skills: ['Branding', 'Motion Design', 'Illustration', 'Visual Design', 'Figma', 'After Effects'],
    interests: ['Startups', 'Typography', 'Music', 'Sustainability'],
    goals: ['Grow a personal brand', 'Go freelance'],
    lookingFor: ['project_partner', 'collaborator', 'peer'],
    projects: [
      {
        title: 'Identity for a solar co-operative',
        description: 'Naming, logo and launch film for a community-owned solar provider.',
        type: 'Client work',
        role: 'Designer',
        year: 2025,
        skills: ['Branding', 'Motion Design', 'Illustration'],
      },
    ],
    joinedDaysAgo: 12,
  },

  // ---------- Entrepreneurship ----------
  {
    key: 'daniel',
    fullName: 'Daniel Osei',
    profession: 'Founder and CEO',
    workplace: 'Tidewater Labs',
    specialisation: 'Climate hardware',
    location: 'Accra, Ghana',
    about:
      'I run a twelve-person startup that inspects solar farms with autonomous drones. Former field engineer, now mostly fundraising and hiring.',
    aspirations: 'Close our seed round and grow the engineering team that takes us to three new countries.',
    skills: ['Fundraising', 'Business Strategy', 'Leadership', 'Pitching', 'Operations', 'Go-to-Market'],
    interests: ['Climate Tech', 'Startups', 'Drones', 'Renewable Energy', 'Robotics'],
    goals: ['Raise a seed round', 'Lead a team'],
    lookingFor: ['cofounder', 'investor', 'talent'],
    projects: [
      {
        title: 'Drone inspection for solar farms',
        description: 'Autonomous thermal surveys that find faulty panels in a tenth of the time of a manual walk-through.',
        type: 'Startup',
        role: 'Founder',
        year: 2025,
        skills: ['Operations', 'Go-to-Market', 'Fundraising'],
      },
    ],
    joinedDaysAgo: 70,
  },
  {
    key: 'isabella',
    fullName: 'Isabella Turner',
    profession: 'Startup Founder',
    workplace: 'Looply',
    specialisation: 'Education technology',
    location: 'Austin, USA',
    about:
      'Former teacher building a tool that turns any lesson plan into practice exercises. I have paying schools and no technical co-founder yet.',
    aspirations: 'Find a technical co-founder and raise a seed round to reach a thousand schools.',
    skills: ['Product Strategy', 'Sales', 'Pitching', 'Growth Marketing', 'Leadership'],
    interests: ['Education', 'Startups', 'AI', 'Community Building'],
    goals: ['Raise a seed round', 'Build in public'],
    lookingFor: ['cofounder', 'investor', 'mentor'],
    projects: [
      {
        title: 'Looply',
        description: 'An AI practice-exercise generator used weekly by teachers in 45 schools.',
        type: 'Startup',
        role: 'Founder',
        year: 2025,
        skills: ['Product Strategy', 'Sales'],
      },
    ],
    joinedDaysAgo: 16,
  },
  {
    key: 'rohan',
    fullName: 'Rohan Kapoor',
    profession: 'Entrepreneur in Residence',
    workplace: 'Foundry Nine',
    specialisation: 'Venture building',
    location: 'New Delhi, India',
    about:
      'Two exits, one failure and a lot of lessons. I now help first-time founders get from an idea to their first ten customers.',
    aspirations: 'Back and mentor founders working on hard problems, and start one more company myself.',
    skills: ['Business Strategy', 'Fundraising', 'Go-to-Market', 'Financial Modelling', 'Partnerships', 'Leadership'],
    interests: ['Startups', 'FinTech', 'Climate Tech', 'Mentoring'],
    goals: ['Mentor others', 'Launch a startup'],
    lookingFor: ['founder', 'mentee', 'cofounder'],
    projects: [
      {
        title: 'Founder first-ten playbook',
        description: 'A twelve-week programme that has taken 30 teams to their first ten paying customers.',
        type: 'Community',
        role: 'Programme lead',
        year: 2024,
        skills: ['Go-to-Market', 'Business Strategy'],
      },
    ],
    joinedDaysAgo: 82,
  },

  // ---------- Marketing ----------
  {
    key: 'chloe',
    fullName: 'Chloe Martin',
    profession: 'Growth Marketing Lead',
    workplace: 'Sprout and Co',
    specialisation: 'Acquisition and experimentation',
    location: 'Amsterdam, Netherlands',
    about:
      'I run growth for a subscription brand: channel testing, landing pages and the analytics that tell us what actually worked.',
    aspirations: 'Join an early-stage startup as its first marketing hire and build the team from scratch.',
    skills: ['Growth Marketing', 'SEO', 'Paid Ads', 'Marketing Analytics', 'A/B Testing', 'Copywriting'],
    interests: ['Startups', 'Behavioural Science', 'E-commerce', 'Community Building'],
    goals: ['Lead a team', 'Join an early-stage startup'],
    lookingFor: ['hiring', 'peer', 'cofounder'],
    projects: [
      {
        title: 'Referral programme relaunch',
        description: 'Rebuilt a referral loop that now drives 22% of new subscribers.',
        type: 'Product',
        role: 'Growth lead',
        year: 2025,
        skills: ['Growth Marketing', 'A/B Testing', 'Marketing Analytics'],
      },
    ],
    joinedDaysAgo: 29,
  },
  {
    key: 'omar',
    fullName: 'Omar Haddad',
    profession: 'Content Strategist',
    workplace: 'Signal and Story',
    specialisation: 'Technical storytelling',
    location: 'Cairo, Egypt',
    about:
      'I help engineering-led companies explain what they do in plain language, through articles, case studies and a podcast.',
    aspirations: 'Build an independent practice writing about technology that deserves a wider audience.',
    skills: ['Content Marketing', 'Copywriting', 'Storytelling', 'SEO', 'Social Media', 'Brand Strategy'],
    interests: ['AI', 'Education', 'Podcasts', 'Robotics'],
    goals: ['Grow a personal brand', 'Go freelance'],
    lookingFor: ['collaborator', 'project_partner', 'mentor'],
    projects: [
      {
        title: 'Built Different podcast',
        description: 'Interviews with hardware and robotics founders; 40 episodes and 15,000 monthly listeners.',
        type: 'Side project',
        role: 'Host and producer',
        year: 2025,
        skills: ['Storytelling', 'Content Marketing'],
      },
    ],
    joinedDaysAgo: 35,
  },
  {
    key: 'grace',
    fullName: 'Grace Kim',
    profession: 'Community Manager',
    workplace: 'Makers Collective',
    specialisation: 'Maker and open-source communities',
    location: 'Seoul, South Korea',
    about:
      'I run a 9,000-member community of hardware hobbyists: meetups, build nights and an annual robot showcase.',
    aspirations: 'Grow the showcase into a regional event and speak about building communities around hardware.',
    skills: ['Community Building', 'Social Media', 'Event Planning', 'Brand Strategy', 'Content Marketing'],
    interests: ['Open Source', 'Robotics', 'Startups', 'Open Hardware'],
    goals: ['Build in public', 'Speak at conferences'],
    lookingFor: ['collaborator', 'peer', 'project_partner'],
    projects: [
      {
        title: 'Seoul Robot Showcase',
        description: 'A yearly public exhibition of 120 community-built robots with 4,000 visitors.',
        type: 'Community',
        role: 'Organiser',
        year: 2025,
        skills: ['Event Planning', 'Community Building'],
      },
    ],
    joinedDaysAgo: 44,
  },

  // ---------- Finance ----------
  {
    key: 'james',
    fullName: "James O'Connor",
    profession: 'Investment Analyst',
    workplace: 'Harbourline Capital',
    specialisation: 'Growth equity',
    location: 'Dublin, Ireland',
    about:
      'I model and evaluate growth-stage companies, with a growing focus on climate and energy businesses.',
    aspirations: 'Move into early-stage venture capital and work more closely with founders.',
    skills: ['Financial Modelling', 'Valuation', 'Investment Analysis', 'Excel', 'Accounting', 'Due Diligence'],
    interests: ['Venture Capital', 'Startups', 'Climate Tech', 'FinTech'],
    goals: ['Move into venture capital', 'Find a mentor'],
    lookingFor: ['founder', 'mentor', 'peer'],
    projects: [
      {
        title: 'Energy storage market map',
        description: 'A published analysis of 80 grid-storage companies and their unit economics.',
        type: 'Research',
        role: 'Author',
        year: 2025,
        skills: ['Market Research', 'Financial Modelling'],
      },
    ],
    joinedDaysAgo: 18,
  },
  {
    key: 'nadia',
    fullName: 'Nadia Petrova',
    profession: 'Venture Capital Associate',
    workplace: 'Arclight Ventures',
    specialisation: 'Deep tech and robotics investments',
    location: 'Berlin, Germany',
    about:
      'I source and evaluate seed-stage robotics and hardware companies. Engineer by training, so I like to see the prototype before the pitch deck.',
    aspirations: 'Back first-time technical founders building physical products.',
    skills: ['Venture Capital', 'Due Diligence', 'Financial Modelling', 'Market Research', 'Pitching'],
    interests: ['Robotics', 'AI', 'Deep Tech', 'Startups'],
    goals: ['Mentor others', 'Speak at conferences'],
    lookingFor: ['founder', 'peer', 'collaborator'],
    projects: [
      {
        title: 'Robotics seed thesis',
        description: 'The investment thesis behind six seed investments in warehouse and field robotics.',
        type: 'Research',
        role: 'Author',
        year: 2025,
        skills: ['Market Research', 'Venture Capital', 'Robotics'],
      },
    ],
    joinedDaysAgo: 49,
  },
  {
    key: 'samuel',
    fullName: 'Samuel Adeyemi',
    profession: 'Quantitative Analyst',
    workplace: 'Ledgerline',
    specialisation: 'Credit risk modelling',
    location: 'Lagos, Nigeria',
    about:
      'I build credit-risk models for a digital lender and I am steadily teaching myself modern machine learning.',
    aspirations: 'Move from classical risk models into applied machine learning.',
    skills: ['Quantitative Analysis', 'Python', 'SQL', 'Risk Management', 'Statistics', 'Excel'],
    interests: ['FinTech', 'AI', 'Economics'],
    goals: ['Switch into AI', 'Find a mentor'],
    lookingFor: ['mentor', 'hiring', 'peer'],
    projects: [
      {
        title: 'Thin-file credit scoring',
        description: 'A scoring model for first-time borrowers that uses mobile-money history instead of a credit bureau record.',
        type: 'Product',
        role: 'Lead analyst',
        year: 2024,
        skills: ['Python', 'Statistics', 'Risk Management'],
      },
    ],
    joinedDaysAgo: 25,
  },

  // ---------- Research ----------
  {
    key: 'ingrid',
    fullName: 'Ingrid Solberg',
    profession: 'Climate Research Scientist',
    workplace: 'Polar Systems Institute',
    specialisation: 'Sea-ice modelling',
    location: 'Oslo, Norway',
    about:
      'I model how Arctic sea ice responds to a warming ocean, and I am always looking for engineers who can help get better instruments into the field.',
    aspirations: 'Turn research models into tools that energy and shipping planners can actually use.',
    skills: ['Research', 'Data Analysis', 'Python', 'Statistics', 'Climate Modelling', 'Academic Writing'],
    interests: ['Climate Tech', 'Renewable Energy', 'Science Communication', 'Drones'],
    goals: ['Publish research', 'Work on climate tech'],
    lookingFor: ['collaborator', 'peer', 'project_partner'],
    projects: [
      {
        title: 'Drone-based ice thickness survey',
        description: 'Radar-equipped drones mapping ice thickness across 200 km of the Barents Sea.',
        type: 'Research',
        role: 'Principal investigator',
        year: 2025,
        skills: ['Climate Modelling', 'Data Analysis', 'Python'],
      },
    ],
    joinedDaysAgo: 54,
  },
  {
    key: 'mateo',
    fullName: 'Mateo Alvarez',
    profession: 'PhD Researcher',
    workplace: 'Instituto Técnico del Sur',
    specialisation: 'Human-robot interaction',
    location: 'Buenos Aires, Argentina',
    about:
      'My doctoral work studies how people learn to trust (or distrust) the robots they work beside, using assistive arms in rehabilitation clinics.',
    aspirations: 'Finish my PhD with work that changes how assistive robots are designed.',
    skills: ['Research', 'Robotics', 'User Research', 'Python', 'Experiment Design', 'ROS'],
    interests: ['Robotics', 'Human-Computer Interaction', 'AI', 'Assistive Technology'],
    goals: ['Publish research', 'Find a mentor'],
    lookingFor: ['mentor', 'collaborator', 'peer'],
    projects: [
      {
        title: 'Trust in assistive robot arms',
        description: 'A six-month clinical study of how patients build trust with a feeding-assistance robot.',
        type: 'Academic',
        role: 'PhD researcher',
        year: 2025,
        skills: ['Experiment Design', 'Robotics', 'User Research'],
      },
    ],
    joinedDaysAgo: 14,
  },
  {
    key: 'fatima',
    fullName: 'Fatima Al-Sayed',
    profession: 'Biomedical Research Associate',
    workplace: 'Cedar Biolabs',
    specialisation: 'Cell-based assays',
    location: 'Amman, Jordan',
    about:
      'I design and run lab experiments for early drug discovery, and write the analysis code that makes sense of the plates.',
    aspirations: 'Start a PhD at the meeting point of biology and machine learning.',
    skills: ['Research', 'Lab Techniques', 'Data Analysis', 'Experiment Design', 'R'],
    interests: ['Healthcare', 'Biotech', 'AI', 'Science Communication'],
    goals: ['Start a PhD', 'Publish research'],
    lookingFor: ['mentor', 'collaborator'],
    projects: [
      {
        title: 'Automated plate-reader pipeline',
        description: 'An R pipeline that turned a two-day manual analysis into a ten-minute report.',
        type: 'Research',
        role: 'Research associate',
        year: 2024,
        skills: ['R', 'Data Analysis'],
      },
    ],
    joinedDaysAgo: 9,
  },

  // ---------- Product ----------
  {
    key: 'olivia',
    fullName: 'Olivia Bennett',
    profession: 'Senior Product Manager',
    workplace: 'Parcelway',
    specialisation: 'Marketplace growth',
    location: 'London, UK',
    about:
      'I lead the marketplace team at a delivery company. Previously a designer, so I still sketch before I write a spec.',
    aspirations: 'Become a head of product and keep mentoring people moving into product roles.',
    skills: ['Product Strategy', 'Roadmapping', 'Analytics', 'A/B Testing', 'User Research', 'Stakeholder Management'],
    interests: ['Startups', 'Behavioural Science', 'Mentoring', 'AI'],
    goals: ['Mentor others', 'Lead a team'],
    lookingFor: ['mentee', 'peer', 'cofounder'],
    projects: [
      {
        title: 'Same-day delivery launch',
        description: 'Took same-day delivery from a pilot in one city to 14 cities in nine months.',
        type: 'Product',
        role: 'Product lead',
        year: 2025,
        skills: ['Product Strategy', 'Roadmapping', 'Analytics'],
      },
    ],
    joinedDaysAgo: 77,
  },
  {
    key: 'ravi',
    fullName: 'Ravi Iyer',
    profession: 'Technical Product Manager',
    workplace: 'Helix Robotics',
    specialisation: 'Robotics platforms',
    location: 'Bengaluru, India',
    about:
      'I own the roadmap for our fleet-management platform and translate between customers on the warehouse floor and the engineers who build for them.',
    aspirations: 'Start a robotics company of my own once I have found the right technical partners.',
    skills: ['Product Strategy', 'Roadmapping', 'Robotics', 'Agile', 'Systems Engineering', 'Analytics'],
    interests: ['Robotics', 'Autonomous Systems', 'Startups', 'Manufacturing'],
    goals: ['Launch a startup', 'Ship a hardware product'],
    lookingFor: ['cofounder', 'collaborator', 'talent'],
    projects: [
      {
        title: 'Fleet manager 2.0',
        description: 'A redesign of the fleet console that cut operator training time from two days to three hours.',
        type: 'Product',
        role: 'Product manager',
        year: 2025,
        skills: ['Product Strategy', 'Robotics', 'Agile'],
      },
    ],
    joinedDaysAgo: 90,
  },
  {
    key: 'emma',
    fullName: 'Emma Schulz',
    profession: 'Associate Product Manager',
    workplace: 'Lumen Stack',
    specialisation: 'Developer experience',
    location: 'Vienna, Austria',
    about:
      'One year into product management after a degree in computer science. I work on the onboarding flow of a developer platform.',
    aspirations: 'Learn from experienced product leaders and own a product area within two years.',
    skills: ['Agile', 'User Research', 'SQL', 'Roadmapping', 'Prototyping'],
    interests: ['Developer Tools', 'Design Systems', 'Education', 'Startups'],
    goals: ['Find a mentor', 'Lead a team'],
    lookingFor: ['mentor', 'peer'],
    projects: [
      {
        title: 'Five-minute quickstart',
        description: 'Reworked developer onboarding so a new user deploys their first app in under five minutes.',
        type: 'Product',
        role: 'Associate PM',
        year: 2025,
        skills: ['User Research', 'Prototyping'],
      },
    ],
    joinedDaysAgo: 7,
  },

  // ---------- Engineering ----------
  {
    key: 'thabo',
    fullName: 'Thabo Nkosi',
    profession: 'Electrical Engineer',
    workplace: 'SunHarbor Power',
    specialisation: 'Solar microgrids',
    location: 'Johannesburg, South Africa',
    about:
      'I design solar-and-battery microgrids for clinics and schools that the national grid does not reach reliably.',
    aspirations: 'Lead an engineering team delivering clean power to a thousand rural sites.',
    skills: ['Electrical Engineering', 'Power Systems', 'Electronics', 'PCB Design', 'MATLAB', 'Renewable Energy'],
    interests: ['Renewable Energy', 'Climate Tech', 'IoT', 'Electric Vehicles'],
    goals: ['Work on climate tech', 'Lead a team'],
    lookingFor: ['collaborator', 'project_partner', 'mentee'],
    projects: [
      {
        title: 'Clinic microgrid programme',
        description: 'Designed and commissioned solar microgrids for 35 rural clinics, each with remote monitoring.',
        type: 'Hardware',
        role: 'Lead engineer',
        year: 2025,
        skills: ['Power Systems', 'Electronics', 'Renewable Energy'],
      },
    ],
    joinedDaysAgo: 62,
  },
  {
    key: 'yuki',
    fullName: 'Yuki Tanaka',
    profession: 'Aerospace Systems Engineer',
    workplace: 'Stratos Works',
    specialisation: 'UAV flight systems',
    location: 'Tokyo, Japan',
    about:
      'I work on flight control and systems integration for long-endurance survey drones, from simulation to flight test.',
    aspirations: 'Become the technical lead for a new airframe programme.',
    skills: ['Systems Engineering', 'Control Systems', 'MATLAB', 'CAD', 'Embedded Systems', 'Simulation'],
    interests: ['Drones', 'Autonomous Systems', 'Space', 'Robotics'],
    goals: ['Ship a hardware product', 'Become a technical lead'],
    lookingFor: ['collaborator', 'peer', 'mentor'],
    projects: [
      {
        title: 'Twelve-hour endurance UAV',
        description: 'Systems lead for a fixed-wing survey drone that stays airborne for twelve hours on one charge.',
        type: 'Hardware',
        role: 'Systems lead',
        year: 2025,
        skills: ['Control Systems', 'Simulation', 'Systems Engineering'],
      },
    ],
    joinedDaysAgo: 37,
  },
  {
    key: 'leila',
    fullName: 'Leila Farouk',
    profession: 'Civil Engineer',
    workplace: 'Greystone Infrastructure',
    specialisation: 'Sustainable structures',
    location: 'Casablanca, Morocco',
    about:
      'I design low-carbon structures, mostly mid-rise timber and hybrid buildings, and manage them through construction.',
    aspirations: 'Lead the sustainability practice at an engineering firm.',
    skills: ['Structural Analysis', 'AutoCAD', 'Project Management', 'Sustainability', 'BIM'],
    interests: ['Sustainable Design', 'Climate Tech', 'Urban Planning'],
    goals: ['Work on climate tech', 'Lead a team'],
    lookingFor: ['peer', 'mentor', 'collaborator'],
    projects: [
      {
        title: 'Eight-storey timber office',
        description: 'Structural design of a mass-timber office with 40% lower embodied carbon than a concrete frame.',
        type: 'Client work',
        role: 'Structural engineer',
        year: 2024,
        skills: ['Structural Analysis', 'BIM', 'Sustainability'],
      },
    ],
    joinedDaysAgo: 31,
  },
];

/**
 * Career history for each demo person, written compactly:
 *   since   when the current role (profession at workplace, above) began
 *   past    [title, company, start, end]
 *   school  [school, degree, field, startYear, endYear]
 *   cert    an optional certification [name, issuer, year]
 * A few people share a past employer or a school on purpose, so those relevance reasons appear.
 */
export interface SeedHistory {
  since: string;
  past: [title: string, company: string, start: string, end: string];
  school: [school: string, degree: string, field: string, startYear: number, endYear: number];
  cert?: [name: string, issuer: string, year: number];
}

export const HISTORY: Record<string, SeedHistory> = {
  alex: { since: '2022-06', past: ['Software Engineer', 'Voltline Labs', '2019-07', '2022-05'], school: ['Lakeside Institute of Technology', 'BTech', 'Computer Science', 2015, 2019], cert: ['Autonomous Systems Specialisation', 'Open Course Consortium', 2021] },
  maya: { since: '2021-03', past: ['Design Engineer', 'Andes Automation', '2018-08', '2021-02'], school: ['Harbour City University', 'BEng', 'Mechanical Engineering', 2014, 2018] },
  kenji: { since: '2015-04', past: ['Firmware Engineer', 'Stratos Works', '2010-04', '2015-03'], school: ['Alpine Technical University', 'MEng', 'Electrical Engineering', 2004, 2010] },
  sofia: { since: '2021-09', past: ['Perception Engineer', 'Optica Labs', '2018-09', '2021-08'], school: ['Lakeside Institute of Technology', 'MSc', 'Robotics', 2016, 2018] },
  diego: { since: '2017-02', past: ['Automation Technician', 'Fernhill Automation', '2014-03', '2017-01'], school: ['Meridian University', 'BEng', 'Mechatronics', 2010, 2014] },
  priyanka: { since: '2019-01', past: ['Software Engineer', 'Cobalt Cloud', '2015-07', '2018-12'], school: ['Lakeside Institute of Technology', 'BTech', 'Computer Science', 2011, 2015] },
  tom: { since: '2021-05', past: ['Junior Developer', 'Sprout and Co', '2018-09', '2021-04'], school: ['Northfield University', 'BSc', 'Computer Science', 2015, 2018] },
  aisha: { since: '2020-10', past: ['iOS Developer', 'Ledgerline', '2017-06', '2020-09'], school: ['Harbour City University', 'BSc', 'Software Engineering', 2013, 2017] },
  lucas: { since: '2019-03', past: ['Systems Administrator', 'Northwind AI', '2015-09', '2019-02'], school: ['Alpine Technical University', 'BSc', 'Computer Science', 2012, 2015], cert: ['Certified Kubernetes Administrator', 'Cloud Native Institute', 2020] },
  hannah: { since: '2021-01', past: ['Data Scientist', 'Quantleaf Analytics', '2017-08', '2020-12'], school: ['Northfield University', 'MSc', 'Computer Science', 2015, 2017] },
  arjun: { since: '2020-07', past: ['Business Analyst', 'Ledgerline', '2018-06', '2020-06'], school: ['Deccan Institute of Engineering', 'BTech', 'Electronics Engineering', 2014, 2018] },
  wei: { since: '2020-03', past: ['Research Engineer', 'Nordlys Autonomy', '2017-07', '2020-02'], school: ['Meridian University', 'MSc', 'Computer Vision', 2015, 2017] },
  zainab: { since: '2019-10', past: ['Research Intern', 'Northwind AI', '2018-06', '2018-09'], school: ['Northfield University', 'PhD', 'Machine Learning', 2015, 2019] },
  elena: { since: '2019-06', past: ['UX Designer', 'Pinecrest Digital', '2016-09', '2019-05'], school: ['Coastal School of Design', 'BA', 'Interaction Design', 2013, 2016] },
  noah: { since: '2021-02', past: ['Research Assistant', 'Meridian Institute', '2018-03', '2021-01'], school: ['Harbour City University', 'BSc', 'Psychology', 2014, 2017] },
  camila: { since: '2020-01', past: ['Graphic Designer', 'Signal and Story', '2016-02', '2019-12'], school: ['Coastal School of Design', 'BA', 'Graphic Design', 2012, 2016] },
  daniel: { since: '2022-01', past: ['Field Engineer', 'SunHarbor Power', '2016-08', '2021-12'], school: ['Meridian University', 'BEng', 'Electrical Engineering', 2012, 2016] },
  isabella: { since: '2023-08', past: ['Science Teacher', 'Cedar Grove High School', '2017-08', '2023-06'], school: ['Northfield University', 'BA', 'Education', 2013, 2017] },
  rohan: { since: '2021-04', past: ['Co-founder', 'Ledgerline', '2014-01', '2020-12'], school: ['Riverbend Business School', 'MBA', 'Entrepreneurship', 2011, 2013] },
  chloe: { since: '2021-09', past: ['Marketing Executive', 'Pinecrest Digital', '2018-07', '2021-08'], school: ['Riverbend Business School', 'BSc', 'Marketing', 2015, 2018] },
  omar: { since: '2020-05', past: ['Technical Writer', 'Cobalt Cloud', '2017-01', '2020-04'], school: ['Northfield University', 'BA', 'Journalism', 2013, 2016] },
  grace: { since: '2019-11', past: ['Events Coordinator', 'Stratos Works', '2016-03', '2019-10'], school: ['Coastal School of Design', 'BA', 'Communication', 2012, 2016] },
  james: { since: '2022-02', past: ['Financial Analyst', 'Ledgerline', '2019-09', '2022-01'], school: ['Riverbend Business School', 'BSc', 'Finance', 2016, 2019], cert: ['Investment Foundations Certificate', 'Institute of Chartered Analysts', 2021] },
  nadia: { since: '2021-06', past: ['Robotics Engineer', 'Kestrel Dynamics', '2016-09', '2021-05'], school: ['Alpine Technical University', 'MSc', 'Mechanical Engineering', 2014, 2016] },
  samuel: { since: '2020-08', past: ['Risk Analyst', 'Harbourline Capital', '2018-07', '2020-07'], school: ['Meridian University', 'BSc', 'Statistics', 2014, 2018] },
  ingrid: { since: '2018-09', past: ['Research Fellow', 'Meridian Institute', '2015-09', '2018-08'], school: ['Alpine Technical University', 'PhD', 'Climate Science', 2011, 2015] },
  mateo: { since: '2022-03', past: ['Robotics Engineer', 'Andes Automation', '2019-02', '2022-02'], school: ['Meridian University', 'BEng', 'Mechatronics', 2014, 2018] },
  fatima: { since: '2022-09', past: ['Laboratory Technician', 'Brightside Health', '2020-06', '2022-08'], school: ['Harbour City University', 'BSc', 'Biomedical Science', 2016, 2020] },
  olivia: { since: '2020-04', past: ['Product Designer', 'Studio Fieldnote', '2015-06', '2020-03'], school: ['Coastal School of Design', 'BA', 'Product Design', 2011, 2014] },
  ravi: { since: '2020-01', past: ['Systems Engineer', 'Andes Automation', '2015-07', '2019-12'], school: ['Deccan Institute of Engineering', 'BTech', 'Mechanical Engineering', 2011, 2015] },
  emma: { since: '2025-09', past: ['Software Engineering Intern', 'Pinecrest Digital', '2024-06', '2024-09'], school: ['Alpine Technical University', 'BSc', 'Computer Science', 2021, 2025] },
  thabo: { since: '2018-05', past: ['Graduate Engineer', 'Greystone Infrastructure', '2015-01', '2018-04'], school: ['Meridian University', 'BEng', 'Electrical Engineering', 2010, 2014] },
  yuki: { since: '2019-04', past: ['Flight Test Engineer', 'Kestrel Dynamics', '2015-04', '2019-03'], school: ['Alpine Technical University', 'MEng', 'Aerospace Engineering', 2009, 2015] },
  leila: { since: '2017-10', past: ['Site Engineer', 'SunHarbor Power', '2014-09', '2017-09'], school: ['Harbour City University', 'BEng', 'Civil Engineering', 2010, 2014] },
};

export interface SeedConnection {
  from: string;
  to: string;
  status: 'pending' | 'accepted';
  /** Hours since the request was sent. */
  requestedHoursAgo: number;
  /** Hours since it was accepted (accepted connections only). */
  acceptedHoursAgo?: number;
}

const DAY = 24;

// Activity that makes the demo accounts feel lived-in. Maya is deliberately
// left untouched by Alex so the full connect → notify → accept flow can be shown live.
export const CONNECTIONS: SeedConnection[] = [
  { from: 'kenji', to: 'alex', status: 'pending', requestedHoursAgo: 2 },
  { from: 'wei', to: 'alex', status: 'pending', requestedHoursAgo: 26 },
  { from: 'alex', to: 'sofia', status: 'accepted', requestedHoursAgo: 6 * DAY, acceptedHoursAgo: 5 * DAY },
  { from: 'ravi', to: 'alex', status: 'accepted', requestedHoursAgo: 10 * DAY, acceptedHoursAgo: 9 * DAY },
  { from: 'alex', to: 'priyanka', status: 'accepted', requestedHoursAgo: 14 * DAY, acceptedHoursAgo: 13 * DAY },
  { from: 'alex', to: 'hannah', status: 'pending', requestedHoursAgo: 3 * DAY },

  { from: 'diego', to: 'maya', status: 'accepted', requestedHoursAgo: 8 * DAY, acceptedHoursAgo: 7 * DAY },
  { from: 'yuki', to: 'maya', status: 'pending', requestedHoursAgo: 5 },
  { from: 'maya', to: 'thabo', status: 'pending', requestedHoursAgo: 2 * DAY },

  { from: 'noah', to: 'elena', status: 'accepted', requestedHoursAgo: 12 * DAY, acceptedHoursAgo: 11 * DAY },
  { from: 'elena', to: 'olivia', status: 'accepted', requestedHoursAgo: 20 * DAY, acceptedHoursAgo: 18 * DAY },
  { from: 'camila', to: 'elena', status: 'pending', requestedHoursAgo: 1 * DAY },
  { from: 'tom', to: 'elena', status: 'pending', requestedHoursAgo: 3 },

  { from: 'nadia', to: 'daniel', status: 'accepted', requestedHoursAgo: 9 * DAY, acceptedHoursAgo: 8 * DAY },
  { from: 'daniel', to: 'thabo', status: 'accepted', requestedHoursAgo: 15 * DAY, acceptedHoursAgo: 14 * DAY },
  { from: 'james', to: 'daniel', status: 'pending', requestedHoursAgo: 8 },
  { from: 'rohan', to: 'daniel', status: 'pending', requestedHoursAgo: 2 * DAY },

  { from: 'hannah', to: 'zainab', status: 'accepted', requestedHoursAgo: 16 * DAY, acceptedHoursAgo: 15 * DAY },
  { from: 'priyanka', to: 'lucas', status: 'accepted', requestedHoursAgo: 22 * DAY, acceptedHoursAgo: 21 * DAY },
  { from: 'chloe', to: 'omar', status: 'accepted', requestedHoursAgo: 11 * DAY, acceptedHoursAgo: 10 * DAY },
];

export const SKIPS: { from: string; to: string; hoursAgo: number }[] = [
  { from: 'alex', to: 'leila', hoursAgo: 3 * DAY },
  { from: 'alex', to: 'fatima', hoursAgo: 3 * DAY },
  { from: 'maya', to: 'james', hoursAgo: 4 * DAY },
  { from: 'elena', to: 'samuel', hoursAgo: 5 * DAY },
];
