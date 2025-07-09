const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components/editor/minimal-tiptap');

// Files to process
const files = [
  'components/bubble-menu/link-bubble-menu.tsx',
  'components/image/image-edit-block.tsx',
  'components/image/image-edit-dialog.tsx',
  'components/link/link-edit-block.tsx',
  'components/link/link-edit-popover.tsx',
  'components/link/link-popover-block.tsx',
  'components/measured-container.tsx',
  'components/section/five.tsx',
  'components/section/four.tsx',
  'components/section/one.tsx',
  'components/section/three.tsx',
  'components/section/two.tsx',
  'components/shortcut-key.tsx',
  'components/spinner.tsx',
  'components/toolbar-button.tsx',
  'components/toolbar-section.tsx',
  'editor.tsx',
  'extensions/image/components/image-actions.tsx',
  'extensions/image/components/image-overlay.tsx',
  'extensions/image/components/image-view-block.tsx',
  'extensions/image/components/resize-handle.tsx',
  'minimal-tiptap.tsx'
];

// Process each file
files.forEach(file => {
  const filePath = path.join(componentsDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace @/components/ui/ imports with relative paths
    content = content.replace(
      /@\/components\/ui\/([a-zA-Z-]+)/g, 
      (match, component) => `../../../../components/ui/${component}`
    );
    
    // Update other @/ imports to use relative paths
    content = content.replace(
      /@\/([a-zA-Z/.-]+)/g, 
      (match, importPath) => `../../../../${importPath}`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated imports in ${file}`);
  } else {
    console.warn(`File not found: ${filePath}`);
  }
});

console.log('Import path updates complete!');
