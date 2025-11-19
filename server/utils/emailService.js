const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false
  }
});

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 * @returns {Promise<Object>} - Result of the email sending operation
 */
const sendEmail = async (to, subject, text, html = '') => {
  try {
    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"Perundurai Rentals" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text // Use HTML if provided, otherwise use text
    });

    console.log('Message sent: %s', info.messageId);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Example usage:
// sendEmail(
//   'user@example.com',
//   'Welcome to Perundurai Rentals',
//   'Thank you for signing up!',
//   '<h1>Welcome to Perundurai Rentals</h1><p>Thank you for signing up!</p>'
// );

module.exports = {
  sendEmail
};
