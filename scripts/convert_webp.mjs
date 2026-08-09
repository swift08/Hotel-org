import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const imagesDir = path.resolve("public/images");
const dishesDir = path.resolve("public/images/dishes");

function convertDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".jpeg")) {
      const inputPath = path.join(dir, file);
      const outputName = file.replace(/\.(png|jpg|jpeg)$/, ".webp");
      const outputPath = path.join(dir, outputName);
      console.log(`Converting ${file} -> ${outputName}...`);
      try {
        execSync(`npx sharp-cli -i "${inputPath}" -o "${outputPath}" -f webp -q 85`, {
          stdio: "inherit",
        });
      } catch (err) {
        console.error(`Failed to convert ${file}:`, err.message);
      }
    }
  }
}

console.log("Starting WebP conversion...");
convertDir(imagesDir);
convertDir(dishesDir);
console.log("WebP conversion completed!");
