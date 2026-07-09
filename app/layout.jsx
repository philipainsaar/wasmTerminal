import "./globals.css";

export const metadata = {
  title: "Wasm Machine Core V2",
  description: "A safe WebAssembly, Next.js, and Three.js multi-column glitch diagnostic overlay.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik+Glitch+Pop&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
