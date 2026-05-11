const fs = require("fs");
const path = require("path");

const root = process.cwd();

const displayPath = path.join(root, "src", "components", "BriefingDisplay.tsx");
const backupPath = path.join(root, "src", "components", "BriefingDisplay.before-trust-index.tsx");
const componentPath = path.join(root, "src", "components", "TrustIndexInfoButton.tsx");

if (!fs.existsSync(backupPath)) {
  throw new Error("Backup-Datei BriefingDisplay.before-trust-index.tsx wurde nicht gefunden.");
}

if (!fs.existsSync(componentPath)) {
  throw new Error("TrustIndexInfoButton.tsx wurde nicht gefunden. Bitte vorheriges Trust-Index-Skript erneut ausführen.");
}

let display = fs.readFileSync(backupPath, "utf8").replace(/\r\n/g, "\n");

const importToFind = `import { BriefingAudioPlayer } from "@/components/BriefingAudioPlayer";`;
const importToAdd = `import { TrustIndexInfoButton } from "@/components/TrustIndexInfoButton";`;

if (!display.includes(importToAdd)) {
  display = display.replace(importToFind, `${importToFind}
${importToAdd}`);
}

const trustStart = display.indexOf(`          <div className="self-start w-full xl:w-auto">`);
const afterTrustBlock = display.indexOf(`
        </div>
      </section>`, trustStart);

if (trustStart === -1 || afterTrustBlock === -1) {
  throw new Error("Der Vertrauensindex-Bereich konnte nicht sauber gefunden werden.");
}

const newTrustBlock = `          <div className="self-start w-full xl:w-auto">
            <TrustIndexInfoButton
              score={briefing.confidenceScore}
              language={language}
              sourceCount={briefing.sourceCount}
              articleCount={briefing.articleCount}
              displayLabel={language === "de" ? "Vertrauensindex" : t.confidenceScore}
            />
          </div>`;

display = display.slice(0, trustStart) + newTrustBlock + display.slice(afterTrustBlock);

const sourceWindowEndSnippet = `            {formatWindow(briefing.sourceWindowStart, briefing.sourceWindowEnd, language)}
          </p>`;

const sourceAddition = `            {formatWindow(briefing.sourceWindowStart, briefing.sourceWindowEnd, language)}
          </p>

          <p className="leading-6">
            {language === "de"
              ? "Der Vertrauensindex bewertet die Belastbarkeit der verwendeten Quellenbasis. Details zur Berechnung und Quellenlogik erhältst du per Klick auf den Vertrauensindex oben."
              : "The confidence score assesses the robustness of the underlying source base. Click the confidence score above for details on the scoring and source logic."}
          </p>`;

if (!display.includes("Details zur Berechnung und Quellenlogik")) {
  if (!display.includes(sourceWindowEndSnippet)) {
    throw new Error("Der Quellenfenster-Block wurde nicht gefunden.");
  }

  display = display.replace(sourceWindowEndSnippet, sourceAddition);
}

fs.writeFileSync(displayPath, display, "utf8");

console.log("BriefingDisplay.tsx wurde sauber repariert und der Vertrauensindex wurde eingebaut.");