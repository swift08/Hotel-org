import fs from "fs";
import { PNG } from "pngjs";

const inputPath = "public/images/logo.png";
const outputPath = "public/favicon.png";
const icoPath = "public/favicon.ico";

fs.createReadStream(inputPath)
  .pipe(new PNG())
  .on("parsed", function () {
    // Icon is in the left 35% of the logo image
    const iconWidth = Math.floor(this.width * 0.35);
    const iconHeight = this.height;

    const iconPNG = new PNG({ width: iconWidth, height: iconHeight });

    for (let y = 0; y < iconHeight; y++) {
      for (let x = 0; x < iconWidth; x++) {
        const sourceIdx = (this.width * y + x) << 2;
        const targetIdx = (iconWidth * y + x) << 2;

        iconPNG.data[targetIdx] = this.data[sourceIdx];
        iconPNG.data[targetIdx + 1] = this.data[sourceIdx + 1];
        iconPNG.data[targetIdx + 2] = this.data[sourceIdx + 2];
        iconPNG.data[targetIdx + 3] = this.data[sourceIdx + 3];
      }
    }

    iconPNG.pack().pipe(fs.createWriteStream(outputPath)).on("finish", () => {
      console.log("Favicon PNG generated successfully!");
      fs.copyFileSync(outputPath, icoPath);
      console.log("Favicon ICO copied successfully!");
    });
  });
