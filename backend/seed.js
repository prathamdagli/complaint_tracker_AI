const { db, COLLECTIONS } = require('./firebase');
const bcrypt = require('bcryptjs');

const users = [
    { username: 'admin@gmail.com', password: 'admin123', role: 'ADMIN' },
    { username: 'manager@gmail.com', password: 'manager123', role: 'MANAGER' },
    { username: 'qa@gmail.com', password: 'qa123', role: 'QA' },
    { username: 'cse@gmail.com', password: 'cse123', role: 'CSE' },
    { username: 'customer@gmail.com', password: 'customer123', role: 'CUSTOMER' }
];

async function main() {
    console.log('--- Initializing Database Seed ---');
    const usersRef = db.collection(COLLECTIONS.USERS);

    for (const u of users) {
        const snapshot = await usersRef.where('username', '==', u.username).get();
        if (snapshot.empty) {
            const hashed = await bcrypt.hash(u.password, 10);
            await usersRef.add({
                username: u.username,
                password: hashed,
                role: u.role,
                createdAt: new Date().toISOString()
            });
            console.log(`✅ Created ${u.role}: ${u.username} / ${u.password}`);
        } else {
            console.log(`ℹ️ ${u.role} already exists: ${u.username}`);
        }
    }
    console.log('--- Seed Finished ---');
    process.exit(0);
}

main().catch(e => {
    console.error('Seed failed:', e);
    process.exit(1);
});
