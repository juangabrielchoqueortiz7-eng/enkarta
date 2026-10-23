'use strict';

// Run the read-only inspector through the authorized browser, then validate its
// saved JSON here. This catches rendered layout regressions rather than matching
// CSS source strings. Expected boxes come from the Paradise reference evidence.
function inspectParadiseVisual() {
  const box = element => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return { width: r.width, height: r.height, left: r.left, top: r.top + scrollY };
  };
  const section = name => document.querySelector('[data-paradise-section="' + name + '"]');
  const icon = name => section(name)?.querySelector('[data-paradise-original-icon]');
  const gallery = section('countdown')?.querySelector('[data-paradise-carousel]');
  const control = gallery?.querySelector('button[aria-label^="Reanudar"],button[aria-label^="Pausar"]');
  const r = control?.getBoundingClientRect();
  const controlVisible = !!r && r.top >= 0 && r.bottom <= innerHeight;
  const hitPoints = controlVisible ? [[.5,.5],[.25,.25],[.75,.25],[.25,.75],[.75,.75]].map(([x,y]) => {
    const hit = document.elementFromPoint(r.left + r.width*x, r.top + r.height*y);
    return hit === control || control.contains(hit);
  }) : [];
  return {
    viewport: { width: innerWidth, height: innerHeight },
    overflow: document.documentElement.scrollWidth > innerWidth,
    intro: box(section('intro')?.querySelector(':scope > p')),
    gallery: box(gallery), camera: box(icon('photos')), adults: box(icon('adults')),
    cameraDrawing: box(icon('photos')?.querySelector('svg')),
    adultsDrawing: box(icon('adults')?.querySelector('svg')),
    control: { box: box(control), visible: controlVisible, hitPoints,
      minHeight: control ? getComputedStyle(control).minHeight : null },
    originalsUnavailable: document.querySelectorAll('[data-paradise-original-icon-state="unavailable"]').length,
    music: [...document.querySelectorAll('audio')].map(e => ({ src: e.getAttribute('src'), autoplay: e.autoplay })),
  };
}

function verifyParadiseVisual(report) {
  const assert = require('node:assert/strict');
  const close = (value, expected, label) => assert(Math.abs(value - expected) < 1, label + ': ' + value + ' != ' + expected);
  assert([390,1440].includes(report.viewport.width), 'Use the documented comparison widths');
  const mobile = report.viewport.width === 390;
  assert(!report.overflow, 'Horizontal overflow');
  close(report.intro.width, mobile ? 300 : 500, 'Intro line measure');
  close(report.gallery.width, mobile ? 350 : 500, 'Original gallery width');
  close(report.gallery.height, mobile ? 510 : report.viewport.height * .7145, 'Original gallery height');
  close(report.camera.width, 103, 'Camera width'); close(report.camera.height, 70.5, 'Loaded camera flow box');
  close(report.adults.width, mobile ? 65 : 100, 'Adults width'); close(report.adults.height, mobile ? 73 : 108, 'Adults flow box');
  if (report.cameraDrawing) close(report.cameraDrawing.height, 103 * 200 / 330, 'Original camera drawing ratio');
  if (report.adultsDrawing) close(report.adultsDrawing.width, mobile ? 81 : 116, 'Original adults drawing size');
  assert.equal(report.originalsUnavailable, 0, 'An original failed to load');
  assert.equal(report.control.minHeight, '44px');
  if (report.control.visible) assert(report.control.hitPoints.length === 5 && report.control.hitPoints.every(Boolean), 'Gallery control clipped');
  assert.equal(report.music.length, 1); assert.equal(report.music[0].autoplay, false);
  assert.equal(report.music[0].src, '/audio/invitali-originales/2025-05-Ed-Sheran-Perfect-Violin.mp3');
  return { width: report.viewport.width, passed: true, loadedDrawings: !!report.cameraDrawing && !!report.adultsDrawing, controlChecked: report.control.visible };
}

module.exports = { inspectParadiseVisual, verifyParadiseVisual };
if (require.main === module) {
  const fs = require('node:fs');
  const files = process.argv.slice(2);
  if (!files.length) throw new Error('Pass JSON reports captured by inspectParadiseVisual in the browser.');
  for (const file of files) console.log(JSON.stringify(verifyParadiseVisual(JSON.parse(fs.readFileSync(file, 'utf8')))));
}
