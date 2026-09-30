/**
 * Sumber JS untuk membaca frame dari stream multipart/x-mixed-replace.
 *
 * Ditulis sebagai string, bukan modul biasa, karena kodenya harus jalan di
 * dalam WebView — bukan di runtime React Native. Dipakai dua tempat:
 * `MjpegView` (memutar stream) dan `CameraThumbnail` (mengambil satu frame).
 */
export const MJPEG_FRAME_READER = `
function asciiBytes(value) {
  var bytes = new Uint8Array(value.length);
  for (var i = 0; i < value.length; i++) bytes[i] = value.charCodeAt(i) & 0xff;
  return bytes;
}

function concatBytes(a, b) {
  var out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function findBytes(source, needle, from) {
  for (var i = from || 0; i <= source.length - needle.length; i++) {
    var found = true;
    for (var j = 0; j < needle.length; j++) {
      if (source[i + j] !== needle[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}

function bytesToDataUrl(bytes) {
  var binary = '';
  for (var i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  return 'data:image/jpeg;base64,' + btoa(binary);
}

// Pemotong frame MJPEG. Boundary datang dari Content-Type, panjang tiap bagian
// dari Content-Length. Sisa byte yang belum lengkap disimpan untuk push berikut.
var MjpegFrames = {
  boundary: null,
  buffer: new Uint8Array(0),

  setContentType: function (contentType) {
    var match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
    this.boundary = match ? (match[1] || match[2]).trim() : null;
    return !!this.boundary;
  },

  reset: function () {
    this.buffer = new Uint8Array(0);
  },

  push: function (chunk, onFrame) {
    if (!this.boundary) return;
    this.buffer = concatBytes(this.buffer, chunk);
    var marker = asciiBytes('--' + this.boundary);
    var headerEndMarker = new Uint8Array([13, 10, 13, 10]);

    while (true) {
      var start = findBytes(this.buffer, marker, 0);
      if (start === -1) return;
      var headerStart = start + marker.length;
      var headerEnd = findBytes(this.buffer, headerEndMarker, headerStart);
      if (headerEnd === -1) return;

      var header = '';
      for (var i = headerStart; i < headerEnd; i++) {
        header += String.fromCharCode(this.buffer[i]);
      }

      var match = /Content-Length:\\s*(\\d+)/i.exec(header);
      if (!match) {
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }

      var length = parseInt(match[1], 10);
      var frameStart = headerEnd + 4;
      if (this.buffer.length < frameStart + length) return;

      onFrame(this.buffer.slice(frameStart, frameStart + length));
      this.buffer = this.buffer.slice(frameStart + length);
    }
  }
};
`;

/**
 * Halaman WebView untuk mengambil frame pertama dari stream, sekali, lalu
 * berhenti. Tanpa <img> dan tanpa canvas: byte JPEG-nya dibaca langsung supaya
 * tidak bergantung pada aturan taint canvas di dokumen ber-origin opaque.
 *
 * Hasilnya dikirim ke React Native sebagai data URL siap pakai untuk <Image>.
 */
export const mjpegCaptureHtml = (url: string) => {
  const stream = JSON.stringify(url).replace(/</g, '\\u003c');
  return `
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body>
  <script>
    (function () {
      var STREAM = ${stream};
      var CAPTURE_TIMEOUT_MS = 12000;

      var settled = false;
      var reader = null;
      var timer = setTimeout(function () { fail('Tidak ada frame dalam 12 detik'); }, CAPTURE_TIMEOUT_MS);

      ${MJPEG_FRAME_READER}

      function post(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function fail(message) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        console.warn('[thumb]', message);
        post({ type: 'error', message: message });
      }

      function done(frame) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        post({ type: 'frame', data: bytesToDataUrl(frame) });
        if (reader) {
          try { reader.cancel(); } catch (e) {}
        }
      }

      if (!STREAM || STREAM === 'null' || STREAM === 'undefined') {
        fail('URL stream kosong');
        return;
      }

      window.onerror = function (message) { fail('Error di WebView: ' + message); };

      fetch(STREAM + (STREAM.indexOf('?') === -1 ? '?' : '&') + '_=' + Date.now(), {
        cache: 'no-store',
        headers: { Accept: 'multipart/x-mixed-replace' }
      })
        .then(function (response) {
          if (!response.ok || !response.body) {
            fail('HTTP ' + response.status);
            return;
          }
          if (!MjpegFrames.setContentType(response.headers.get('content-type'))) {
            fail('Boundary tidak ditemukan');
            return;
          }
          reader = response.body.getReader();
          var pump = function () {
            reader.read().then(
              function (part) {
                if (settled) return;
                if (part.done) {
                  fail('Stream berakhir sebelum ada frame');
                  return;
                }
                MjpegFrames.push(part.value, done);
                if (!settled) pump();
              },
              function (e) { fail('Stream terputus: ' + (e && e.message ? e.message : e)); }
            );
          };
          pump();
        })
        .catch(function (e) { fail(e && e.message ? e.message : String(e)); });
    })();
  </script>
</body>
</html>
`;
};