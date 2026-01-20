# Plan Highlighter Pro

A powerful web-based tool for creating animated video overlays from floor plans and images. Perfect for real estate presentations, architectural walkthroughs, and property showcases.

**[Live Demo](https://onelenyk.github.io/image2video-overlay/)**

## Features

### Overlay Elements
- **Rectangle** - Highlight zones with customizable labels, colors, and borders
- **Line** - Draw lines that can connect to other elements
- **Polygon/Polyline** - Create complex shapes with editable vertices
- **Point** - Add connection points for lines

### Drawing Tools
- **Freehand Drawing** - Draw natural curves and paths
- **Straight Line** - Create precise straight lines

### Components
- **SVG Images** - Import and position SVG graphics
- **PNG Images** - Add raster images with transparency

### Animations
- **Transform Animations** - Pulse, Bounce, Fade, Shake, Flash, Spin, Zoom, Float
- **Path Animations** - Train (one-way/loop), Marching Dash
- **Customizable Settings** - Duration, glow intensity, train length, colors

### Export
- **Video Recording** - Export as MP4 or WebM
- **PNG Screenshot** - Save current state as image
- **Configurable Quality** - Bitrate, frame rate, resolution

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- html2canvas + MediaRecorder API (video export)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Deployment

The app automatically deploys to GitHub Pages on push to `master` or `react-migration` branches.

## License

MIT
