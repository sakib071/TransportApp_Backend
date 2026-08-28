require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Report = require('../src/models/Report');
const Update = require('../src/models/Update');
const Category = require('../src/models/Category');
const Line = require('../src/models/Line');
const AuditLog = require('../src/models/AuditLog');

const BUILTIN_CATEGORIES = [
  { key: 'delay', label: 'Delay', icon: '⏱️', color: '#E8A33D', tint: '#FCF0DC', builtIn: true },
  { key: 'hazard', label: 'Hazard', icon: '⚠️', color: '#C0392B', tint: '#FAE3E0', builtIn: true },
  { key: 'overcrowding', label: 'Overcrowding', icon: '👥', color: '#6B5B95', tint: '#EAE6F3', builtIn: true },
  { key: 'accessibility', label: 'Accessibility', icon: '♿', color: '#2A9D8F', tint: '#DEF1EE', builtIn: true },
  { key: 'facility', label: 'Damaged Facility', icon: '🔧', color: '#8B5E3C', tint: '#EEE2D7', builtIn: true }
];

const DEFAULT_LINES = [
  { name: 'Red Line', type: 'rail', stations: ['Central Station', 'Riverside', 'Northgate', 'Harbor Junction', 'Old Mill'], color: '#C0392B' },
  { name: 'Blue Line', type: 'rail', stations: ['Union Square', 'Cedar Park', 'Lakeside', 'Airport Link', 'Eastwood'], color: '#1D3557' },
  { name: 'Green Line', type: 'rail', stations: ['Fifth Ave Station', 'Maple Court', 'Southbank', 'University', 'Greenfield'], color: '#2E7D5B' },
  { name: 'Route 12 Bus', type: 'bus', stations: [] },
  { name: 'Route 44 Bus', type: 'bus', stations: [] }
];

async function run() {
  await connectDB();
  console.log('Seeding categories & lines…');

  await Category.deleteMany({});
  await Category.insertMany(BUILTIN_CATEGORIES);
  await Line.deleteMany({});
  await Line.insertMany(DEFAULT_LINES);

  const existingDemo = await User.findOne({ email: 'ops@linewatch.demo' });
  if (!existingDemo) {
    console.log('Seeding demo accounts & sample reports…');
    const staff = await User.create({ name: 'Ops Staff', email: 'ops@linewatch.demo', password: 'password123', role: 'staff' });
    const rider1 = await User.create({ name: 'Maya K.', email: 'maya@linewatch.demo', password: 'password123', role: 'rider' });
    const rider2 = await User.create({ name: 'Jon Alavi', email: 'jon@linewatch.demo', password: 'password123', role: 'rider' });

    await Update.create([
      {
        title: 'Elevator maintenance — Central Station',
        message: 'North elevator undergoing scheduled maintenance until 3pm. Ramp access available at the east entrance.',
        severity: 'advisory',
        author: staff._id
      },
      {
        title: 'Red Line — minor delays',
        message: 'Signal inspection between Riverside and Fifth Ave causing ~8 min delays.',
        severity: 'alert',
        author: staff._id
      }
    ]);

    await Report.create([
      {
        category: 'accessibility',
        description: 'Tactile paving badly worn at platform edge, hard to feel underfoot for low-vision riders.',
        severity: 'high',
        line: 'Red Line',
        location: { label: 'Central Station, Platform 2' },
        status: 'under_review',
        moderation: 'approved',
        reportedBy: rider1._id,
        history: [
          { status: 'reported', note: 'Report submitted' },
          { status: 'under_review', note: 'Assigned to facilities team' }
        ]
      },
      {
        category: 'overcrowding',
        description: 'Platform dangerously overcrowded during evening peak, people pushed near edge.',
        severity: 'high',
        line: 'Green Line',
        location: { label: 'Fifth Ave Station' },
        status: 'reported',
        moderation: 'pending',
        reportedBy: rider2._id,
        history: [{ status: 'reported', note: 'Report submitted' }]
      },
      {
        category: 'delay',
        description: 'Northbound service holding at Union Square for over 15 minutes, no announcement yet.',
        severity: 'medium',
        line: 'Blue Line',
        location: { label: 'Union Square' },
        status: 'resolved',
        moderation: 'approved',
        reportedBy: rider1._id,
        history: [
          { status: 'reported', note: 'Report submitted' },
          { status: 'resolved', note: 'Status updated by staff' }
        ]
      }
    ]);

    await AuditLog.create([
      { action: 'status_change', detail: 'Report marked resolved', actorName: 'Ops Staff' },
      { action: 'moderation', detail: 'Accessibility report approved', actorName: 'Ops Staff' }
    ]);

    console.log('\nDemo accounts (password for all: password123):');
    console.log('  staff : ops@linewatch.demo');
    console.log('  rider : maya@linewatch.demo');
    console.log('  rider : jon@linewatch.demo');
  } else {
    console.log('Demo accounts already exist — skipping report/user seed.');
  }

  console.log('\nSeed complete.');
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
