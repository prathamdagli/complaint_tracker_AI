const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const users = [
    { username: 'admin@gmail.com', password: 'admin123', role: 'ADMIN' },
    { username: 'manager@gmail.com', password: 'manager123', role: 'MANAGER' },
    { username: 'qa@gmail.com', password: 'qa123', role: 'QA' },
    { username: 'cse@gmail.com', password: 'cse123', role: 'CSE' },
    { username: 'customer@gmail.com', password: 'customer123', role: 'CUSTOMER' }
];

async function main() {
    for (const u of users) {
        const existing = await prisma.user.findUnique({ where: { username: u.username } });
        if (!existing) {
            const hashed = await bcrypt.hash(u.password, 10);
            await prisma.user.create({
                data: { username: u.username, password: hashed, role: u.role }
            });
            console.log(`Created ${u.role}: ${u.username} / ${u.password}`);
        } else {
            console.log(`${u.role} already exists: ${u.username}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
