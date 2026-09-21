import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface MjpegViewProps {
  url: string;
}

// stream_url dikirim apa adanya dari kolom DB, jadi tidak bisa dipercaya sudah
// bersih: tanda kutip atau kurung sudut di dalamnya akan merusak markup di bawah.
const escapeAttr = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const html = (url: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <style>
    html, body { margin: 0; padding: 0; background: #000; width: 100%; height: 100%; }
    .frame {
      width: 100vw;
      height: 100vh;
      object-fit: contain;
      background: #000;
    }
  </style>
</head>
<body>
  <img class="frame" src="${escapeAttr(url)}" alt="live" />
</body>
</html>
`;

// Tanpa startInLoadingState/renderLoading: halaman HTML menunggu subresource
// sebelum fire onLoad, dan stream MJPEG tidak pernah selesai, jadi spinner bisa
// mengunci layar hitam selamanya. Container sudah menyediakan latar hitam.
export function MjpegView({ url }: MjpegViewProps) {
  return (
    <View style={styles.container}>
      <WebView
        source={{ html: html(url) }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled={false}
        domStorageEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Lebar/tinggi eksplisit: induknya memakai alignItems: 'center', sehingga
  // flex saja membuat WebView menyusut ke lebar konten (nol).
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  webview: { flex: 1, backgroundColor: '#000' },
});

export default MjpegView;
