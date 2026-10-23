import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fall Fest Tickets',
  description: 'Real-time ticket tracker for Fall Fest booths',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
