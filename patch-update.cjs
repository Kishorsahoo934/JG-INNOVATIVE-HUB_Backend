const fs = require('fs');
let content = fs.readFileSync('k:/jg_inovative_hub/JG-INNOVATIVE-HUB_Backend/src/controllers/workshop.controller.js', 'utf8');

content = content.replace(
    /const workshop = await Workshop\.findByIdAndUpdate\(\s+id,\s+\{\s*showOnHomepage,\s*\.\.\.otherFields\s*\},\s+\{\s*new:\s*true\s*\}\s+\);/g,
    `const updateData = { ...otherFields };
    if (showOnHomepage !== undefined) {
      updateData.showOnHomepage = showOnHomepage;
    }
    const workshop = await Workshop.findByIdAndUpdate(id, updateData, { new: true });`
);

fs.writeFileSync('k:/jg_inovative_hub/JG-INNOVATIVE-HUB_Backend/src/controllers/workshop.controller.js', content);

