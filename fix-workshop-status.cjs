const fs = require('fs');
let content = fs.readFileSync('k:/jg_inovative_hub/JG-INNOVATIVE-HUB_Backend/src/controllers/workshop.controller.js', 'utf8');

// fix query
content = content.replace(
    /const query = \{\s+date: \{ \$gte: today \}\s+\};/,
    "const query = {\n      status: 'approved',\n      date: { $gte: today }\n    };"
);

fs.writeFileSync('k:/jg_inovative_hub/JG-INNOVATIVE-HUB_Backend/src/controllers/workshop.controller.js', content);
