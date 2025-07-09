const fs = require('fs');
const path = require('path');

// Directory containing the minimal-tiptap components
const MINIMAL_TIPTAP_DIR = path.join(__dirname, '../components/editor/minimal-tiptap');

// Patterns to update
const IMPORT_PATTERNS = [
  {
    pattern: /from "\.\.\/\..*?\/components\/ui\//g,
    replacement: 'from "@/components/ui/'
  },
  {
    pattern: /from "\.\.\/\..*?\/lib\/utils"/g,
    replacement: 'from "@/lib/utils"'
  }
];

// Process all TypeScript and TypeScript React files
function processFiles(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      processFiles(fullPath);
    } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let updated = false;
      
      for (const { pattern, replacement } of IMPORT_PATTERNS) {
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
          updated = true;
        }
      }
      
      if (updated) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated imports in ${fullPath}`);
      }
    }
  }
}

console.log('Updating imports in minimal-tiptap components...');
processFiles(MINIMAL_TIPTAP_DIR);
console.log('Done!');
