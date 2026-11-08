const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next') processDir(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      let content = fs.readFileSync(full, 'utf8');
      if (content.includes('Sparkles')) {
        console.log('Replacing Sparkles in:', full);
        // Replace in import
        content = content.replace(/import\s*\{([^}]*)\bSparkles\b([^}]*)\}\s*from\s*["']lucide-react["']/g, (match, p1, p2) => {
          let items = (p1 + p2).split(',').map(s => s.trim()).filter(Boolean);
          if (!items.includes('Activity')) items.push('Activity');
          return 'import { ' + items.join(', ') + ' } from "lucide-react"';
        });
        // Replace JSX tags
        content = content.replace(/<Sparkles\b/g, '<Activity');
        content = content.replace(/<\/Sparkles>/g, '</Activity>');
        fs.writeFileSync(full, content, 'utf8');
      }
    }
  }
}

processDir('src');
console.log('Done replacing Sparkles icons across all files.');
