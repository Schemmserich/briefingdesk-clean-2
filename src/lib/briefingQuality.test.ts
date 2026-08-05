import assert from "node:assert/strict";
import test from "node:test";

import {
  improveBriefingQuality,
  isBriefingTextDuplicate,
} from "./briefingQuality";

test("recognizes a paraphrased retaliatory strike as the same event", () => {
  assert.equal(
    isBriefingTextDuplicate(
      "Israel hat im Libanon einen Vergeltungsschlag ausgeführt.",
      "Israelische Angriffe im Libanon erfolgten als Reaktion."
    ),
    true
  );
});

test("keeps a genuinely new consequence of the same event", () => {
  assert.equal(
    isBriefingTextDuplicate(
      "Israel hat im Libanon einen Vergeltungsschlag ausgeführt.",
      "Der Ölpreis stieg anschließend wegen der Sorge vor einer regionalen Eskalation."
    ),
    false
  );
});

test("keeps new factual detail even when a sentence begins with the same event", () => {
  assert.equal(
    isBriefingTextDuplicate(
      "Israel griff Ziele im Libanon an.",
      "Israel griff Ziele im Libanon an und tötete dabei zwei Kommandeure."
    ),
    false
  );
});

test("removes a section sentence that only restates the overview or headline", () => {
  const result = improveBriefingQuality(
    {
      mainTitle: "Neue Spannungen im Nahen Osten",
      overviewParagraph: "Israel hat im Libanon einen Vergeltungsschlag ausgeführt.",
      briefingType: "Morning Briefing",
      confidenceScore: 82,
      sections: [
        {
          title: "Israelische Angriffe im Libanon als Reaktion",
          content:
            "Israelische Angriffe im Libanon erfolgten als Reaktion. Der Ölpreis stieg anschließend wegen der Sorge vor einer regionalen Eskalation.",
        },
      ],
    },
    "Morning Briefing"
  );

  assert.equal(result.sections?.length, 1);
  assert.equal(
    result.sections?.[0]?.content,
    "Der Ölpreis stieg anschließend wegen der Sorge vor einer regionalen Eskalation."
  );
});

test("does not merge a distinct development that only shares one actor", () => {
  assert.equal(
    isBriefingTextDuplicate(
      "Israel hat im Libanon einen Vergeltungsschlag ausgeführt.",
      "Israel stimmt neuen Gesprächen über humanitäre Hilfslieferungen zu."
    ),
    false
  );
});
