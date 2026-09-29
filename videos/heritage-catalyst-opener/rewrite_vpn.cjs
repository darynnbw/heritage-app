const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "compositions", "vpn-youtube-spot.html");
let content = fs.readFileSync(filePath, "utf-8");

// 1. Colors
// Blue #007aff -> #0f766e (Teal / Accent)
content = content.replace(/#007aff/gi, "#0f766e");
// Green #34c759 -> #0f172a (Ink / Dark slate)
content = content.replace(/#34c759/gi, "#0f172a");

// 2. Texts
content = content.replace(/>PRIVATE</g, ">HERITAGE<");
content = content.replace(/>SIMPLY</g, ' class="blue">YOUR<');
content = content.replace(/A calmer way to browse\./g, "Read, listen, and hold onto the moments that matter.");
content = content.replace(/>SAFE</g, ">APP<");

content = content.replace(/>privacy apps</g, ">memory apps<");

content = content.replace(/>VPN</g, ">Heritage<");
content = content.replace(/>Simple private browsing</g, ">Preserve your family history<");
content = content.replace(/>Friendly privacy for everyday browsing\.</g, ">Read, listen, and preserve the moments that matter.<");
content = content.replace(/>Ready to browse</g, ">Ready to relive memories<");

// 3. Icon
// Icon for VPN uses a polygon (shield) shape. We can leave it or just let it be a teal square with an H.
content = content.replace(/clip-path: polygon[^;]+;/g, 'content: "H"; font-family: "Georgia", serif; font-size: 28px; display: grid; place-items: center; color: #0f766e;');
content = content.replace(/\.icon-vpn::after \{[\s\S]*?\}/g, ""); // remove the dot

fs.writeFileSync(filePath, content, "utf-8");
console.log("Updated vpn-youtube-spot.html");
