# Plan Highlighter Pro - Video Asset Creator

A web-based tool for creating animated video assets from floor plans. Add highlight boxes, arrows, labels, and animations to your plans, then export as images or videos.

## Features

- **Label Customization**: Add text labels with adjustable font size
- **Visual Styling**: Customize box color, opacity, border thickness
- **Size & Position**: Full control over dimensions and placement
- **Arrow Manager**: Add multiple arrow types (simple, diagonal, curved, double-headed)
- **Animations**: 8 animation types (pulse, bounce, fade, shake, flash, spin, zoom, float)
- **Export Options**:
  - Record video with custom animations
  - Auto-capture single animation loop
  - Export as PNG image
- **Drag & Drop**: Interactive canvas with draggable elements

## Usage

1. Open `index.html` in your web browser (double-click or drag into browser)
2. Click "Upload Plan Image" to load your floor plan
3. Customize the highlight box using the controls panel
4. Add arrows and apply animations as needed
5. Export your creation as a PNG or record a video

## Technical Details

- Single HTML file with embedded CSS and JavaScript
- Uses Tailwind CSS (via CDN) for styling
- html2canvas for PNG export
- MediaRecorder API for video recording
- Optimized for 9:16 aspect ratio (vertical video)

## Hosting

This is a static HTML file and can be hosted on:
- Netlify (drag-and-drop)
- Vercel
- GitHub Pages
- Any static file hosting service
