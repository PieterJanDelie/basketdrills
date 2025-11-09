const fs = require("fs");
const p = "src/pages/TrainingSession/TrainingSession.jsx";
const s = fs.readFileSync(p, "utf8");
const lines = s.split(/\r?\n/);
let depth = 0;
let maxDepth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth > maxDepth) maxDepth = depth;
  }
  if (i < 40 || i > lines.length - 40) {
    console.log(`${i + 1}	depth=${depth}	${line.trim().slice(0, 120)}`);
  }
}
console.log("maxDepth=", maxDepth, "finalDepth=", depth);
