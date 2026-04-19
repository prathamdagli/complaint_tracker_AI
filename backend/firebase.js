const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let serviceAccount;

// 1. Try to load from environment variable (Stringified JSON - for Render)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', e.message);
    }
}

// 2. Fallback to local file if no env var or parse failed
if (!serviceAccount) {
    const localPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(localPath)) {
        serviceAccount = require(localPath);
    }
}

if (!serviceAccount) {
    console.error('FATAL: No Firebase service account found in FIREBASE_SERVICE_ACCOUNT env var or serviceAccountKey.json');
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Helper to handle auto-ID and standard fields
const COLLECTIONS = {
    USERS: 'users',
    COMPLAINTS: 'complaints',
    NOTIFICATIONS: 'notifications',
    NOTES: 'notes'
};

module.exports = { admin, db, COLLECTIONS };
