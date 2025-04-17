import kaboom, { KaboomCtx, Color, Vec2 } from "kaboom";

// Initialize Kaboom context
const k: KaboomCtx = kaboom({
    global: true, // Import Kaboom functions into global namespace
    width: 1280, // Game canvas width
    height: 720, // Game canvas height
    scale: 1, // Keep scale at 1 for now
    debug: true, // Show debug information
    background: [0, 0, 0, 1], // Black background
    // canvas: document.querySelector("#game") as HTMLCanvasElement | undefined // Removed - Vite handles canvas injection
});

// Global state for selected players
let selectedPlayers = 1;

// Define menu scene
k.scene("menu", () => {
    const centerPos = k.vec2(k.width() / 2, k.height() / 2);
    const selectionOffset = 150;
    const optionTextSize = 40;
    const underlineHeight = 4;
    const underlinePadding = 10; // Padding below text

    // Title
    k.add([
        k.text("Corners", { size: 80 }),
        k.pos(centerPos.x, k.height() / 4),
        k.anchor("center")
    ]);

    // Player 1 Option
    const p1Pos = k.vec2(centerPos.x - selectionOffset, centerPos.y);
    const p1Text = k.add([
        k.text("1 Player", { size: optionTextSize }),
        k.pos(p1Pos),
        k.anchor("center")
    ]);

    // Player 2 Option
    const p2Pos = k.vec2(centerPos.x + selectionOffset, centerPos.y);
    const p2Text = k.add([
        k.text("2 Players", { size: optionTextSize }),
        k.pos(p2Pos),
        k.anchor("center")
    ]);

    // Calculate initial underline position and width based on selected option
    const getUnderlineProps = (numPlayers: number) => {
        const targetText = numPlayers === 1 ? p1Text : p2Text;
        const textWidth = targetText.width; // Use rendered width
        const targetPos = numPlayers === 1 ? p1Pos : p2Pos;
        return {
            x: targetPos.x - textWidth / 2,
            y: targetPos.y + optionTextSize / 2 + underlinePadding,
            width: textWidth
        };
    };

    const initialProps = getUnderlineProps(selectedPlayers);

    // Selection Underline Indicator
    const underline = k.add([
        k.rect(initialProps.width, underlineHeight),
        k.pos(initialProps.x, initialProps.y),
        k.color(k.WHITE), // White color for the underline
        k.anchor("topleft"),
        "underline"
    ]);

    // Instructions
    k.add([
        k.text("Use Left/Right Arrows to Select", { size: 24 }),
        k.pos(centerPos.x, centerPos.y + 80),
        k.anchor("center")
    ]);
    k.add([
        k.text("Press Space to Start", { size: 24 }),
        k.pos(centerPos.x, centerPos.y + 120),
        k.anchor("center")
    ]);

    // Update selection and move underline
    const updateSelection = (newSelection: number) => {
        selectedPlayers = newSelection;
        const props = getUnderlineProps(selectedPlayers);
        underline.pos.x = props.x;
        underline.pos.y = props.y;
        underline.width = props.width; // Update width in case text width differs
        // Optional: Add sound effect
    };

    // Input handling for selection
    k.onKeyPress("left", () => {
        if (selectedPlayers === 2) { // Only update if changing selection
            updateSelection(1);
        }
    });

    k.onKeyPress("right", () => {
        if (selectedPlayers === 1) { // Only update if changing selection
            updateSelection(2);
        }
    });

    // Start game
    k.onKeyPress("space", () => {
        k.go("game", { numPlayers: selectedPlayers });
        console.log(`Starting game with ${selectedPlayers} player(s)...`);
    });
});

// Define Game Constants
const ARENA_WIDTH = k.width();
const ARENA_HEIGHT = k.height();
const START_ZONE_WIDTH = ARENA_WIDTH * 0.15;
const GAME_ZONE_X = START_ZONE_WIDTH;
const GAME_ZONE_WIDTH = ARENA_WIDTH * 0.85;

// Calculate playable height first, assuming a placeholder/max jail height initially if needed,
// or just calculate base size first if jail height depends ONLY on base size.
const TEMP_MAX_JAIL_HEIGHT = ARENA_HEIGHT * 0.2; // Estimate max jail height for calculation
const APPROX_PLAYABLE_HEIGHT = ARENA_HEIGHT - TEMP_MAX_JAIL_HEIGHT;

// Calculate Base Size based on approximate playable area
const BASE_SIZE_FRACTION = 0.2;
const BASE_SIZE = Math.min(GAME_ZONE_WIDTH, APPROX_PLAYABLE_HEIGHT) * BASE_SIZE_FRACTION;

// Now define the actual Jail Height and Y position
const JAIL_HEIGHT = BASE_SIZE;
const JAIL_Y = ARENA_HEIGHT - JAIL_HEIGHT;

// We can recalculate playable height accurately now if needed elsewhere, but baseDist uses it
const GAME_ZONE_PLAYABLE_HEIGHT = ARENA_HEIGHT - JAIL_HEIGHT;

// Colors
const COLOR_START_ZONE: Color = k.rgb(50, 50, 50);
const COLOR_GAME_ZONE: Color = k.rgb(40, 40, 40);
const COLOR_BASE: Color = k.rgb(80, 80, 150);
const COLOR_JAIL: Color = k.rgb(150, 80, 80);
const COLOR_TEXT: Color = k.WHITE;

// Define the game scene
k.scene("game", ({ numPlayers }: { numPlayers: number }) => {
    // --- Draw Arena Layout ---

    // Starting Zone Background
    k.add([
        k.rect(START_ZONE_WIDTH, ARENA_HEIGHT),
        k.pos(0, 0),
        k.color(COLOR_START_ZONE),
        k.fixed(), // Keep UI elements fixed relative to camera
        "startZoneBg"
    ]);

    // Game Zone Background
    k.add([
        k.rect(GAME_ZONE_WIDTH, ARENA_HEIGHT),
        k.pos(GAME_ZONE_X, 0),
        k.color(COLOR_GAME_ZONE),
        k.fixed(),
        "gameZoneBg"
    ]);

    // --- Base Positions (within Game Zone) ---
    // Center bases vertically within the playable area (above jail)
    const gameZoneCenter = k.vec2(
        GAME_ZONE_X + GAME_ZONE_WIDTH / 2, 
        GAME_ZONE_PLAYABLE_HEIGHT / 2 // Use playable height center
    );
    // Base distance calculation now uses the final GAME_ZONE_PLAYABLE_HEIGHT
    const baseDist = Math.min(GAME_ZONE_WIDTH, GAME_ZONE_PLAYABLE_HEIGHT) * 0.4;

    const basePositions: { [key: number]: Vec2 } = {
        1: k.vec2(gameZoneCenter.x - baseDist * 0.8, gameZoneCenter.y - baseDist * 0.7), // Top-left
        2: k.vec2(gameZoneCenter.x + baseDist * 0.8, gameZoneCenter.y - baseDist * 0.7), // Top-right
        3: k.vec2(gameZoneCenter.x, gameZoneCenter.y), // Center
        4: k.vec2(gameZoneCenter.x - baseDist * 0.8, gameZoneCenter.y + baseDist * 0.7), // Bottom-left
        5: k.vec2(gameZoneCenter.x + baseDist * 0.8, gameZoneCenter.y + baseDist * 0.7), // Bottom-right
    };

    // Draw Bases
    for (let i = 1; i <= 5; i++) {
        const pos = basePositions[i];
        k.add([
            k.rect(BASE_SIZE, BASE_SIZE),
            k.pos(pos),
            k.anchor("center"),
            k.color(COLOR_BASE),
            k.area(), // Make it detectable by players
            `base${i}`, // Tag for identification
            { baseId: i } // Custom property
        ]);
        // Base Number Text
        k.add([
            k.text(String(i), { size: 40 }),
            k.pos(pos),
            k.anchor("center"),
            k.color(COLOR_TEXT)
        ]);
    }

    // --- Jail Zone ---
    k.add([
        k.rect(GAME_ZONE_WIDTH, JAIL_HEIGHT),
        k.pos(GAME_ZONE_X, JAIL_Y),
        k.color(COLOR_JAIL),
        k.area(),
        k.fixed(),
        "jailZone"
    ]);
    k.add([
        k.text("JAIL", { size: 50 }),
        k.pos(GAME_ZONE_X + GAME_ZONE_WIDTH / 2, JAIL_Y + JAIL_HEIGHT / 2),
        k.anchor("center"),
        k.color(COLOR_TEXT),
        k.fixed()
    ]);

    // --- Placeholder Info & Controls ---
    k.add([
        k.text(`Players: ${numPlayers}`, { size: 24 }),
        k.pos(10, 10),
        k.color(COLOR_TEXT),
        k.fixed()
    ]);

    // Go back to menu (for testing)
    k.onKeyPress("escape", () => {
        k.go("menu");
    });
});

// Start the menu scene
k.go("menu"); 