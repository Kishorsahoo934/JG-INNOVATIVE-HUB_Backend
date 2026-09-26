import express from "express";
import { adminLogin } from "../controllers/admin.controller.js";
import adminAuth from "../middleware/adminAuth.middleware.js";
import upload, { uploadVideo, uploadToCloudinary, uploadOfflinePdf, uploadOfflineDoc } from "../middleware/upload.middleware.js";
import { createProduct, updateProduct, getAllProductsAdmin } from "../controllers/product.controller.js";
import { cleanupOldInvoiceUploads } from "../utils/cleanupInvoiceCloudinary.js";
import User from "../models/User.model.js";
import SessionSlot from "../models/SessionSlot.model.js";
import Workshop from "../models/Workshop.model.js";
import Internship from "../models/Internship.model.js";
import InternshipPost from "../models/InternshipPost.model.js";
import ConsultationBooking from "../models/ConsultationBooking.model.js";
import { createWorkshopAdmin, updateWorkshopAdmin, deleteWorkshopAdmin } from "../controllers/workshop.controller.js";

const router = express.Router();

router.post("/login", adminLogin);

router.get("/profile", adminAuth, (req, res) => {
  res.json({ admin: req.admin });
});

// Admin: get all products (no pagination, full data) for manage-products UI
router.get("/products", adminAuth, getAllProductsAdmin);

const maybeUploadImages = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) return next();
  return upload.array('images', 5)(req, res, next);
};

// Product management (admin scope)
router.post("/products", adminAuth, maybeUploadImages, createProduct);
router.put("/products/:id", adminAuth, updateProduct);

// Image upload endpoints
router.post("/upload/image", adminAuth, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }
    const result = await uploadToCloudinary(req.file.buffer, "innovative-hub/products");
    res.status(200).json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    next(error);
  }
});

router.post("/upload/editor-image", adminAuth, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }
    const result = await uploadToCloudinary(req.file.buffer, "innovative-hub/editor");
    res.status(200).json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    next(error);
  }
});

// Video upload for product videos (mp4, webm, mov, etc.). Clear errors so admin can retry.
// Offline order bill uploads (PDF / Word) — stored as raw on Cloudinary
router.post("/upload/offline-bill-pdf", adminAuth, uploadOfflinePdf.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No PDF file provided" });
    }
    const result = await uploadToCloudinary(req.file.buffer, "innovative-hub/offline-bills", "raw");
    res.status(200).json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    next(error);
  }
});

router.post("/upload/offline-bill-doc", adminAuth, uploadOfflineDoc.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No document file provided" });
    }
    const result = await uploadToCloudinary(req.file.buffer, "innovative-hub/offline-bills", "raw");
    res.status(200).json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    next(error);
  }
});

router.post("/upload/video", adminAuth, (req, res, next) => {
  uploadVideo.single("video")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Video is too large (max 100MB). Please choose a smaller file and try again.",
        });
      }
      if (err.message && err.message.includes("video")) {
        return res.status(400).json({
          success: false,
          message: "Only video files are allowed (e.g. mp4, webm, mov). Please select a video and try again.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Video upload failed. Please try again.",
      });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No video file provided. Please select a file and try again." });
    }
    const result = await uploadToCloudinary(req.file.buffer, "innovative-hub/products", "video");
    res.status(200).json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Video upload failed. Please try again.",
    });
  }
});

// Delete invoice PDFs from Cloudinary older than 1 hour (run hourly or manually)
router.post("/cleanup-invoices", adminAuth, async (req, res, next) => {
  try {
    const result = await cleanupOldInvoiceUploads();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Admin Tutor Management
router.get("/tutors", adminAuth, async (req, res, next) => {
  try {
    const tutors = await User.find({ role: "tutor" }).select("-password");
    res.json({ success: true, data: tutors });
  } catch (error) {
    next(error);
  }
});

router.patch("/tutors/:id/status", adminAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const tutor = await User.findById(req.params.id);
    if (!tutor) {
      return res.status(404).json({ success: false, message: "Tutor not found" });
    }

    tutor.tutorStatus = status;
    if (status === "rejected") {
      tutor.role = "student";
    }
    await tutor.save();

    res.json({ success: true, message: `Tutor registration ${status} successfully` });
  } catch (error) {
    next(error);
  }
});

// Admin Robotics Sales metrics
router.get("/sales/robotics", adminAuth, async (req, res, next) => {
  try {
    const bookedSessions = await SessionSlot.find({ status: "booked" });

    const totalSessionSales = bookedSessions.reduce((sum, s) => sum + s.cost, 0);

    res.json({
      success: true,
      data: {
        totalCourseSales: 0,
        totalSessionSales,
        totalSales: totalSessionSales,
        enrollmentsCount: 0,
        bookedSessionsCount: bookedSessions.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all workshops (with optional status query)
router.get("/workshops", adminAuth, async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query.status = status;
    }
    const workshops = await Workshop.find(query)
      .populate("hostId", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: workshops });
  } catch (error) {
    next(error);
  }
});

// Admin: Create workshop directly
router.post("/workshops", adminAuth, createWorkshopAdmin);
router.patch("/workshops/:id", adminAuth, updateWorkshopAdmin);
router.delete("/workshops/:id", adminAuth, deleteWorkshopAdmin);

// Admin: Get pending workshops
router.get("/workshops/pending", adminAuth, async (req, res, next) => {
  try {
    const pending = await Workshop.find({ status: "pending" })
      .populate("hostId", "name email");
    res.json({ success: true, data: pending });
  } catch (error) {
    next(error);
  }
});

// Admin: Approve or Reject a workshop
router.patch("/workshops/:id/status", adminAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'" });
    }

    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) {
      return res.status(404).json({ success: false, message: "Workshop not found" });
    }

    workshop.status = status;
    await workshop.save();

    res.json({ success: true, message: `Workshop ${status} successfully`, data: workshop });
  } catch (error) {
    next(error);
  }
});


// Admin: Create internship application manually
router.post('/internships', adminAuth, async (req, res, next) => {
  try {
    const { email, name, mobile, category, tier, status, yearOfStudy, resumeUrl, skills, coverLetter } = req.body;
    if (!email || !name || !mobile) {
      return res.status(400).json({ success: false, message: 'Name, email, and mobile are required.' });
    }

    // Try to find the user by email
    let user = await User.findOne({ email });
    if (!user) {
      // Create a dummy user so studentId is satisfied
      user = new User({
        name,
        email,
        mobile,
        password: 'AutoGenerated' + Math.random().toString(36).slice(-8), // Dummy password
        isVerified: true
      });
      await user.save();
    }

    const application = new Internship({
      studentId: user._id,
      name,
      email,
      mobile,
      category: category || 'self-funded',
      tier: tier || '1-month',
      status: status || 'pending',
      yearOfStudy: yearOfStudy || '3rd-year',
      resumeUrl: resumeUrl || 'Offline Application',
      skills: skills || [],
      coverLetter: coverLetter || 'Manually added by admin.'
    });

    await application.save();
    res.status(201).json({ success: true, data: application, message: 'Internship application created successfully.' });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete internship application
router.delete('/internships/:id', adminAuth, async (req, res, next) => {
  try {
    const application = await Internship.findByIdAndDelete(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    res.json({ success: true, message: 'Internship application deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// Admin: View all internship applications
router.get("/internships", adminAuth, async (req, res, next) => {
  try {
    const applications = await Internship.find()
      .populate("studentId", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: applications });
  } catch (error) {
    next(error);
  }
});

// Admin: Review/Update internship application status
router.patch('/internships/:id', adminAuth, async (req, res, next) => {
    try {
      const app = await Internship.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('studentId', 'name email');
      if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
      res.json({ success: true, data: app });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/internships/:id/status', adminAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'under-review', 'shortlisted', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid internship status" });
    }

    const application = await Internship.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Internship application not found" });
    }

    application.status = status;
    await application.save();

    res.json({ success: true, message: `Application status updated to ${status}`, data: application });
  } catch (error) {
    next(error);
  }
});

export default router;



// Admin: View all Product Development Consultations
router.get("/consultations", adminAuth, async (req, res, next) => {
  try {
    const consultations = await ConsultationBooking.find()
      .populate("user", "name email profileImage")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: consultations });
  } catch (error) {
    next(error);
  }
});

// Admin: Update Product Development Process Stage
router.patch('/consultations/:id/stage', adminAuth, async (req, res, next) => {
  try {
    const { processStage } = req.body;
    const allowed = ['Idea Submitted', 'Requirement Discussion', 'Project Confirmation', 'Design & Development', 'Testing & Delivery', 'Completed'];
    if (!allowed.includes(processStage)) {
      return res.status(400).json({ success: false, message: "Invalid process stage" });
    }

    const application = await ConsultationBooking.findByIdAndUpdate(req.params.id, { processStage }, { new: true });
    if (!application) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }

    res.json({ success: true, data: application, message: "Stage updated successfully" });
  } catch (error) {
    next(error);
  }
});



// Admin: Edit Consultation
router.patch('/consultations/:id', adminAuth, async (req, res, next) => {
  try {
    const consultation = await ConsultationBooking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!consultation) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }
    res.json({ success: true, data: consultation });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete Consultation
router.delete('/consultations/:id', adminAuth, async (req, res, next) => {
  try {
    const consultation = await ConsultationBooking.findByIdAndDelete(req.params.id);
    if (!consultation) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }
    res.json({ success: true, message: "Consultation deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// ============ INTERNSHIP POSTS ============

// Admin: Create Internship Post
router.post('/internship-posts', adminAuth, async (req, res, next) => {
  try {
    const post = new InternshipPost(req.body);
    await post.save();
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: Get all Internship Posts
router.get('/internship-posts', adminAuth, async (req, res, next) => {
  try {
    const posts = await InternshipPost.find().sort({ createdAt: -1 });
    res.json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
});

// Admin: Update Internship Post
router.patch('/internship-posts/:id', adminAuth, async (req, res, next) => {
  try {
    const post = await InternshipPost.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete Internship Post
router.delete('/internship-posts/:id', adminAuth, async (req, res, next) => {
  try {
    const post = await InternshipPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
});

