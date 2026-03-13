const { Vibrant } = require("node-vibrant/node");

async function getColor() {
  try {
    const palette = await Vibrant.from(
      "/Users/rahulgupta/Desktop/music-core/my-expo-app/assets/logo.png",
    ).getPalette();
    console.log(JSON.stringify(palette, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

getColor();
