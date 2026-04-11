export const drivers = [
  { id: 'DRV-001', name: 'Ahmed Ali', avgScore: 92, totalTrips: 148, avatar: 'AA' },
  { id: 'DRV-002', name: 'Mohamed Hassan', avgScore: 88, totalTrips: 132, avatar: 'MH' },
  { id: 'DRV-003', name: 'Ali Mahmoud', avgScore: 75, totalTrips: 96, avatar: 'AM' },
  { id: 'DRV-004', name: 'Sara Ahmed', avgScore: 95, totalTrips: 167, avatar: 'SA' },
  { id: 'DRV-005', name: 'Omar Khaled', avgScore: 81, totalTrips: 110, avatar: 'OK' },
  { id: 'DRV-006', name: 'Dina Youssef', avgScore: 90, totalTrips: 125, avatar: 'DY' },
  { id: 'DRV-007', name: 'Hoda Ibrahim', avgScore: 68, totalTrips: 78, avatar: 'HI' },
  { id: 'DRV-008', name: 'Youssef Adel', avgScore: 93, totalTrips: 155, avatar: 'YA' },
]

export const trips = [
  {
    id: 'TRP-001',
    driverId: 'DRV-001',
    driverName: 'Ahmed Ali',
    duration: '2h 15m',
    score: 94,
    date: '2026-03-04',
    violations: [{ type: 'Hard Braking', time: '10:32 AM', location: 'Highway 101' }],
  },
  {
    id: 'TRP-002',
    driverId: 'DRV-002',
    driverName: 'Mohamed Hassan',
    duration: '1h 45m',
    score: 87,
    date: '2026-03-04',
    violations: [
      { type: 'Overspeed', time: '2:15 PM', location: 'Route 66' },
      { type: 'Sudden Acceleration', time: '2:45 PM', location: 'Downtown' },
    ],
  },
  {
    id: 'TRP-003',
    driverId: 'DRV-003',
    driverName: 'Ali Mahmoud',
    duration: '3h 10m',
    score: 72,
    date: '2026-03-03',
    violations: [
      { type: 'Hard Braking', time: '9:10 AM', location: 'I-95' },
      { type: 'Overspeed', time: '10:00 AM', location: 'I-95' },
      { type: 'Sudden Acceleration', time: '11:30 AM', location: 'City Center' },
    ],
  },
  {
    id: 'TRP-004',
    driverId: 'DRV-004',
    driverName: 'Sara Ahmed',
    duration: '1h 30m',
    score: 98,
    date: '2026-03-03',
    violations: [],
  },
  {
    id: 'TRP-005',
    driverId: 'DRV-005',
    driverName: 'Omar Khaled',
    duration: '2h 50m',
    score: 79,
    date: '2026-03-02',
    violations: [
      { type: 'Overspeed', time: '4:20 PM', location: 'Highway 280' },
      { type: 'Hard Braking', time: '5:10 PM', location: 'Exit Ramp' },
    ],
  },
  {
    id: 'TRP-006',
    driverId: 'DRV-006',
    driverName: 'Dina Youssef',
    duration: '1h 20m',
    score: 91,
    date: '2026-03-02',
    violations: [{ type: 'Sudden Acceleration', time: '8:05 AM', location: 'Main St' }],
  },
  {
    id: 'TRP-007',
    driverId: 'DRV-007',
    driverName: 'Hoda Ibrahim',
    duration: '4h 05m',
    score: 65,
    date: '2026-03-01',
    violations: [
      { type: 'Overspeed', time: '1:00 PM', location: 'I-80' },
      { type: 'Hard Braking', time: '2:30 PM', location: 'Rest Stop' },
      { type: 'Overspeed', time: '3:45 PM', location: 'I-80' },
      { type: 'Sudden Acceleration', time: '4:15 PM', location: 'City Limits' },
    ],
  },
  {
    id: 'TRP-008',
    driverId: 'DRV-008',
    driverName: 'Youssef Adel',
    duration: '1h 55m',
    score: 96,
    date: '2026-03-01',
    violations: [],
  },
  {
    id: 'TRP-009',
    driverId: 'DRV-001',
    driverName: 'Ahmed Ali',
    duration: '2h 40m',
    score: 90,
    date: '2026-02-28',
    violations: [{ type: 'Hard Braking', time: '11:20 AM', location: 'Bridge' }],
  },
  {
    id: 'TRP-010',
    driverId: 'DRV-003',
    driverName: 'Ali Mahmoud',
    duration: '3h 30m',
    score: 70,
    date: '2026-02-28',
    violations: [
      { type: 'Overspeed', time: '9:00 AM', location: 'Freeway' },
      { type: 'Hard Braking', time: '10:15 AM', location: 'Intersection' },
    ],
  },
]

export const notifications = [
  { id: 1, type: 'alert', message: 'Hoda Ibrahim scored 65 on trip TRP-007', time: '2 hours ago' },
  {
    id: 2,
    type: 'warning',
    message: 'Ali Mahmoud had 3 violations on trip TRP-003',
    time: '5 hours ago',
  },
  {
    id: 3,
    type: 'alert',
    message: 'Fleet average score dropped to 85.2 this week',
    time: '1 day ago',
  },
  {
    id: 4,
    type: 'info',
    message: 'Sara Ahmed completed 167 trips with 95 avg score',
    time: '1 day ago',
  },
  {
    id: 5,
    type: 'warning',
    message: 'Overspeed detected on Highway 280 — Omar Khaled',
    time: '2 days ago',
  },
]

export const safetyScoreHistory = [
  { month: 'Oct', score: 82 },
  { month: 'Nov', score: 84 },
  { month: 'Dec', score: 81 },
  { month: 'Jan', score: 86 },
  { month: 'Feb', score: 85 },
  { month: 'Mar', score: 88 },
]

