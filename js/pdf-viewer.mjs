const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

let currentPdf = null;
let currentPath = null;
let zoomLevel = 1;
let renderGen = 0;
const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const SMALL_THRESHOLD = 5;

const viewer = document.getElementById('pdfViewer');
const zoomLabel = document.getElementById('pdfZoomLevel');

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

function showSpinner() {
  if (viewer.querySelector('.pdf-spinner')) return;
  var spinner = document.createElement('div');
  spinner.className = 'pdf-spinner';
  spinner.innerHTML = '<div class="pdf-spinner-ring"></div><div class="pdf-spinner-label">Loading pages…</div>';
  viewer.appendChild(spinner);
}

function hideSpinner() {
  var spinner = viewer.querySelector('.pdf-spinner');
  if (spinner) spinner.remove();
}

function collectBlobUrls() {
  var urls = [];
  viewer.querySelectorAll('img[data-blob]').forEach(function(img) {
    urls.push(img.src);
  });
  return urls;
}

function revokeUrls(urls) {
  urls.forEach(function(u) { URL.revokeObjectURL(u); });
}

async function renderPageToImg(slot, gen) {
  var pageNum = parseInt(slot.dataset.pageNum);
  var scale = parseFloat(slot.dataset.scale);
  var page = await currentPdf.getPage(pageNum);
  if (gen !== renderGen) return;

  var viewport = page.getViewport({ scale: scale * DPR });
  var canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  if (gen !== renderGen) return;

  var blob = await new Promise(function(resolve) { canvas.toBlob(resolve); });
  if (gen !== renderGen) return;

  var url = URL.createObjectURL(blob);
  var img = new Image();
  img.style.width = (viewport.width / DPR) + 'px';
  img.style.height = (viewport.height / DPR) + 'px';
  img.style.display = 'block';
  img.draggable = false;
  img.dataset.blob = '1';
  img.decoding = 'async';
  img.src = url;

  slot.innerHTML = '';
  slot.appendChild(img);
  canvas.width = 0;
  canvas.height = 0;
}

async function renderAtZoom() {
  if (!currentPdf) return;
  var gen = ++renderGen;
  var numPages = currentPdf.numPages;
  var scrollRatio = viewer.scrollHeight > 0 ? viewer.scrollTop / viewer.scrollHeight : 0;

  var oldUrls = collectBlobUrls();
  viewer.innerHTML = '';
  revokeUrls(oldUrls);

  var firstPage = await currentPdf.getPage(1);
  if (gen !== renderGen) return;
  var baseScale = fitScale(firstPage);
  var effectiveScale = baseScale * zoomLevel;

  var slots = [];
  for (var i = 1; i <= numPages; i++) {
    var page = await currentPdf.getPage(i);
    if (gen !== renderGen) return;
    var vp = page.getViewport({ scale: effectiveScale });
    var slot = document.createElement('div');
    slot.className = 'pdf-page-slot';
    slot.style.width = vp.width + 'px';
    slot.style.height = vp.height + 'px';
    slot.dataset.pageNum = i;
    slot.dataset.scale = effectiveScale;
    viewer.appendChild(slot);
    slots.push(slot);
  }

  if (numPages > SMALL_THRESHOLD) showSpinner();
  for (var i = 0; i < slots.length; i++) {
    if (gen !== renderGen) return;
    await renderPageToImg(slots[i], gen);
  }
  if (gen !== renderGen) return;
  hideSpinner();

  viewer.scrollTop = scrollRatio * viewer.scrollHeight;
  updateZoomLabel();
}

async function loadPdf(pdfPath) {
  if (currentPath === pdfPath && currentPdf) return;
  var oldUrls = collectBlobUrls();
  viewer.innerHTML = '';
  revokeUrls(oldUrls);
  currentPdf = null;
  currentPath = pdfPath;
  zoomLevel = 1;
  updateZoomLabel();
  showSpinner();
  currentPdf = await pdfjsLib.getDocument(pdfPath).promise;
  hideSpinner();
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
  var oldUrls = collectBlobUrls();
  viewer.innerHTML = '';
  revokeUrls(oldUrls);
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
