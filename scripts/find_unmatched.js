const fs = require("fs");
const p = "src/pages/TrainingSession/TrainingSession.jsx";
const s = fs.readFileSync(p, "utf8");
const lines = s.split(/\r?\n/);
let stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === "{") stack.push({ line: i + 1, col: j + 1 });
    else if (ch === "}") {
      if (stack.length === 0) {
        console.log("Extra closing brace at", i + 1, j + 1);
      } else stack.pop();
    }
  }
}
if (stack.length > 0) {
  console.log("Unmatched opening braces (last 5):", stack.slice(-5));
} else console.log("All braces matched");
