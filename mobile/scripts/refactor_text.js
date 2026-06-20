const fs = require('fs');
const path = require('path');

const directories = [
  path.join(__dirname, '../app'),
  path.join(__dirname, '../src/components')
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      if (fullPath.includes('ui/Text.tsx')) continue; // skip our custom component
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // 1. Find import from 'react-native'
      // It can be multi-line.
      const rnImportRegex = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]react-native['"];/g;
      
      content = content.replace(rnImportRegex, (match, importsStr) => {
        // Parse the imports
        const imports = importsStr.split(',').map(i => i.trim()).filter(Boolean);
        
        // Find Text
        const textIndex = imports.findIndex(i => i === 'Text' || i === 'type Text');
        if (textIndex !== -1) {
          imports.splice(textIndex, 1);
          changed = true;
          
          if (imports.length === 0) return '';
          
          // Reconstruct the import
          return `import { ${imports.join(', ')} } from 'react-native';`;
        }
        
        return match;
      });

      if (changed) {
        // Add import for our custom Text
        const importToAdd = "import { Text } from '@/src/components/ui/Text';\n";
        
        // Find the last import
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
          const endOfLastImport = content.indexOf(';', lastImportIndex);
          if (endOfLastImport !== -1) {
            content = content.slice(0, endOfLastImport + 1) + '\n' + importToAdd + content.slice(endOfLastImport + 1);
          } else {
             content = importToAdd + content;
          }
        } else {
          content = importToAdd + content;
        }

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', fullPath);
      }
    }
  }
}

for (const dir of directories) {
  processDirectory(dir);
}
