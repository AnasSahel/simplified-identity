// Server component: renders an inline script in <head> that resolves the
// effective theme (light/dark/system) from localStorage and applies the
// `dark` class on <html> before React hydrates. Prevents FOUC.
//
// Rendered from a server component (no "use client") so React 19 does not
// emit the "Encountered a script tag while rendering React component"
// warning that next-themes triggers in v0.4.6.

const STORAGE_KEY = "theme";

const SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;d?c.add("dark"):c.remove("dark");document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
