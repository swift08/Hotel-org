import fs from "fs";
import { PNG } from "pngjs";

const inputPath = "public/images/logo.png";
const outputPath = "public/images/logo.png";

fs.createReadStream(inputPath)
  .pipe(new PNG())
  .on("parsed", function () {
    let minX = this.width;
    let minY = this.height;
    let maxX = 0;
    let maxY = 0;
    let foundPixel = false;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (this.width * y + x) << 2;
        const alpha = this.data[idx + 3];

        // Check non-transparent non-white background
        const r = this.data[idx];
        const g = this.data[idx + 1];
        const b = this.data[idx + 2];

        // Is not pure white or completely transparent
        const isBackground = alpha < 10 || (r > 250 && g > 250 && b > 250);

        if (!isBackground) {
          foundPixel = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!foundPixel) {
      console.log("No content pixels found to crop.");
      return;
    }

    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(this.width - 1, maxX + padding);
    maxY = Math.min(this.height - 1, maxY + padding);

    const croppedWidth = maxX - minX + 1;
    const croppedHeight = maxY - minY + 1;

    console.log(
      `Cropping logo from ${this.width}x${this.height} to ${croppedWidth}x${croppedHeight}`,
    );

    const cropped = new PNG({ width: croppedWidth, height: croppedHeight });

    for (let y = 0; y < croppedHeight; y++) {
      for (let x = 0; x < croppedWidth; x++) {
        const sourceIdx = (this.width * (minY + y) + (minX + x)) << 2;
        const targetIdx = (croppedWidth * y + x) << 2;

        const r = this.data[sourceIdx];
        const g = this.data[sourceIdx + 1];
        const b = this.data[sourceIdx + 2];
        const a = this.data[sourceIdx + 3];

        // If pixel was near white background, make transparent for dark theme!
        if (r > 240 && g > 240 && b > 240) {
          cropped.data[targetIdx] = 0;
          cropped.data[targetIdx + 1] = 0;
          cropped.data[targetIdx + 2] = 0;
          cropped.data[targetIdx + 3] = 0;
        } else {
          cropped.data[targetIdx] = r;
          cropped.data[targetIdx + 1] = g;
          cropped.data[targetIdx + 2] = b;
          cropped.data[targetIdx + 3] = a;
        }
      }
    }

    cropped
      .pack()
      .pipe(fs.createWriteStream(outputPath))
      .on("finish", () => {
        console.log("Logo successfully cropped and transparent background applied!");
      });
  });
