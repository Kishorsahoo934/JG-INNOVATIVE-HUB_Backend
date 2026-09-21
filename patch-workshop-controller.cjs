const fs = require('fs');
let content = fs.readFileSync('k:/jg_inovative_hub/JG-INNOVATIVE-HUB_Backend/src/controllers/workshop.controller.js', 'utf8');

// Fix 1: Admin created workshops should be approved
content = content.replace(
    /const workshop = await Workshop\.create\(\{\s+title,/,
    "const workshop = await Workshop.create({\n      status: 'approved',\n      title,"
);

// Fix 2: Add deleteWorkshopAdmin function
if (!content.includes('deleteWorkshopAdmin')) {
    content += `

export const deleteWorkshopAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workshop = await Workshop.findByIdAndDelete(id);
    if (!workshop) {
      return res.status(404).json({ success: false, message: 'Workshop not found' });
    }
    res.json({ success: true, message: 'Workshop deleted successfully' });
  } catch (error) {
    next(error);
  }
};
`;
}

fs.writeFileSync('k:/jg_inovative_hub/JG-INNOVATIVE-HUB_Backend/src/controllers/workshop.controller.js', content);

