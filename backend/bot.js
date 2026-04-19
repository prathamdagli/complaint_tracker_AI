/*
 * ComplainTracker — Telegram Bot
 * ------------------------------
 * • Guided /submit flow (text → optional mobile → optional image)
 * • Auto-registers the chatter on their first complaint and returns
 *   web-portal credentials so they can track on the dashboard too.
 * • Links every complaint to the same user account (username = tg_<chatId>)
 * • Exposes notifyTelegramUser() so server.js can push status updates back
 *   to the user's Telegram chat whenever a web-side notification fires.
 */

const { db, COLLECTIONS } = require('./firebase');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

let bot = null;
/** chatId -> { state: 'AWAIT_TEXT' | 'AWAIT_MOBILE' | 'AWAIT_IMAGE', data } */
const sessions = new Map();

const randomPassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let pwd = '';
    for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
};

const generateTicketId = () => `CMP-${Math.floor(1000 + Math.random() * 9000)}`;

/**
 * Find-or-create the customer account tied to this Telegram chatId.
 * Username is deterministic (`tg_<chatId>`), password is random and
 * returned in plaintext ONLY on first registration so we can show it to
 * the user once.
 */
async function ensureUserForChat(chatId, mobileNumber) {
    const username = `tg_${chatId}`;
    const usersRef = db.collection(COLLECTIONS.USERS);
    const snapshot = await usersRef.where('username', '==', username).get();
    
    if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        let userData = userDoc.data();
        if (mobileNumber && !userData.mobileNumber) {
            await userDoc.ref.update({ mobileNumber });
            userData.mobileNumber = mobileNumber;
        }
        return { user: { id: userDoc.id, ...userData }, isNew: false, password: null };
    }

    const password = randomPassword();
    const hashed = await bcrypt.hash(password, 10);
    const newUser = {
        username,
        password: hashed,
        role: 'CUSTOMER',
        mobileNumber: mobileNumber || null,
        createdAt: new Date().toISOString()
    };
    const userDoc = await usersRef.add(newUser);
    return { user: { id: userDoc.id, ...newUser }, isNew: true, password };
}

async function downloadPhotoFromTelegram(photo) {
    // `photo` is a Telegram PhotoSize; we pick the largest version upstream
    const localPath = await bot.downloadFile(photo.file_id, UPLOAD_DIR);
    // downloadFile saves with Telegram's filename; normalise it so it
    // matches the rest of our uploads naming convention.
    const ext = path.extname(localPath) || '.jpg';
    const newName = `tg-${Date.now()}-${photo.file_id.slice(-8)}${ext}`;
    const newPath = path.join(UPLOAD_DIR, newName);
    fs.renameSync(localPath, newPath);
    return `/uploads/${newName}`;
}

/**
 * Public helper used by server.js to push a notification to the user's
 * Telegram chat whenever a web-side notification is created for them.
 * No-op if the bot isn't configured or the user didn't sign up via Telegram.
 */
async function notifyTelegramUser(userId, { title, message }) {
    if (!bot) return;
    try {
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
        if (!userDoc.exists) return;
        const user = userDoc.data();
        if (!user.username || !user.username.startsWith('tg_')) return;
        
        const chatId = user.username.slice(3);
        const body = `🔔 ${title}\n\n${message}`;
        await bot.sendMessage(chatId, body);
    } catch (e) {
        console.error('[tg] notify failed:', e.message);
    }
}

/* ===================== Bot setup ===================== */

if (token) {
    bot = new TelegramBot(token, { polling: true });
    bot.getMe()
        .then(me => console.log(`✅ Telegram bot online as @${me.username}`))
        .catch(e => console.error('Telegram getMe failed:', e.message));

    bot.on('polling_error', err => console.error('[tg] polling error:', err.message));

    /* ---------- /start ---------- */
    bot.onText(/^\/start\b/, (msg) => {
        sessions.delete(msg.chat.id);
        const firstName = msg.from.first_name || 'there';
        const welcome =
`👋 *Hi ${firstName}, welcome to ComplainTracker AI.*

Our AI-powered support bot lets you:
• Lodge a complaint right here
• Get an instant AI classification + priority
• Track every ticket from Telegram *or* the web dashboard

*Commands*
/submit — Raise a new complaint
/ask <question> — Ask our AI assistant anything
/mycomplaints — List all your complaints
/status CMP-1234 — Check a specific ticket
/account — Show your web-portal login
/resetpassword — Get a fresh temporary password
/help — Show this menu again
/cancel — Abort whatever you were doing

Type /submit to begin.`;
        bot.sendMessage(msg.chat.id, welcome, { parse_mode: 'Markdown' });
    });

    /* ---------- /help ---------- */
    bot.onText(/^\/help\b/, (msg) => {
        sessions.delete(msg.chat.id);
        bot.sendMessage(msg.chat.id,
`*ComplainTracker AI — Commands*

/submit — Raise a new complaint
/ask <question> — Ask our AI assistant anything
/mycomplaints — List your complaints
/status CMP-1234 — Check a specific ticket
/account — Show your login
/resetpassword — New temporary password
/cancel — Cancel the current step

During /submit you'll be asked for:
1. A description of the problem
2. Mobile number (optional)
3. An image (optional)

We'll also DM you here whenever your ticket's status changes.`,
            { parse_mode: 'Markdown' }
        );
    });

    /* ---------- /cancel ---------- */
    bot.onText(/^\/cancel\b/, (msg) => {
        const hadSession = sessions.delete(msg.chat.id);
        bot.sendMessage(
            msg.chat.id,
            hadSession ? "✖️ Cancelled. Type /submit to start over." : "Nothing to cancel.",
            { reply_markup: { remove_keyboard: true } }
        );
    });

    /* ---------- /submit ---------- */
    bot.onText(/^\/submit\b/, (msg) => {
        sessions.set(msg.chat.id, { state: 'AWAIT_TEXT', data: {} });
        bot.sendMessage(msg.chat.id,
`📝 *Describe your complaint*

Please tell us what happened — be as specific as you can. This helps our AI classify and prioritize faster.

Type /cancel to abort.`,
            { parse_mode: 'Markdown' }
        );
    });

    /* ---------- /mycomplaints ---------- */
    bot.onText(/^\/mycomplaints\b/, async (msg) => {
        const chatId = msg.chat.id;
        const snapshot = await db.collection(COLLECTIONS.USERS).where('username', '==', `tg_${chatId}`).get();
        if (snapshot.empty) {
            return bot.sendMessage(chatId, "You haven't submitted any complaints yet. Type /submit to begin.");
        }
        const userId = snapshot.docs[0].id;
        const complaintsSnap = await db.collection(COLLECTIONS.COMPLAINTS)
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        const complaints = complaintsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!complaints.length) {
            return bot.sendMessage(chatId, "No complaints on record. Type /submit to begin.");
        }
        const statusIcon = (s) =>
            s === 'RESOLVED' ? '✅' :
            s === 'ESCALATED' ? '🚨' :
            s === 'WITHDRAWN' ? '↩️' :
            s === 'IN_PROGRESS' ? '⚙️' : '🕓';
        const lines = complaints.map(c =>
`${statusIcon(c.status)} *${c.ticketId}* — ${c.status}
   _${c.category} / ${c.priority}_
   "${c.text.slice(0, 80)}${c.text.length > 80 ? '…' : ''}"`
        );
        bot.sendMessage(chatId,
            `*Your last ${complaints.length} complaint(s):*\n\n${lines.join('\n\n')}\n\nUse /status CMP-xxxx for details.`,
            { parse_mode: 'Markdown' }
        );
    });

    /* ---------- /status (bare — show usage) ---------- */
    bot.onText(/^\/status\s*$/, async (msg) => {
        const chatId = msg.chat.id;
        const snapshot = await db.collection(COLLECTIONS.USERS).where('username', '==', `tg_${chatId}`).get();
        if (snapshot.empty) {
            return bot.sendMessage(chatId, "Usage: /status CMP-1234\n\nYou haven't submitted any complaints yet. Type /submit to begin.");
        }
        const userId = snapshot.docs[0].id;
        const recentSnap = await db.collection(COLLECTIONS.COMPLAINTS)
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();
        
        const recent = recentSnap.docs.map(doc => doc.data());
        const hint = recent.length
            ? `\n\nYour most recent: ${recent.map(r => `${r.ticketId} (${r.status})`).join(', ')}`
            : '';
        bot.sendMessage(chatId,
            `Usage: /status CMP-1234\n\nOr type /mycomplaints to see all your tickets.${hint}`
        );
    });

    /* ---------- /status CMP-xxxx ---------- */
    bot.onText(/^\/status\s+(.+)$/, async (msg, match) => {
        const ticket = match[1].trim();
        const chatId = msg.chat.id;
        try {
            // Firestore doesn't support OR natively for different fields easily, standard with CMP prefix anyway
            let snapshot = await db.collection(COLLECTIONS.COMPLAINTS).where('ticketId', '==', ticket).get();
            if (snapshot.empty) {
                // Try looking up by Firestore ID
                const doc = await db.collection(COLLECTIONS.COMPLAINTS).doc(ticket).get();
                if (doc.exists) {
                    snapshot = { docs: [doc], empty: false };
                }
            }

            if (snapshot.empty) {
                return bot.sendMessage(chatId, `Ticket "${ticket}" not found. Type /mycomplaints to see your tickets.`);
            }
            
            const complaintDoc = snapshot.docs[0];
            const complaint = { id: complaintDoc.id, ...complaintDoc.data() };

            // Fetch Notes
            const notesSnapshot = await db.collection(COLLECTIONS.NOTES).where('complaintId', '==', complaint.id).orderBy('createdAt', 'desc').limit(3).get();
            const notes = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const reply = [
                `${complaint.ticketId} — ${complaint.status}`,
                ``,
                `Category: ${complaint.category}`,
                `Priority: ${complaint.priority}`,
                `Recommendation: ${complaint.recommendation}`,
                ``,
                `Submitted: ${new Date(complaint.createdAt).toLocaleString()}`,
                complaint.resolutionTime ? `Resolved in: ${complaint.resolutionTime}h` : null,
                complaint.withdrawnAt ? `Withdrawn: ${new Date(complaint.withdrawnAt).toLocaleString()}` : null
            ].filter(Boolean);

            if (notes.length > 0) {
                reply.push('', '--- Latest notes from support ---');
                // Hydrate Authors
                const authorIds = [...new Set(notes.map(n => n.authorId))];
                const authors = {};
                const authorSnaps = await Promise.all(authorIds.map(aid => db.collection(COLLECTIONS.USERS).doc(aid).get()));
                authorSnaps.forEach(s => { if (s.exists) authors[s.id] = s.data(); });

                for (const n of notes) {
                    const author = authors[n.authorId];
                    reply.push(`• ${author?.username || '?'} (${author?.role || '?'}): ${n.text.slice(0, 160)}`);
                }
            }
            await bot.sendMessage(chatId, reply.join('\n'));
        } catch (err) {
            console.error('[tg] /status failed:', err.message);
            bot.sendMessage(chatId, "⚠️ Couldn't fetch that ticket. Please try again.");
        }
    });

    /* ---------- /account ---------- */
    bot.onText(/^\/account\b/, async (msg) => {
        const chatId = msg.chat.id;
        const snapshot = await db.collection(COLLECTIONS.USERS).where('username', '==', `tg_${chatId}`).get();
        if (snapshot.empty) {
            return bot.sendMessage(chatId, "No account yet. Submit a complaint first with /submit.");
        }
        const user = snapshot.docs[0].data();
        bot.sendMessage(chatId,
`*Your web-portal login*
 
Username: \`${user.username}\`
Password: _(use the one you got at registration)_
 
🔗 Log in at ${FRONTEND_URL}/login
 
Forgot your password? Type /resetpassword.`,
            { parse_mode: 'Markdown' }
        );
    });

    /* ---------- /resetpassword ---------- */
    bot.onText(/^\/resetpassword\b/, async (msg) => {
        const chatId = msg.chat.id;
        const snapshot = await db.collection(COLLECTIONS.USERS).where('username', '==', `tg_${chatId}`).get();
        if (snapshot.empty) {
            return bot.sendMessage(chatId, "No account yet. Submit a complaint first with /submit.");
        }
        const userDoc = snapshot.docs[0];
        const pwd = randomPassword();
        const hashed = await bcrypt.hash(pwd, 10);
        await userDoc.ref.update({ password: hashed });
        bot.sendMessage(chatId,
`🔐 *New temporary password*
 
Username: \`${userDoc.data().username}\`
Password: \`${pwd}\`
 
Log in at ${FRONTEND_URL}/login and change it under Settings → Password.`,
            { parse_mode: 'Markdown' }
        );
    });

    /* ---------- /ask — Gemma-powered assistant ---------- */
    bot.onText(/^\/ask\s+(.+)$/s, async (msg, match) => {
        const chatId = msg.chat.id;
        const question = match[1].trim();
        if (!gemini.isReady()) {
            return bot.sendMessage(chatId, "The AI assistant isn't configured on this server yet.");
        }
        try {
            const snapshot = await db.collection(COLLECTIONS.USERS).where('username', '==', `tg_${chatId}`).get();
            let contextBlock = '';
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                const complaintsSnap = await db.collection(COLLECTIONS.COMPLAINTS)
                    .where('userId', '==', userDoc.id)
                    .orderBy('createdAt', 'desc')
                    .limit(10)
                    .get();
                
                const complaints = complaintsSnap.docs.map(doc => doc.data());
                const lines = complaints.map(c =>
                    `- ${c.ticketId} [${c.status}] ${c.category}/${c.priority} | ${new Date(c.createdAt).toLocaleDateString()} | "${c.text.slice(0, 100)}${c.text.length > 100 ? '...' : ''}" | rec: ${c.recommendation}`
                );
                contextBlock = `THE CUSTOMER'S COMPLAINTS (most recent first):\n${lines.join('\n') || '(no complaints yet)'}\n`;
            }

            const systemPrompt = `You are ComplainTracker AI — a concise, friendly support assistant on Telegram.
The customer asked a question. Keep replies short (2-4 short sentences or a tiny bullet list).
If the question is about their tickets, use the context below. Never invent ticket IDs.
If the answer needs more detail (e.g. a long note thread), tell them to use /status CMP-xxxx.
Plain text only — no markdown, no emoji-heavy formatting.

${contextBlock}`;

            const reply = await gemini.chat({
                systemPrompt,
                messages: [{ role: 'user', content: question }]
            });
            await bot.sendMessage(chatId, reply);
        } catch (err) {
            console.error('[tg] /ask failed:', err.message);
            bot.sendMessage(chatId, "⚠️ The AI assistant had trouble answering. Try again in a moment.");
        }
    });

    bot.onText(/^\/ask\s*$/, (msg) => {
        bot.sendMessage(msg.chat.id, "Usage: /ask <your question>\n\nExample: /ask what is the status of my latest complaint");
    });

    /* ---------- Conversation handler (non-command messages) ---------- */
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const session = sessions.get(chatId);
        if (!session) return; // No active flow — ignore

        // Let /cancel, /skip, etc. fall through; otherwise ignore commands during a flow
        if (msg.text && msg.text.startsWith('/') && msg.text !== '/skip') return;

        try {
            /* ----- AWAIT_TEXT ----- */
            if (session.state === 'AWAIT_TEXT') {
                if (!msg.text) {
                    return bot.sendMessage(chatId, "Please send the complaint as *text*. Or /cancel.", { parse_mode: 'Markdown' });
                }
                session.data.text = msg.text.trim();
                session.state = 'AWAIT_MOBILE';
                return bot.sendMessage(chatId,
                    "📱 Share your *mobile number* so we can reach you if needed. Tap the button below, type your number, or send /skip.",
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            keyboard: [
                                [{ text: '📞 Share my phone number', request_contact: true }],
                                [{ text: '/skip' }]
                            ],
                            one_time_keyboard: true,
                            resize_keyboard: true
                        }
                    }
                );
            }

            /* ----- AWAIT_MOBILE ----- */
            if (session.state === 'AWAIT_MOBILE') {
                let mobile = null;
                if (msg.contact && msg.contact.phone_number) {
                    mobile = msg.contact.phone_number;
                } else if (msg.text && msg.text !== '/skip') {
                    mobile = msg.text.trim();
                }
                session.data.mobileNumber = mobile;
                session.state = 'AWAIT_IMAGE';
                return bot.sendMessage(chatId,
                    "📸 Want to attach an *image proof*? Send a photo now, or /skip to continue.",
                    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
                );
            }

            /* ----- AWAIT_IMAGE ----- */
            if (session.state === 'AWAIT_IMAGE') {
                let imageUrl = null;
                if (msg.photo && msg.photo.length > 0) {
                    const photo = msg.photo[msg.photo.length - 1]; // largest variant
                    try {
                        imageUrl = await downloadPhotoFromTelegram(photo);
                    } catch (e) {
                        console.error('[tg] photo download failed:', e.message);
                        bot.sendMessage(chatId, "⚠️ Couldn't save your photo — I'll continue without it.");
                    }
                } else if (msg.text && msg.text !== '/skip') {
                    return bot.sendMessage(chatId, "Please send a *photo*, or /skip to skip.", { parse_mode: 'Markdown' });
                }

                // ----- Submit -----
                const { text, mobileNumber } = session.data;
                sessions.delete(chatId);

                bot.sendMessage(chatId, "⚙️ Analyzing your complaint with our AI…");

                try {
                    const { user, isNew, password } = await ensureUserForChat(chatId, mobileNumber);

                    const mlResponse = await axios.post(`${ML_ENGINE_URL}/analyze`, { text });
                    const { category, priority, sentiment, recommendation, validation_flag, explanation } = mlResponse.data;

                    const complaintData = {
                        ticketId: generateTicketId(),
                        text,
                        category,
                        priority,
                        recommendation,
                        sentiment,
                        validation_flag,
                        explanation,
                        mobileNumber: user.mobileNumber || mobileNumber || null,
                        imageUrl,
                        userId: user.id,
                        status: 'OPEN',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    const complaintDoc = await db.collection(COLLECTIONS.COMPLAINTS).add(complaintData);

                    // Drop a notification so it also shows up in the web UI
                    try {
                        await db.collection(COLLECTIONS.NOTIFICATIONS).add({
                            userId: user.id,
                            complaintId: complaintDoc.id,
                            title: `Complaint ${complaintData.ticketId} received (via Telegram)`,
                            message: `AI tagged it as ${category}/${priority}. ${recommendation}`,
                            type: 'UPDATE',
                            read: false,
                            createdAt: new Date().toISOString()
                        });
                    } catch (e) { /* non-fatal */ }

                    const priIcon = priority === 'High' ? '🔴' : priority === 'Medium' ? '🟠' : '🟢';
                    const lines = [
                        `✅ *Complaint registered*`,
                        ``,
                        `Ticket ID: \`${complaintData.ticketId}\``,
                        `Category: *${category}*`,
                        `Priority: ${priIcon} *${priority}*`,
                        `Recommendation: _${recommendation}_`,
                        ``,
                    ];
                    if (isNew) {
                        lines.push(
                            `🔐 *Your web-portal login (save this!)*`,
                            `Username: \`${user.username}\``,
                            `Password: \`${password}\``,
                            `Login at ${FRONTEND_URL}/login`,
                            ``,
                            `You can track right here with /status ${complaintData.ticketId} or /mycomplaints.`
                        );
                    } else {
                        lines.push(`Track it with /status ${complaintData.ticketId} or /mycomplaints.`);
                    }
                    bot.sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });
                } catch (err) {
                    console.error('[tg] submit error:', err.message);
                    bot.sendMessage(chatId, "⚠️ Sorry, something went wrong processing your complaint. Please try /submit again.");
                }
            }
        } catch (err) {
            console.error('[tg] conversation error:', err);
            sessions.delete(chatId);
            bot.sendMessage(chatId, "⚠️ Unexpected error. Your session has been reset — type /submit to try again.");
        }
    });
} else {
    console.log("No TELEGRAM_BOT_TOKEN provided, skipping telegram integration.");
}

module.exports = { bot, notifyTelegramUser };
