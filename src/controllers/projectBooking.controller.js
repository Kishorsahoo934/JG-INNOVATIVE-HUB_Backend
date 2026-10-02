import ProjectBooking from '../models/ProjectBooking.model.js';
import { uploadBufferToCloudinary } from '../middleware/upload.middleware.js';
import { sendContactEmail } from '../utils/mailer.js';
import { emailService } from '../services/email.service.js';

export const submitProjectBookingForm = async (req, res, next) => {
  try {
    const { 
      name, email, phone, message, subject, 
      company, productName, productCategory, currentStage, estimatedBudget, expectedTimeline, problemStatement, detailedDescription
    } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const uploadedAttachments = [];
    
    for (const file of files) {
      if (file.buffer) {
        try {
          const result = await uploadBufferToCloudinary({
            buffer: file.buffer,
            folder: 'innovative-hub/projects',
            filename: "project_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}",
              resourceType: file.mimetype.startsWith('image/') ? 'image' : 'raw'
          });
          uploadedAttachments.push({
            url: result.secure_url,
            publicId: result.public_id,
            filename: file.originalname
          });
        } catch (uploadErr) {
          console.error('[Cloudinary] Failed to upload project attachment:', uploadErr);
        }
      }
    }

    const booking = new ProjectBooking({
      user: req.userId || (req.user && req.user._id),
      name,
      email,
      phone,
      message,
      company,
      productName,
      productCategory,
      currentStage,
      estimatedBudget,
      expectedTimeline,
      problemStatement,
      detailedDescription,
      attachments: uploadedAttachments,
      amount: 0,
      razorpay_order_id: 'FREE',
      razorpay_payment_id: 'FREE'
    });
    await booking.save();

    const receiver = process.env.CONTACT_RECEIVER_EMAIL || 'supportinnovativehub@gmail.com';
    const emailBody = "New Custom Project Request Received!\n\nUser: ${req.user ? req.user.name : name} (${email})\nPhone: ${phone}\n\n${message}";

    sendContactEmail({
      toEmail: receiver,
      fromName: name,
      fromEmail: email,
      subject: subject || 'Custom Project Request',
      message: emailBody,
    }).catch(err => console.error("[Mailer] Failed to send admin project booking email", err));

    const userEmailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Project Booking Received!</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your custom project booking has been submitted successfully!</p>
        <p>Our engineering team will carefully review your requirements and get back to you shortly.</p>
        <p>Thank you for choosing JG Innovative Hub!</p>
        <br />
        <p>Best regards,<br/>JG Innovative Hub Team</p>
      </div>
    `;
    
    emailService.sendOperationalEmail(email, 'Custom Project Booking Successful', userEmailHtml)
      .catch(err => console.error("[Mailer] Failed to send user confirmation email", err));

    res.status(200).json({ success: true, message: 'Project booked successfully!' });
  } catch (error) {
    console.error('Project booking form error:', error?.message || error);
    next(error);
  }
};

export const getMyProjectBookings = async (req, res, next) => {
  try {
    const bookings = await ProjectBooking.find({ user: req.userId || (req.user && req.user._id) }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};
