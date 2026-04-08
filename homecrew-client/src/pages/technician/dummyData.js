export const seedAvailableJobs = [
  {
    id: 'A-101',
    serviceType: 'Electrical Repair',
    category: 'Electrical Work',
    location: 'Dhanmondi, Dhaka',
    description: 'Frequent power trip in living room and kitchen sockets.',
    budget: 1800,
    requestedAt: '2026-04-08T08:30:00Z',
  },
  {
    id: 'A-102',
    serviceType: 'Electrical Line Inspection',
    category: 'Electrical Work',
    location: 'Uttara, Dhaka',
    description: 'Main line voltage fluctuation and breaker tripping issue.',
    budget: 2200,
    requestedAt: '2026-04-08T09:10:00Z',
  },
  {
    id: 'A-103',
    serviceType: 'Switch & Socket Replacement',
    category: 'Electrical Work',
    location: 'Mirpur DOHS, Dhaka',
    description: 'Multiple damaged wall sockets and one loose switchboard.',
    budget: 1500,
    requestedAt: '2026-04-08T10:00:00Z',
  },
  {
    id: 'A-104',
    serviceType: 'Ceiling Fan Wiring Setup',
    category: 'Electrical Work',
    location: 'Banani, Dhaka',
    description: 'New fan installation with wiring and regulator setup.',
    budget: 3000,
    requestedAt: '2026-04-08T10:30:00Z',
  },
];

export const seedMyJobs = [
  {
    id: 'J-201',
    serviceType: 'Electrical Repair',
    category: 'Electrical Work',
    location: 'Mohammadpur, Dhaka',
    description: 'Main switchboard diagnosis and repair.',
    amount: 2000,
    status: 'pending',
    assignedAt: '2026-04-08T07:00:00Z',
  },
  {
    id: 'J-202',
    serviceType: 'MCB Replacement',
    category: 'Electrical Work',
    location: 'Gulshan 1, Dhaka',
    description: 'Frequent breaker trips require MCB replacement and load check.',
    amount: 2600,
    status: 'ongoing',
    assignedAt: '2026-04-07T11:00:00Z',
  },
  {
    id: 'J-203',
    serviceType: 'Panel Board Servicing',
    category: 'Electrical Work',
    location: 'Banasree, Dhaka',
    description: 'Distribution panel cleaning and terminal tightening.',
    amount: 1400,
    status: 'completed',
    assignedAt: '2026-04-06T13:00:00Z',
    completedAt: '2026-04-06T16:00:00Z',
  },
  {
    id: 'J-204',
    serviceType: 'Lighting Circuit Repair',
    category: 'Electrical Work',
    location: 'Shantinagar, Dhaka',
    description: 'Room light circuit short resolved with rewiring.',
    amount: 3200,
    status: 'completed',
    assignedAt: '2026-04-05T09:00:00Z',
    completedAt: '2026-04-05T18:00:00Z',
  },
];

export const seedReviews = [
  { id: 1, client: 'Ayesha Rahman', rating: 5, comment: 'Very professional and on time.', date: '2026-04-06' },
  { id: 2, client: 'Imran Hossain', rating: 4.5, comment: 'Solved quickly, polite behavior.', date: '2026-04-05' },
  { id: 3, client: 'Sadia Akter', rating: 4, comment: 'Good job, but arrived a little late.', date: '2026-04-03' },
];

export const seedNotifications = [
  { id: 1, title: 'New Job Available', message: 'Electrical repair job posted in Dhanmondi.', time: '10 min ago', read: false },
  { id: 2, title: 'Job Updated', message: 'Client changed preferred time for job J-202.', time: '1 hour ago', read: false },
  { id: 3, title: 'Payout Processed', message: '৳1,400 added to your wallet from job J-203.', time: 'Yesterday', read: true },
];

export const seedProfile = {
  name: 'Technician One',
  email: 'technician001@gmail.com',
  phone: '01890123123',
  skills: 'Electrical Wiring, MCB Setup, Switchboard Repair',
  experience: '4 years',
  location: 'Mirpur, Dhaka',
};
