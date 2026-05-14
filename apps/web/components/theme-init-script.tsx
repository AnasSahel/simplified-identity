import Script from "next/script";

// Inlines the no-flash theme detection script into the HTML response via
// `next/script` with `beforeInteractive` strategy. Next injects the script
// outside React's render tree, so React 19 / Next 16 does not emit the
// "Encountered a script tag while rendering React component" warning that
// a raw `<script dangerouslySetInnerHTML>` would.
//
// Must be mounted in the root layout (`app/layout.tsx`) for the
// `beforeInteractive` strategy to apply.

const STORAGE_KEY = "theme";

const SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;d?c.add("dark"):c.remove("dark");document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export function ThemeInitScript() {
  return (
    // The lint rule predates App Router; Next 16 docs explicitly require
    // `beforeInteractive` to be mounted from the root layout.
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
    <Script id="theme-init" strategy="beforeInteractive">
      {SCRIPT}
    </Script>
  );
}
