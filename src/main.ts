import kaboom from "kaboom";

// Initialize Kaboom context
const k = kaboom({
    global: true, // Import Kaboom functions into global namespace
    width: 1280, // Game canvas width
    height: 720, // Game canvas height
    scale: 1, // Keep scale at 1 for now
    debug: true, // Show debug information
    background: [0, 0, 0, 1], // Black background
    // canvas: document.querySelector("#game") as HTMLCanvasElement | undefined // Removed - Vite handles canvas injection
});

// Define a simple scene
k.scene("main", () => {
    k.add([
        k.text("Corners - Press Space to Start", { size: 40 }),
        k.pos(k.width() / 2, k.height() / 2),
        k.anchor("center")
    ]);

    // Placeholder for starting the game (menu scene later)
    k.onKeyPress("space", () => {
        // TODO: Go to menu scene
        console.log("Starting game...");
    });
});

// Start the main scene
k.go("main"); 