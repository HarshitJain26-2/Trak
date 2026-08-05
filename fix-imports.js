const fs = require('fs');
const path = require('path');

const directories = ['app', 'components', 'store', 'services', 'utils'];

const aliasMap = {
  'supabase': '@/services/supabase',
  'storage': '@/services/storage',
  'notifications': '@/services/notifications',
  'deviceUser': '@/utils/deviceUser',
  'haptics': '@/utils/haptics',
  'deadlineValidator': '@/utils/deadlineValidator',
  'i18n': '@/utils/i18n'
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace lib imports
  content = content.replace(/from\s+['"](?:\.\.\/|\.\/|\.\.\/\.\.\/)+lib\/([^'"]+)['"]/g, (match, moduleName) => {
    if (aliasMap[moduleName]) {
      return `from '${aliasMap[moduleName]}'`;
    }
    return match;
  });

  // Replace constants imports
  content = content.replace(/from\s+['"](?:\.\.\/|\.\/|\.\.\/\.\.\/)+constants\/([^'"]+)['"]/g, "from '@/constants/$1'");
  
  // Replace store imports
  content = content.replace(/from\s+['"](?:\.\.\/|\.\/|\.\.\/\.\.\/)+store\/([^'"]+)['"]/g, "from '@/store/$1'");
  
  // Replace component imports for components directly under components/
  // This is a bit tricky, but let's try our best. Or we can just use @/components/
  content = content.replace(/from\s+['"](?:\.\.\/|\.\/|\.\.\/\.\.\/)+components\/([^'"]+)['"]/g, "from '@/components/$1'");
  
  // Fix nested components imports like in app/new-project.tsx which had: import ReminderConfigModal from '../components/ReminderConfigModal'
  // Remember we moved components to common, modals, project!
  // So we need to update these specific component paths.
  
  // Components moved to common:
  const commonComponents = ['ActionSheet', 'AestheticCheckbox', 'ConfirmDialog', 'EmptyState', 'MemberAvatar', 'StatusDot', 'TechPill'];
  // Components moved to modals:
  const modalComponents = ['InviteCodeModal', 'JoinProjectModal', 'ProjectActionModal', 'ReminderConfigModal'];
  // Components moved to project:
  const projectComponents = ['CountdownTimer', 'ProjectCard'];
  
  const allComponents = {
    ...Object.fromEntries(commonComponents.map(c => [c, `@/components/common/${c}`])),
    ...Object.fromEntries(modalComponents.map(c => [c, `@/components/modals/${c}`])),
    ...Object.fromEntries(projectComponents.map(c => [c, `@/components/project/${c}`]))
  };
  
  // Replace direct sibling or parent component imports
  // e.g., from './ConfirmDialog', from '../ConfirmDialog', from '@/components/ConfirmDialog'
  content = content.replace(/from\s+['"]([^'"]+)['"]/g, (match, importPath) => {
    // If it's not a relative path or alias we are touching, skip
    
    // Extract just the filename to check against our moved components
    const parts = importPath.split('/');
    const componentName = parts[parts.length - 1];
    
    // If the path was already partially resolved to @/components/X but needs to be @/components/common/X
    if (importPath.startsWith('@/components/') && allComponents[componentName]) {
      return `from '${allComponents[componentName]}'`;
    }
    
    // If it's a relative path like './StatusDot' or '../components/ReminderConfigModal'
    if (importPath.startsWith('.')) {
      if (allComponents[componentName]) {
        return `from '${allComponents[componentName]}'`;
      }
    }
    
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

directories.forEach(dir => processDirectory(dir));
console.log('Done.');
