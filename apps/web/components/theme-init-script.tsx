// Inlines the no-flash theme detection script into the HTML response
// without going through React's <script> JSX (which triggers the React 19
// / Next 16 warning "Encountered a script tag while rendering React
// component" — true for both raw <script> and next/script <Script>).
//
// Trick: wrap the script tag as a string inside `dangerouslySetInnerHTML`
// on a hidden <div>. React sees a <div> and never parses the inner HTML,
// so no warning is emitted. The browser's HTML parser does parse the
// inner content during the initial SSR response, and a script tag
// inserted via the parser executes synchronously at parse time. On client
// re-renders React re-sets innerHTML, but script tags inserted via the
// innerHTML DOM API do not re-execute (per HTML spec), so the script
// runs exactly once at SSR.
//
// Must be mounted as the first child of <body> in the root layout so it
// executes before any visible content paints.

const STORAGE_KEY = "theme";

const SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;d?c.add("dark"):c.remove("dark");document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export function ThemeInitScript() {
  return (
    <div
      hidden
      dangerouslySetInnerHTML={{
        __html: `<script>${SCRIPT}</script>`,
      }}
    />
  );
}
