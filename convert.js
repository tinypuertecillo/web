const fs = require('fs');

let html = fs.readFileSync('stitch_full.html', 'utf-8');

// Extract everything inside body
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
let content = bodyMatch ? bodyMatch[1] : html;

// Fix attribute names
content = content.replace(/class="/g, 'className="');
content = content.replace(/for="/g, 'htmlFor="');

// Fix inline styles
content = content.replace(/style="font-variation-settings:[^"]*"/g, `style={{ fontVariationSettings: "'FILL' 1" }}`);

// Fix void elements closing (img, input, br, hr)
content = content.replace(/<(img|input|br|hr)([^>]*?)(?<!\/)>/g, '<$1$2 />');

// Convert HTML comments to JSX comments
content = content.replace(/<!--(.*?)-->/g, '{/* $1 */}');

const reactCode = `import React from 'react';

export default function Home() {
  return (
    <div className="bg-surface text-on-surface font-sans selection:bg-secondary-fixed selection:text-on-secondary-fixed">
      ${content}
    </div>
  );
}
`;

fs.writeFileSync('src/app/page.tsx', reactCode);
console.log('Conversion successful. Wrote to page.tsx');
