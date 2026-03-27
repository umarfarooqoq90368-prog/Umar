const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { config } = require('dotenv');

config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const CSV_FILE = path.join(__dirname, 'contacts.csv');
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const TO_EMAIL = process.env.TO_EMAIL || EMAIL_USER;

function initCSV() {
    if (!fs.existsSync(CSV_FILE)) {
        fs.writeFileSync(CSV_FILE, 'Name,Email,Message,Date\n');
    }
}

function appendToCSV(data) {
    const row = `"${data.name}","${data.email}","${data.message.replace(/"/g, '""')}","${data.timestamp}"\n`;
    fs.appendFileSync(CSV_FILE, row);
}

async function sendEmail(data) {
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.log('⚠️ Email not configured. Skipping email send.');
        console.log('📧 Message received:', data);
        return false;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });

    const mailOptions = {
        from: EMAIL_USER,
        to: TO_EMAIL,
        subject: `New Contact from ${data.name}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px;">
                    <h2 style="color: #6c63ff;">📬 New Contact Message</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Name:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                                <a href="mailto:${data.email}">${data.email}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Date:</td>
                            <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(data.timestamp).toLocaleString()}</td>
                        </tr>
                    </table>
                    <div style="margin-top: 20px;">
                        <h3 style="color: #333;">Message:</h3>
                        <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; line-height: 1.6;">${data.message}</p>
                    </div>
                    <hr style="margin: 20px 0;">
                    <p style="color: #888; font-size: 12px;">This message was sent from your portfolio website.</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully!');
        return true;
    } catch (error) {
        console.error('❌ Email error:', error.message);
        return false;
    }
}

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, message, timestamp } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        appendToCSV({ name, email, message, timestamp });
        console.log('✅ Contact saved to CSV');

        const emailSent = await sendEmail({ name, email, message, timestamp });

        res.json({ 
            success: true, 
            message: emailSent 
                ? 'Message sent and saved!' 
                : 'Message saved (email not configured)' 
        });
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error occurred' 
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

initCSV();

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Server running on port ${PORT}              ║
║   📧 Email: ${EMAIL_USER ? 'Configured' : 'Not Set'}                   ║
║   📁 CSV: ${CSV_FILE}      ║
╚═══════════════════════════════════════════════╝
    `);
});
