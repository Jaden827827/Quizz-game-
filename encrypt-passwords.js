const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Ljx778945@',
  database: 'assignment'
});

async function encryptPasswords() {
    try {
        const [users] = await db.execute('SELECT * FROM users');

        for (const user of users) {
            if (user.user_password && !user.user_password.startsWith('$2a$')) {
                const hashedPassword = await bcrypt.hash(user.user_password, 10);
                await db.execute('UPDATE users SET user_password = ? WHERE user_id = ?', [hashedPassword, user.user_id]);
                console.log(`Password for user ${user.user_name} has been encrypted.`);
            }
        }
        console.log('All passwords have been encrypted.');
    } catch (err) {
        console.error('Error encrypting passwords:', err.message);
    }
    await db.end();
}

encryptPasswords();