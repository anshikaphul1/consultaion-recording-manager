require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Client = require('./models/Client');
const Astrologer = require('./models/Astrologer');
const Wallet = require('./models/Wallet');
const Transaction = require('./models/Transaction');
const Consultation = require('./models/Consultation');
const Review = require('./models/Review');

const MONGODB_URI = process.env.MONGODB_URI;

const astrologerPhotos = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=250&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=250&auto=format&fit=crop'
];

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB. Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Client.deleteMany({});
    await Astrologer.deleteMany({});
    await Wallet.deleteMany({});
    await Transaction.deleteMany({});
    await Consultation.deleteMany({});
    await Review.deleteMany({});
    console.log('Database collections cleared.');

    // 1. Seed Admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      username: 'admin',
      password: hashedPassword,
      name: 'Super Administrator',
      role: 'admin'
    });
    await adminUser.save();
    console.log('Admin account seeded.');

    // 2. Seed Astrologers
    const astrologerNames = [
      'Pandit Sri Raman',
      'Dr. Anjali Sharma',
      'Karthik Iyer',
      'Acharya Sunita Sen',
      'Guru Raghav Das'
    ];

    const specialities = [
      ['Vedic', 'Gemology', 'Horary'],
      ['Numerology', 'KP System', 'Vastu'],
      ['Western Horoscopes', 'Tarot Card Reading'],
      ['Palmistry', 'Lal Kitab', 'Face Reading'],
      ['Kundli Matching', 'KP System', 'Gemology']
    ];

    const languages = [
      ['English', 'Hindi', 'Tamil'],
      ['English', 'Hindi', 'Punjabi'],
      ['English', 'Tamil', 'Telugu'],
      ['English', 'Hindi', 'Bengali'],
      ['Hindi', 'Sanskrit', 'Gujarati']
    ];

    const rates = [15, 20, 10, 25, 30];
    const experiences = [15, 12, 6, 18, 25];
    const bios = [
      'Expert in Vedic principles, offering accurate timelines for career & marriage with traditional remedies.',
      'PhD in Numerology with a focus on name correction, signature analysis, and modern home Vastu structures.',
      'Approachable Western astrologer specializing in relationship compatibility and career transit alignments.',
      'Senior Tarot and Lal Kitab specialist, providing highly custom spiritual counseling and remedies.',
      'Lifetime devotee of Sanskrit studies and Kundli matchmaking, providing extremely detailed chart profiles.'
    ];

    const seededAstrologers = [];
    const seededAstroUsers = [];

    for (let i = 0; i < 5; i++) {
      const astroProfile = new Astrologer({
        name: astrologerNames[i],
        specialization: specialities[i][0] + ' Specialist',
        specialties: specialities[i],
        languages: languages[i],
        ratePerMin: rates[i],
        experience: experiences[i],
        bio: bios[i],
        photoUrl: astrologerPhotos[i],
        isOnline: i % 2 === 0, // Alternate online status
        rating: 4.5 + (i * 0.1),
        ratingCount: 5 + i
      });
      await astroProfile.save();
      seededAstrologers.push(astroProfile);

      const astroUserPassword = await bcrypt.hash('password123', 10);
      const astroUser = new User({
        username: `astro${i + 1}`,
        password: astroUserPassword,
        name: astrologerNames[i],
        role: 'astrologer',
        astrologerRef: astroProfile._id
      });
      await astroUser.save();
      seededAstroUsers.push(astroUser);

      // Create wallet for astrologer (starts with ₹0)
      const astroWallet = new Wallet({
        userId: astroUser._id,
        balance: 0
      });
      await astroWallet.save();
    }
    console.log('5 Astrologers and profiles seeded.');

    // 3. Seed Clients
    const clientNames = [
      'Anshika Phul',
      'Yatish Kumar',
      'Rohan Gupta',
      'Sneha Verma',
      'Vikram Rathore'
    ];
    
    const phones = ['9876543210', '9812345678', '9988776655', '9776655443', '9554433221'];
    const dobs = ['1998-04-12', '1995-10-22', '2001-01-05', '1997-07-18', '1993-12-30'];
    const times = ['04:30', '15:15', '08:45', '12:00', '21:10'];
    const places = ['New Delhi, India', 'Mumbai, India', 'Bengaluru, India', 'Kolkata, India', 'Jaipur, India'];
    const genders = ['Female', 'Male', 'Male', 'Female', 'Male'];
    const startingBalances = [500, 300, 1000, 150, 0];

    const seededClients = [];
    const seededClientUsers = [];

    for (let i = 0; i < 5; i++) {
      const clientProfile = new Client({
        name: clientNames[i],
        phone: phones[i],
        dob: new Date(dobs[i]),
        birthTime: times[i],
        birthPlace: places[i],
        gender: genders[i]
      });
      await clientProfile.save();
      seededClients.push(clientProfile);

      const clientUserPassword = await bcrypt.hash('password123', 10);
      const clientUser = new User({
        username: `client${i + 1}`,
        password: clientUserPassword,
        name: clientNames[i],
        role: 'user',
        clientRef: clientProfile._id
      });
      await clientUser.save();
      seededClientUsers.push(clientUser);

      // Create wallet with starting balance
      const clientWallet = new Wallet({
        userId: clientUser._id,
        balance: startingBalances[i]
      });
      await clientWallet.save();

      // Create Transaction log for wallet starting balance
      if (startingBalances[i] > 0) {
        const rechargeTx = new Transaction({
          userId: clientUser._id,
          amount: startingBalances[i],
          type: 'recharge',
          status: 'Success',
          description: `Initial seed wallet recharge of ₹${startingBalances[i]}`
        });
        await rechargeTx.save();
      }
    }
    console.log('5 Clients, wallets, and profiles seeded.');

    // 4. Seed Mock Consultation Sessions
    const sessionDates = [
      new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hrs ago
      new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
    ];

    const durations = [600, 300, 1200, 450]; // Seconds (10m, 5m, 20m, 7.5m)
    
    for (let i = 0; i < 4; i++) {
      const astro = seededAstrologers[i % 5];
      const client = seededClients[i % 5];
      const clientUser = seededClientUsers[i % 5];
      
      const durationMins = Math.ceil(durations[i] / 60);
      const amount = durationMins * astro.ratePerMin;

      const session = new Consultation({
        client: client._id,
        astrologer: astro._id,
        date: sessionDates[i],
        duration: durations[i],
        amount,
        notes: `Call consultation logged during database seed. Duration: ${durationMins} mins.`,
        status: 'Completed',
        tags: ['Live Call', 'General']
      });
      await session.save();

      // Deduct client wallet balance if they have enough, else just create transaction log
      const wallet = await Wallet.findOne({ userId: clientUser._id });
      if (wallet) {
        wallet.balance = Math.max(0, wallet.balance - amount);
        await wallet.save();
      }

      const paymentTx = new Transaction({
        userId: clientUser._id,
        amount: -amount,
        type: 'payment',
        status: 'Success',
        description: `Consultation session with ${astro.name}`
      });
      await paymentTx.save();

      // Credit astrologer earnings
      const astroUser = seededAstroUsers[i % 5];
      const astroWallet = await Wallet.findOne({ userId: astroUser._id });
      if (astroWallet) {
        astroWallet.balance += amount;
        await astroWallet.save();
      }

      const earningsTx = new Transaction({
        userId: astroUser._id,
        amount: amount,
        type: 'payout',
        status: 'Success',
        description: `Earnings from session with ${client.name}`
      });
      const astroTx = await earningsTx.save();
    }
    console.log('Mock consultations and transaction histories seeded.');

    // 5. Seed Mock Reviews
    const comments = [
      'Very accurate predictions! Helped me align my job switch plans.',
      'Explained everything clearly. Simple and practical Vastu remedies.',
      'Great Tarot reading. Approached my concerns with deep empathy.',
      'Highly professional analysis of my palm charts.'
    ];

    for (let i = 0; i < 4; i++) {
      const astro = seededAstrologers[i % 5];
      const clientUser = seededClientUsers[(i + 1) % 5];
      
      const review = new Review({
        client: clientUser._id,
        astrologer: astro._id,
        rating: 4 + (i % 2),
        comment: comments[i],
        isApproved: true
      });
      await review.save();
    }
    console.log('Mock client reviews seeded.');

    console.log('Database seeded successfully! Terminating script.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding process failed:', error);
    process.exit(1);
  }
};

seed();
