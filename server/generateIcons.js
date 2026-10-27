const fs = require('fs');
const path = require('path');

const iconDir = path.join(__dirname, '..', 'public', 'assets', 'images', 'icons');
fs.mkdirSync(iconDir, { recursive: true });

const heartSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges">
  <path fill="#e74c3c" d="M2 3h3v1H2zM9 3h3v1H9zM1 4h5v1H1zM8 4h5v1H8zM1 5h12v1H1zM1 6h12v1H1zM1 7h12v1H1zM2 8h10v1H2zM3 9h8v1H3zM4 10h6v1H4zM5 11h4v1H5zM6 12h2v1H6z"/>
  <path fill="#ffffff" d="M3 4h2v1H3zM2 5h2v1H2z"/>
</svg>`;

const bulbSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges">
  <path fill="#f1c40f" d="M5 2h6v1H5zM4 3h8v1H4zM3 4h10v4H3zM4 8h8v1H4zM5 9h6v1H5z"/>
  <path fill="#bdc3c7" d="M5 10h6v1H5zM5 11h6v1H5zM6 12h4v1H6z"/>
  <path fill="#ffffff" d="M5 4h2v2H5z"/>
</svg>`;

const skullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges">
  <path fill="#ecf0f1" d="M4 2h8v1H4zM3 3h10v1H3zM2 4h12v6H2zM4 10h8v1H4zM5 11h6v2H5z"/>
  <path fill="#2c3e50" d="M4 6h2v3H4zM10 6h2v3H10zM7 9h2v1H7zM6 12h1v1H6zM9 12h1v1H9z"/>
</svg>`;

const crownSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="48" height="48" shape-rendering="crispEdges">
  <path fill="#f1c40f" d="M2 4h2v2H2zM7 2h2v2H7zM12 4h2v2h-2zM3 6h10v1H3zM2 7h12v4H2zM2 11h12v2H2z"/>
  <path fill="#e67e22" d="M2 12h12v1H2z"/>
  <path fill="#e74c3c" d="M4 8h2v2H4zM10 8h2v2h-2zM7 9h2v2H7z"/>
  <path fill="#ffffff" d="M3 5h1v1H3zM8 3h1v1H8zM13 5h1v1H13z"/>
</svg>`;

fs.writeFileSync(path.join(iconDir, 'heart.svg'), heartSvg);
fs.writeFileSync(path.join(iconDir, 'bulb.svg'), bulbSvg);
fs.writeFileSync(path.join(iconDir, 'skull.svg'), skullSvg);
fs.writeFileSync(path.join(iconDir, 'crown.svg'), crownSvg);

console.log('Icons generated successfully.');
