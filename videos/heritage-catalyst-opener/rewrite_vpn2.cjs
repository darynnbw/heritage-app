const fs = require('fs');
let content = fs.readFileSync('compositions/vpn-youtube-spot.html', 'utf-8');

// 1. Fonts
content = content.replace(
  /font-family:\s*-apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, "Helvetica Neue", Arial,\s*sans-serif;/g,
  'font-family: var(--body-font, "Helvetica Neue", Helvetica, Arial, sans-serif);'
);

// We need to add --display-font to specific classes. We can do this by adding it to their CSS rules.
// .headline span, .ambient-word, .store-title, .detail-title
content = content.replace(/\.headline span \{/, '.headline span {\n        font-family: var(--display-font, "Georgia", serif);\n        text-transform: none;');
content = content.replace(/\.ambient-word \{/, '.ambient-word {\n        font-family: var(--display-font, "Georgia", serif);\n        text-transform: none;');
content = content.replace(/\.store-title \{/, '.store-title {\n        font-family: var(--display-font, "Georgia", serif);');
content = content.replace(/\.detail-title \{/, '.detail-title {\n        font-family: var(--display-font, "Georgia", serif);');

// 2. Un-uppercase texts
content = content.replace(/>HERITAGE</g, '>Heritage<');
content = content.replace(/>YOUR</g, '>your<');
content = content.replace(/>APP</g, '>app<');
content = content.replace(/>GET</g, '>Get<');
content = content.replace(/>RATING</g, '>Rating<');
content = content.replace(/>SPEED</g, '>Category<');
content = content.replace(/>AGE</g, '>Age<');
content = content.replace(/>Fast</g, '>Family<');

// GSAP texts
content = content.replace(/textContent: "OPEN"/g, 'textContent: "Open"');

// 3. Background colors 
// The root background is currently: radial-gradient(circle at 20% 16%, rgba(0, 122, 255, 0.13), transparent 24%), radial-gradient(circle at 82% 22%, rgba(52, 199, 89, 0.14), transparent 22%), linear-gradient(180deg, #ffffff 0%, #f5f5f7 100%);
// Let's change it to match Heritage cozy vibe:
content = content.replace(
  /radial-gradient\(circle at 20% 16%, rgba\(0, 122, 255, 0\.13\), transparent 24%\),\s*radial-gradient\(circle at 82% 22%, rgba\(52, 199, 89, 0\.14\), transparent 22%\),\s*linear-gradient\(180deg, #ffffff 0%, #f5f5f7 100%\)/g,
  'radial-gradient(circle at 20% 16%, rgba(15, 118, 110, 0.08), transparent 30%), radial-gradient(circle at 82% 22%, rgba(15, 23, 42, 0.08), transparent 30%), linear-gradient(180deg, var(--paper, #ffffff) 0%, var(--canvas, #f8fafc) 100%)'
);

fs.writeFileSync('compositions/vpn-youtube-spot.html', content);
console.log("Fixed typography and styling in vpn-youtube-spot.html");
