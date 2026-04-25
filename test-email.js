import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log("Using email:", process.env.EMAIL_USER);
console.log("Password length:", process.env.EMAIL_APP_PASSWORD ? process.env.EMAIL_APP_PASSWORD.length : 0);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'cybersafety9870@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

const mailOptions = {
  from: process.env.EMAIL_USER || 'cybersafety9870@gmail.com',
  to: `23cc043@nandhaengg.org, ${process.env.EMAIL_USER || 'cybersafety9870@gmail.com'}`,
  subject: `🚨 TEST ALERT`,
  html: `<p>This is a test email to verify Nodemailer is working.</p>`
};

console.log("Attempting to send email...");

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error("❌ Error sending email:", error.message);
  } else {
    console.log("✅ Email sent successfully:", info.response);
  }
});
