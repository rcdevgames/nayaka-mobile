import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { BASE_URL } from '../api';

interface MjpegViewProps {
  url: string;
  accessToken?: string;
}

// Prepend BASE_URL jika url relatif (misal "/api/v1/mobile/stream/{id}")
const resolveUrl = (url: string) =>
  url?.startsWith('http') ? url : `${BASE_URL}${url}`;

// Escape untuk JavaScript string literal (di dalam backticks)
const escapeJS = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

// Inject loading state ke WebView via postMessage
const html = (url: string, accessToken?: string) => {
  const fullUrl = resolveUrl(url);
  const token = escapeJS(accessToken ?? '');
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <style>
    html, body { margin: 0; padding: 0; background: #000; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    #frame { max-width: 100%; max-height: 100%; object-fit: contain; }
    #log { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.85); color: #0f0; font-family: monospace; font-size: 11px; padding: 6px; max-height: 120px; overflow-y: auto; z-index: 9999; }
    #log div { margin: 2px 0; }
    #log .err { color: #f66; }
    #log .ok { color: #6f6; }
  </style>
</head>
<body>
  <div id="log"></div>
  <img id="frame" alt="live" />
  <script>
    (function() {
      var logEl = document.getElementById('log');
      var streamUrl = "${escapeJS(fullUrl)}";
      var accessToken = "${token}";
      var img = document.getElementById('frame');
      var xhr = null;
      var buffer = '';
      var boundary = null;
      var frameCount = 0;
      var startTime = Date.now();
      
      function log(msg, type) {
        type = type || 'info';
        var t = ((Date.now() - startTime) / 1000).toFixed(1);
        var line = '<div class="' + type + '">[' + t + 's] ' + msg + '</div>';
        logEl.innerHTML += line;
        logEl.scrollTop = logEl.scrollHeight;
        console.warn('[stream:' + t + 's] ' + msg);
      }
      
      function onFrameReady(blob) {
        var url = URL.createObjectURL(blob);
        img.src = url;
        frameCount++;
        if (frameCount === 1) {
          log('Frame #1 received! Stream aktif.', 'ok');
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type: 'load'}));
        } else if (frameCount % 10 === 0) {
          log('Frame #' + frameCount + ' received.', 'info');
        }
      }
      
      function parseFrame(text) {
        var idx = text.indexOf('\\r\\n\\r\\n');
        if (idx === -1) return null;
        var header = text.substring(0, idx);
        var content = text.substring(idx + 4);
        var match = header.match(/Content-Length:\\s*(\\d+)/);
        if (!match) return null;
        var len = parseInt(match[1], 10);
        if (content.length < len) return null;
        var jpeg = content.substring(0, len);
        return { jpeg: jpeg, rest: content.substring(len) };
      }
      
      function processBuffer() {
        if (!boundary || buffer.length < 50) return;
        var parts = buffer.split('--' + boundary);
        for (var i = 1; i < parts.length; i++) {
          var result = parseFrame(parts[i]);
          if (result) {
            try {
              var jpegData = atob(result.jpeg.trim());
              var len = jpegData.length;
              var buf = new Uint8Array(len);
              for (var j = 0; j < len; j++) buf[j] = jpegData.charCodeAt(j);
              var blob = new Blob([buf], {type: 'image/jpeg'});
              onFrameReady(blob);
            } catch(e) {
              log('Decode error: ' + e.message, 'err');
            }
            buffer = result.rest;
          }
        }
      }
      
      function startStream() {
        log('=== STREAM DEBUG ===');
        log('URL: ' + streamUrl);
        log('Token: ' + (accessToken ? accessToken.substring(0, 20) + '...' : 'EMPTY'), 'err');
        
        xhr = new XMLHttpRequest();
        xhr.open('GET', streamUrl, true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
        xhr.setRequestHeader('Accept', 'multipart/x-mixed-replace');
        
        xhr.onload = function() {
          log('XHR onload, status: ' + xhr.status, xhr.status === 200 ? 'ok' : 'err');
          if (xhr.status !== 200) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', status: xhr.status}));
          }
        };
        
        xhr.onerror = function() {
          log('XHR onerror - network error', 'err');
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', status: 0}));
        };
        
        xhr.ontimeout = function() {
          log('XHR timeout', 'err');
        };
        
        xhr.onprogress = function(e) {
          if (e.lengthComputable) {
            var oldLen = buffer.length;
            buffer += xhr.responseText.substring(oldLen);
            var delta = buffer.length - oldLen;
            
            if (!boundary) {
              var bi = buffer.indexOf('boundary=');
              if (bi !== -1) {
                boundary = buffer.substring(bi + 9).split('\\r\\n')[0].replace(/"/g, '');
                log('Boundary found: ' + boundary, 'ok');
              }
            }
            
            if (frameCount === 0) {
              log('Receiving data... buffer: ' + buffer.length + ' bytes');
            }
            
            processBuffer();
          }
        };
        
        log('Opening XHR connection...');
        xhr.send(null);
        log('XHR sent, waiting for response...');
        
        // Timeout fallback
        setTimeout(function() {
          if (frameCount === 0) {
            log('No frames after 10s. Buffer size: ' + buffer.length, 'err');
            log('Buffer preview: ' + buffer.substring(0, 200));
          }
        }, 10000);
      }
      
      if (!streamUrl || streamUrl === 'null' || streamUrl === 'undefined') {
        log('URL EMPTY - cannot start stream', 'err');
        return;
      }
      
      startStream();
      
      window.onunload = function() {
        if (xhr) {
          log('Unloading, aborting XHR');
          xhr.abort();
        }
      };
    })();
  </script>
</body>
</html>
`;
};

type MjpegViewState = 'loading' | 'streaming' | 'error';

// Component-level instance counter untuk force-remount
let streamInstanceCounter = 0;

export function MjpegView({ url, accessToken }: MjpegViewProps) {
  const [state, setState] = useState<MjpegViewState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  // Key unik per mount — ubah ini untuk force-remount (stop + restart stream)
  const [streamKey] = useState(() => ++streamInstanceCounter);
  const mountedRef = useRef(true);

  // Cleanup saat unmount: WebView unmount → window.onunload → XHR abort
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleMessage = (e: { nativeEvent: { data: string } }) => {
    if (!mountedRef.current) return;
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'load') setState('streaming');
      if (msg.type === 'error') {
        setState('error');
        setErrorMsg(msg.status === 0 ? 'Network error' : `HTTP ${msg.status}`);
      }
      if (msg.type === 'log') console.warn('[stream]', msg.msg);
    } catch {}
  };

  return (
    <View style={styles.container}>
      <WebView
        key={`mjpeg-${streamKey}`}
        source={{ html: html(url, accessToken), baseUrl: 'http://localhost' }}
        style={styles.webview}
        originWhitelist={['*']}
        mixedContentMode="always"
        javaScriptEnabled={true}
        domStorageEnabled={false}
        onMessage={handleMessage}
        onError={e => {
          if (!mountedRef.current) return;
          console.warn('[stream] WebView error:', e.nativeEvent.description);
          setState('error');
          setErrorMsg(e.nativeEvent.description);
        }}
        onHttpError={e => {
          if (!mountedRef.current) return;
          console.warn('[stream] HTTP error:', e.nativeEvent.statusCode);
          setState('error');
          setErrorMsg(`HTTP ${e.nativeEvent.statusCode}`);
        }}
      />
      {state === 'loading' && (
        <View style={styles.overlay}>
          <Text style={styles.statusText}>Memuat stream...</Text>
        </View>
      )}
      {state === 'error' && (
        <View style={styles.overlay}>
          <Text style={styles.statusText}>Gagal: {errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  webview: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
});

export default MjpegView;
