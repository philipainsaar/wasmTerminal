import "./globals.css";

export const metadata = {
  title: "Wasm Core Fast Panorama",
  description: "A safe WebAssembly, Next.js, and Three.js diagnostic overlay with a fast rotating panorama background.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Bytesized&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
