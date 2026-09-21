const fs = require('fs');
const filePath = 'k:/jg_inovative_hub/JG-INNOVATIVE-HUB_Backend/src/routes/admin.routes.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find the broken text
const brokenPart = `router.patch(/internships/:id, adminAuth, async (req, res, next) => {
      try {
        const app = await Internship.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(studentId, 
  ame email);
      }
    });
  
  router.patch(/internships/:id/status, adminAuth, async (req, res, next) => {`;

const fixedPart = `router.patch('/internships/:id', adminAuth, async (req, res, next) => {
    try {
      const app = await Internship.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('studentId', 'name email');
      if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
      res.json({ success: true, data: app });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/internships/:id/status', adminAuth, async (req, res, next) => {`;

if (content.includes('router.patch(/internships/:id, adminAuth, async (req, res, next) => {')) {
    const regex = /router\.patch\(\/internships\/:id[\s\S]*?router\.patch\(\/internships\/:id\/status, adminAuth, async \(req, res, next\) => \{/;
    content = content.replace(regex, fixedPart);
    fs.writeFileSync(filePath, content);
    console.log('Fixed syntax error successfully.');
} else {
    console.log('Could not find the broken string block.');
}
