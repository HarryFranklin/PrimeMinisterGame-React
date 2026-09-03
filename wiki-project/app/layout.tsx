import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import Sidebar from "@/components/Sidebar";
import { getNavTree } from "@/lib/wiki";
import { TelemetryProvider } from "@/context/TelemetryContext";
import ParticipantSetupModal from "@/components/ParticipantSetupModal";
import { CompletionProvider } from "@/context/CompletionContext";
import ClearStateButton from "@/components/ClearStateButton"; // DEV_TOOLS — remove before shipping

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Utility Framework Wiki",
    template: "%s · Utility Framework Wiki",
  },
  description: "A reference guide exploring how governments measure and improve human wellbeing, and what utility frameworks offer compared to traditional methods.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nav = getNavTree();

    return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <TelemetryProvider>
          <CompletionProvider>
            <ThemeProvider>
              <ParticipantSetupModal />
              <ClearStateButton /> {/* DEV_TOOLS — remove before shipping */}
              <div className="flex md:min-h-screen">
                <Sidebar nav={nav} />
                <div className="flex-1 min-w-0">{children}</div>
              </div>
            </ThemeProvider>
          </CompletionProvider>
        </TelemetryProvider>
      </body>
    </html>
  );
}
