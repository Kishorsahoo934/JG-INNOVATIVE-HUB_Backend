const fs = require('fs');
let content = fs.readFileSync('k:/jg_inovative_hub/JG-INNOVATIVE-HUB_Backend/src/routes/admin.routes.js', 'utf8');

content = content.replace('createWorkshopAdmin, updateWorkshopAdmin', 'createWorkshopAdmin, updateWorkshopAdmin, deleteWorkshopAdmin');
content = content.replace(
    'router.patch("/workshops/:id", adminAuth, updateWorkshopAdmin);', 
    'router.patch("/workshops/:id", adminAuth, updateWorkshopAdmin);\nrouter.delete("/workshops/:id", adminAuth, deleteWorkshopAdmin);'
);

fs.writeFileSync('k:/jg_inovative_hub/JG-INNOVATIVE-HUB_Backend/src/routes/admin.routes.js', content);

