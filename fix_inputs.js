const fs = require('fs');
const path = require('path');

const files = [
  'src/components/RoleForms/ManufacturerForm.tsx',
  'src/components/RoleForms/DistributorForm.tsx',
  'src/components/RoleForms/HospitalForm.tsx',
  'src/components/RoleForms/PatientForm.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Move InputField outside
  const inputFieldRegex = /const InputField = \(\{ label, field, type = 'text'(?:, placeholder = '')? \}: any\) => \([\s\S]*?\n  \);\n/;
  const match = content.match(inputFieldRegex);
  if (match) {
    let inputFieldCode = match[0];
    content = content.replace(inputFieldRegex, '');

    // Add formData and setFormData to props
    inputFieldCode = inputFieldCode.replace(
      "({ label, field, type = 'text', placeholder = '' }: any)",
      "({ label, field, type = 'text', placeholder = '', formData, setFormData }: any)"
    ).replace(
      "({ label, field, type = 'text' }: any)",
      "({ label, field, type = 'text', formData, setFormData }: any)"
    );

    // Insert after imports
    const importEnd = content.lastIndexOf('import ');
    const nextNewline = content.indexOf('\n', importEnd);
    content = content.slice(0, nextNewline + 1) + '\n' + inputFieldCode + content.slice(nextNewline + 1);
  }

  // 2. Add formData={formData} setFormData={setFormData} to all <InputField ... />
  content = content.replace(/<InputField([^>]+)\/>/g, (match, p1) => {
    // avoid adding twice if we run it multiple times
    if (p1.includes('formData={formData}')) return match;
    return `<InputField${p1} formData={formData} setFormData={setFormData} />`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed', file);
});
