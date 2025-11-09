const fs = require("fs");
const p = "src/pages/TrainingSession/TrainingSession.jsx";
const s = fs.readFileSync(p, "utf8");
const counts = {
  "{": (s.match(/{/g) || []).length,
  "}": (s.match(/}/g) || []).length,
  "(": (s.match(/\(/g) || []).length,
  ")": (s.match(/\)/g) || []).length,
  "[": (s.match(/\[/g) || []).length,
  "]": (s.match(/\]/g) || []).length,
  "`": (s.match(/`/g) || []).length,
  lines: s.split(/\r?\n/).length,
};
console.log(JSON.stringify(counts, null, 2));
