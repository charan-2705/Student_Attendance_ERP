const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsappNotificationService {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(), // Saves your login session so you only scan the QR code once
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Ensures smooth running on local systems
      }
    });

    // 1. Generate the QR Code in your terminal window
    this.client.on('qr', (qr) => {
      console.log('📢 [WHATSAPP ACTION REQUIRED] Scan the QR code below using your WhatsApp app (Linked Devices):');
      qrcode.generate(qr, { small: true });
    });

    // 2. Log confirmation once authentication passes successfully
    this.client.on('ready', () => {
      console.log('✅ WhatsApp Notification Engine is authenticated and active!');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
    });

    // Fire up the initialization engine
    this.client.initialize();
  }

  /**
   * Sends an automated low attendance warning via WhatsApp
   */
  async sendParentAlert(parentPhone, studentName, attendanceRate) {
    const messageBody = `Dear Parent, this is an automated alert from University Portal. Your ward, ${studentName}, currently has an attendance rate of ${attendanceRate}%, which is below the minimum mandatory threshold of 75%. Please ensure regular attendance to maintain examination eligibility.`;

    try {
      // Clean up the phone number format to match WhatsApp requirements (e.g., "918639885561@c.us")
      let cleanNumber = parentPhone.replace(/[^\d]/g, ''); // Removes +, spaces, or dashes
      
      // If the number doesn't end with WhatsApp's server suffix, append it
      const whatsappId = cleanNumber.endsWith('@c.us') ? cleanNumber : `${cleanNumber}@c.us`;

      // Send out the message payload
      await this.client.sendMessage(whatsappId, messageBody);
      console.log(`📲 WhatsApp alert successfully sent to parent of ${studentName} (+${cleanNumber})`);
      
      return { success: true };
    } catch (err) {
      console.error(`❌ Failed to deliver WhatsApp message to ${parentPhone}:`, err.message);
      return { success: false, error: err.message };
    }
  }
}

// Export a single initialized instance of the engine
module.exports = new WhatsappNotificationService();