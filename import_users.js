const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('./models/User'); // Giả định đã có model User
const sendMailHandler = require('./utils/sendMailHandler'); // Nếu đã có hàm gửi mail

// Đường dẫn file CSV
const csvPath = path.join(__dirname, 'users.csv');

// Hàm tạo password ngẫu nhiên
function generatePassword(length = 16) {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
}

// Hàm đọc CSV
function readCSV(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.trim().split('\n');
    const users = [];
    for (let i = 1; i < lines.length; i++) {
        const [username, email] = lines[i].split(',');
        users.push({ username: username.trim(), email: email.trim() });
    }
    return users;
}

// Hàm gửi email qua Mailtrap
async function sendPasswordEmail(email, username, password) {
    // Cấu hình Mailtrap
    const transporter = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
            user: 'MAILTRAP_USER', // Thay bằng user Mailtrap
            pass: 'MAILTRAP_PASS', // Thay bằng pass Mailtrap
        },
    });

    const mailOptions = {
        from: 'no-reply@example.com',
        to: email,
        subject: 'Your Account Password',
        text: `Hello ${username},\nYour password is: ${password}`,
    };

    await transporter.sendMail(mailOptions);
}

async function importUsers() {
    const users = readCSV(csvPath);
    for (const user of users) {
        const password = generatePassword();
        // Lưu user vào DB
        await User.create({
            username: user.username,
            email: user.email,
            password: password, // Nên hash password nếu dùng thực tế
            role: 'user',
        });
        // Gửi email password
        await sendPasswordEmail(user.email, user.username, password);
        console.log(`Imported and emailed: ${user.username}`);
    }
    console.log('All users imported and emails sent!');
}

importUsers().catch(console.error);