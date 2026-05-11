const fs = require("fs");
const path = require("path");

const root = process.cwd();
const historyPath = path.join(root, "src", "app", "history", "page.tsx");
const backupPath = path.join(root, "src", "app", "history", "page.before-mobile-open-fix.tsx");

if (!fs.existsSync(historyPath)) {
  throw new Error("src/app/history/page.tsx wurde nicht gefunden.");
}

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(historyPath, backupPath);
}

let code = fs.readFileSync(historyPath, "utf8").replace(/\r\n/g, "\n");

code = code.replace(
  `import { useEffect, useState } from "react";`,
  `import { useEffect, useRef, useState } from "react";`
);

code = code.replace(
  `  const [statusMessage, setStatusMessage] = useState("");`,
  `  const [statusMessage, setStatusMessage] = useState("");
  const selectedDetailRef = useRef<HTMLDivElement | null>(null);`
);

const insertAfterCancelRename = `  function cancelRename() {
    setRenameEntryId(null);
    setRenameValue("");
  }`;

const openFunction = `  function handleOpenEntry(entry: SavedBriefingEntry) {
    setSelectedEntryId(entry.id);
    setStatusMessage("");

    window.setTimeout(() => {
      selectedDetailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }`;

if (!code.includes("function handleOpenEntry")) {
  code = code.replace(
    insertAfterCancelRename,
    `${insertAfterCancelRename}

${openFunction}`
  );
}

code = code.replace(
  `                                className="h-10 border-white/10"
                                onClick={() => setSelectedEntryId(entry.id)}`,
  `                                className="relative z-10 h-11 min-h-11 border-white/10 touch-manipulation"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleOpenEntry(entry);
                                }}`
);

code = code.replace(
  `              <div className="lg:col-span-8 min-w-0">`,
  `              <div ref={selectedDetailRef} className="lg:col-span-8 min-w-0 scroll-mt-24">`
);

fs.writeFileSync(historyPath, code, "utf8");

console.log("Mobiler Öffnen-Button im Archiv wurde repariert.");