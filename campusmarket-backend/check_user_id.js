const User = require('./models/User');
const { connectDB } = require('./config/database');

async function check() {
    await connectDB();
    try {
        console.log('Testing User.findById(5)...'); // Use 5 or 1 or whatever
        // First get ANY user ID
        const [users] = await User.pool.query('SELECT ID_Usuario FROM usuario LIMIT 1');
        if (users.length === 0) {
            console.log('No users in DB');
            process.exit();
        }
        const id = users[0].ID_Usuario;
        console.log('Testing with ID:', id);

        const user = await User.findById(id);
        console.log('User found:', user);
    } catch (error) {
        console.error('FAILURE MATCH:', error.message);
        console.error('CODE:', error.code);
    }
    process.exit();
}

check();
