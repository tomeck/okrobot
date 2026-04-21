const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

let currentPdf = null;
let currentPath = null;
let zoomLevel = 1;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

const viewer = document.getElementById('pdfViewer');
const zoomLabel = document.getElementById('pdfZoomLevel');

// Drag-to-pan
let isDragging = false;
let dragStartX, dragStartY, scrollStartX, scrollStartY;

viewer.addEventListener('mousedown', function(e) {
  if (e.button !== 0) return;
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  scrollStartX = viewer.scrollLeft;
  scrollStartY = viewer.scrollTop;
  viewer.classList.add('dragging');
});

window.addEventListener('mousemove', function(e) {
  if (!isDragging) return;
  viewer.scrollLeft = scrollStartX - (e.clientX - dragStartX);
  viewer.scrollTop = scrollStartY - (e.clientY - dragStartY);
});

window.addEventListener('mouseup', function() {
  if (!isDragging) return;
  isDragging = false;
  viewer.classList.remove('dragging');
});

function updateZoomLabel() {
  zoomLabel.textContent = Math.round(zoomLevel * 100) + '%';
}

function fitScale(page) {
  return (viewer.clientWidth - 20) / page.getViewport({ scale: 1 }).width;
}

async function renderAtZoom() {
  if (!currentPdf) return;
  const scrollTop = viewer.scrollTop;
  const scrollRatio = viewer.scrollHeight > 0 ? scrollTop / viewer.scrollHeight : 0;
  viewer.innerHTML = '';

  const firstPage = await currentPdf.getPage(1);
  const baseScale = fitScale(firstPage);

  for (let i = 1; i <= currentPdf.numPages; i++) {
    const page = await currentPdf.getPage(i);
    const dpr = window.devicePixelRatio || 2;
    const effectiveScale = baseScale * zoomLevel;
    const viewport = page.getViewport({ scale: effectiveScale * dpr });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = (viewport.width / dpr) + 'px';
    canvas.style.height = (viewport.height / dpr) + 'px';
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto 10px';
    viewer.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  }

  viewer.scrollTop = scrollRatio * viewer.scrollHeight;
  updateZoomLabel();
}

async function loadPdf(pdfPath) {
  if (currentPath === pdfPath && currentPdf) {
    return;
  }
  viewer.innerHTML = '';
  currentPdf = null;
  currentPath = pdfPath;
  zoomLevel = 1;
  updateZoomLabel();
  currentPdf = await pdfjsLib.getDocument(pdfPath).promise;
  await renderAtZoom();
}

document.getElementById('pdfZoomIn').addEventListener('click', function() {
  if (zoomLevel < ZOOM_MAX) {
    zoomLevel = Math.min(ZOOM_MAX, +(zoomLevel + ZOOM_STEP).toFixed(2));
    renderAtZoom();
  }
});

document.getElementById('pdfZoomOut').addEventListener('click', function() {
  if (zoomLevel > ZOOM_MIN) {
    zoomLevel = Math.max(ZOOM_MIN, +(zoomLevel - ZOOM_STEP).toFixed(2));
    renderAtZoom();
  }
});

document.getElementById('pdfZoomFit').addEventListener('click', function() {
  zoomLevel = 1;
  renderAtZoom();
});

document.getElementById('pdfDownload').addEventListener('click', function() {
  if (!currentPath) return;
  var a = document.createElement('a');
  a.href = currentPath;
  a.download = currentPath.split('/').pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

window.openPdfModal = function(pdfPath) {
  document.getElementById('pdfModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  loadPdf(pdfPath);
};

window.closePdfModal = function() {
  document.getElementById('pdfModal').classList.remove('active');
  document.body.style.overflow = '';
};

document.addEventListener('keydown', function(e) {
  if (!document.getElementById('pdfModal').classList.contains('active')) return;
  if (e.key === 'Escape') closePdfModal();
  if ((e.key === '=' || e.key === '+') && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    document.getElementById('pdfZoomIn').click();
  }
  if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    document.getElementById('pdfZoomOut').click();
  }
  if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    document.getElementById('pdfZoomFit').click();
  }
});
