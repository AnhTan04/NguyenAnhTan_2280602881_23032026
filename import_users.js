const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const User = require('./schemas/users');
const Role = require('./schemas/roles');

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
    // Kết nối DB nếu chưa kết nối
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect('mongodb://localhost:27017/NNPTUD-C2');
    }

    // Tìm hoặc tạo role "user"
    let userRole = await Role.findOne({ name: 'user' });
    if (!userRole) {
        userRole = await Role.create({ name: 'user', description: 'User role' });
        console.log('Created role "user"');
    }

    const users = readCSV(csvPath);
    for (const user of users) {
        const password = generatePassword();
        // Kiểm tra user đã tồn tại chưa
        const existed = await User.findOne({ username: user.username });
        if (existed) {
            console.log(`User ${user.username} đã tồn tại, bỏ qua.`);
            continue;
        }
        // Lưu user vào DB
        await User.create({
            username: user.username,
            email: user.email,
            password: password, // Đã hash trong schema
            role: userRole._id,
        });
        // Gửi email password
        await sendPasswordEmail(user.email, user.username, password);
        console.log(`Imported and emailed: ${user.username}`);
    }
    console.log('All users imported and emails sent!');
    mongoose.disconnect();
}

importUsers().catch(console.error);