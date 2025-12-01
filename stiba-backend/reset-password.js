const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Create connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

async function resetAdmin() {
    const newPassword = 'password123'; // <--- This will be your new password
    
    try {
        console.log('Generating hash...');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const promisePool = pool.promise();

        // Check if 'admin' user exists
        const [users] = await promisePool.execute('SELECT * FROM users WHERE username = ?', ['admin']);

        if (users.length > 0) {
            // Update existing user
            await promisePool.execute('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, 'admin']);
            console.log(`✅ Success! Password for "admin" updated to: ${newPassword}`);
        } else {
            // Create new user if not exists
            await promisePool.execute('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
            console.log(`✅ Success! Created user "admin" with password: ${newPassword}`);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}

resetAdmin();