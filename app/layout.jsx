import "./globals.css";

export const metadata = {
  title: "Wasm Diagnostic Terminal",
  description: "A safe WebAssembly, Next.js, and Three.js diagnostic-style terminal.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
