import kaboom, { KaboomCtx, Color, Vec2, GameObj } from "kaboom";

// Initialize Kaboom context
const k: KaboomCtx = kaboom({
    global: false, // Import Kaboom functions into global namespace
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

// Player Constants
const PLAYER_SIZE = 32;
const PLAYER_SPEED = 320;
const PLAYER_ROTATION_SPEED = 250; // Slightly faster rotation (was 200)
const PLAYER_COLOR_P1 = k.rgb(100, 100, 255); // Blue-ish
const PLAYER_COLOR_P2 = k.rgb(100, 255, 100); // Green-ish
const PLAYER_COLOR_AI = k.rgb(200, 200, 200); // Light Grey

// Colors
const COLOR_START_ZONE: Color = k.rgb(50, 50, 50);
const COLOR_GAME_ZONE: Color = k.rgb(40, 40, 40);
const COLOR_BASE: Color = k.rgb(80, 80, 150);
const COLOR_JAIL: Color = k.rgb(150, 80, 80);
const COLOR_TEXT: Color = k.WHITE;

// Die Visual Constants
const DIE_SIZE = 60;
const DIE_BG_COLOR = k.WHITE;
const DIE_DOT_COLOR = k.BLACK;
const DIE_DOT_SIZE = DIE_SIZE * 0.15;

// Function to spawn a player
function spawnPlayer(k: KaboomCtx, id: string, startPos: Vec2, color: Color, isAI: boolean = false) {
    const headSize = PLAYER_SIZE * 0.6;
    const shoulderWidth = PLAYER_SIZE;
    const shoulderHeight = PLAYER_SIZE * 0.5;
    const limbSize = PLAYER_SIZE * 0.2;
    const footSize = PLAYER_SIZE * 0.25; // Slightly larger than limbs maybe?

    const player = k.add([
        k.pos(startPos),
        k.rotate(0), // Reset initial rotation to 0 (facing right)
        // Define area shape relative to the player's center anchor
        k.area({ shape: new k.Rect(k.vec2(0, 0).sub(k.vec2(PLAYER_SIZE/2, PLAYER_SIZE/2)), PLAYER_SIZE, PLAYER_SIZE) }),
        k.anchor("center"), // Main anchor for the player object itself
        k.body({ isStatic: false }),
        k.offscreen({ hide: true }),
        "player",
        id,
        {
            isAI: isAI,
            isInJail: false,
            currentBase: null,
            isMoving: false, // Track movement state for animation
            animTimer: 0, // Timer for animation cycle
            topLimb: null as GameObj | null,
            bottomLimb: null as GameObj | null,
            upperFoot: null as GameObj | null,
            lowerFoot: null as GameObj | null,
            limbOffsetY: shoulderWidth * 0.5, // Vertical offset for limbs
            footOffsetY: shoulderHeight * 0.5, // Vertical offset for feet
            footOffsetX: shoulderWidth * 0.3, // Base horizontal offset for feet (can be 0 if centered)
            // AI Specific State
            aiState: 'idle' as 'idle' | 'moving_to_base',
            targetBaseId: null as number | null
        }
    ]);

    // Add visual components as children - Draw relative to facing right (angle 0)
    const shoulderVisualOffset = shoulderWidth * 0.15; // How far back shoulders are
    const headVisualOffset = headSize * 0.05; // How far forward head is

    // Limbs (Positioned vertically relative to center)
    const limbOffsetY = player.limbOffsetY; // Get the offset for clarity
    // Top Limb (was Left when facing up)
    player.topLimb = player.add([
        k.rect(limbSize, limbSize),
        k.pos(0, -limbOffsetY), // Position Y above center
        k.anchor("center"),
        k.color(color.darken(30)),
        k.opacity(0),
        "limb",
        "topLimb"
    ]);
    // Bottom Limb (was Right when facing up)
    player.bottomLimb = player.add([
        k.rect(limbSize, limbSize),
        k.pos(0, limbOffsetY), // Position Y below center
        k.anchor("center"),
        k.color(color.darken(30)),
        k.opacity(0),
        "limb",
        "bottomLimb"
    ]);

    // Feet (Positioned vertically symmetrical, initially hidden)
    const footOffsetY = player.footOffsetY;
    const footOffsetX = 0; // Start centered horizontally before animation

    // Upper Foot
    player.upperFoot = player.add([
        k.rect(footSize, footSize),
        k.pos(footOffsetX, -footOffsetY), // Position above center vertically
        k.anchor("center"),
        k.color(color.darken(40)), // Darker color for feet
        k.opacity(0),
        "foot",
        "upperFoot"
    ]);
    // Lower Foot
    player.lowerFoot = player.add([
        k.rect(footSize, footSize),
        k.pos(footOffsetX, footOffsetY), // Position below center vertically
        k.anchor("center"),
        k.color(color.darken(40)),
        k.opacity(0),
        "foot",
        "lowerFoot"
    ]);

        // Shoulders (Vertical rectangle behind center)
        player.add([
            k.rect(shoulderHeight, shoulderWidth), // Flipped dimensions
            k.pos(-shoulderVisualOffset, 0), // Position X behind center
            k.anchor("center"),
            k.color(color),
            "playerShoulders"
        ]);
        
        // Head (Circle ahead of center)
        player.add([
            k.circle(headSize / 2),
            k.pos(headVisualOffset, 0), // Position X ahead of center
            k.anchor("center"),
            k.color(color.lighten(20)), // Slightly lighter color for head
            "playerHead"
        ]);
    

    return player;
}

// Define the game scene
k.scene("game", ({ numPlayers }: { numPlayers: number }) => {
    // --- Game State ---
    let currentRound = 0;
    const maxRounds = 10;
    let gameState: 'waiting' | 'countdown' | 'rolling' | 'checking' | 'paused' | 'gameOver' = 'waiting';
    let roundTimerHandle: any = null; // Use any or a specific handle type if known
    let rolledNumber: number | null = null;

    // --- UI Elements ---
    // Round Counter (Top-center of Start Zone)
    const roundText = k.add([
        k.text(`Round: ${currentRound}/${maxRounds}`, { size: 24 }),
        k.pos(START_ZONE_WIDTH / 2, 20), // Position in top-center of start zone
        k.anchor("top"),
        k.fixed(),
        k.z(100), // Ensure it's drawn on top
        "roundText"
    ]);

    // Die Display (Parent Object with Background)
    const dieDisplayPos = k.vec2(START_ZONE_WIDTH / 2, 70); // Position below round text
    const dieDisplay = k.add([
        k.pos(dieDisplayPos),
        k.rect(DIE_SIZE, DIE_SIZE),
        k.color(DIE_BG_COLOR),
        k.anchor("top"),
        k.fixed(),
        k.z(99), // Below round text, above other things
        "dieDisplayContainer" // Tag for the container itself
    ]);

    // Create permanent, hidden dots for the die face
    const dieDotPositions = {
        center: k.vec2(0, 0),
        tl: k.vec2(-DIE_SIZE / 4, -DIE_SIZE / 4),
        tr: k.vec2(DIE_SIZE / 4, -DIE_SIZE / 4),
        bl: k.vec2(-DIE_SIZE / 4, DIE_SIZE / 4),
        br: k.vec2(DIE_SIZE / 4, DIE_SIZE / 4),
        ml: k.vec2(-DIE_SIZE / 4, 0), // Middle-left
        mr: k.vec2(DIE_SIZE / 4, 0), // Middle-right
    };
    const dieDots: { [key: string]: GameObj } = {};
    const centerOffset = k.vec2(0, DIE_SIZE / 2); // Offset from dieDisplay's top anchor

    for (const key in dieDotPositions) {
        dieDots[key] = dieDisplay.add([
            k.circle(DIE_DOT_SIZE / 2),
            k.pos(centerOffset.add(dieDotPositions[key as keyof typeof dieDotPositions])),
            k.anchor("center"),
            k.color(DIE_DOT_COLOR),
            k.opacity(0), // Start hidden
            k.z(100), 
            "dot", // Still tag them if needed, though direct references are better
            `dot-${key}` // Unique tag per dot
        ]);
    }

    // --- Helper Function to Draw Die Face ---
    function drawDieFace(num: number | null) {
        // Hide all dots initially
        for (const key in dieDots) {
            dieDots[key].opacity = 0;
        }

        if (num === null || num < 1 || num > 6) {
            return; // Leave all dots hidden
        }

        // Show required dots based on number
        // Center dot
        if (num === 1 || num === 3 || num === 5) {
            dieDots.center.opacity = 1;
        }
        // Top-left & Bottom-right dots
        if (num >= 2) {
            dieDots.tl.opacity = 1;
            dieDots.br.opacity = 1;
        }
        // Top-right & Bottom-left dots
        if (num >= 4) {
            dieDots.tr.opacity = 1;
            dieDots.bl.opacity = 1;
        }
        // Middle-left & Middle-right dots (for 6)
        if (num === 6) {
            dieDots.ml.opacity = 1;
            dieDots.mr.opacity = 1;
        }
    }

    // --- Game Logic Functions ---
    function startRound() {
        if (currentRound >= maxRounds && rolledNumber !== 6) { // Check if game should end (excluding bonus round case)
            // TODO: Implement game over logic
            console.log("Game Over - Max rounds reached");
            gameState = 'gameOver';
            // Maybe display win/loss message
            return;
        }

        // Increment round unless it's the start of the bonus round
        if (roundText.text !== "Bonus Round!") { 
            currentRound++;
            roundText.text = `Round: ${currentRound}/${maxRounds}`;
        }
        console.log(`Starting Round ${currentRound} (or Bonus)`);
        
        rolledNumber = null;
        drawDieFace(null); // Ensure dots are hidden at round start
        
        // Random spin duration (3-8 seconds)
        const spinDuration = k.rand(3, 9);
        console.log(`Spin duration: ${spinDuration.toFixed(1)}s`);
        
        // Immediately start the die roll/spin
        startDieRoll(spinDuration);
    }

    function startDieRoll(duration: number) {
        gameState = 'rolling';
        console.log("Spinning die...");

        // Assign targets to AI players
        k.get("player").forEach(p => {
            if (p.isAI && !p.isInJail) { // Only target for active AI
                p.targetBaseId = k.randi(1, 5); // Target base 1-5 (Corrected range)
                p.aiState = 'moving_to_base';
                console.log(`${p.id} targeting base ${p.targetBaseId}`);
            }
        });
        
        // Start the die flickering immediately
        const rollDuration = duration; 
        let spinTimer = 0;
        const spinInterval = k.loop(0.05, () => {
            spinTimer += 0.05;
            drawDieFace(k.randi(1, 7)); // Call new function
            
            if (spinTimer >= rollDuration) {
                spinInterval.cancel();
                rolledNumber = k.randi(1, 7); 
                console.log(`Rolled: ${rolledNumber}`);
                drawDieFace(rolledNumber); // Call new function
                gameState = 'checking';
                k.wait(0.5, checkPlayerPositions);
            }
        });
    }

    function checkPlayerPositions() {
        console.log("Checking player positions...");
        if (rolledNumber === null) {
            console.error("Checking positions but rolledNumber is null!");
            // Optionally trigger next round immediately or handle error
            k.wait(1.5, () => { startRound(); }); // Simple recovery: just start next round
            return;
        }

        const allPlayers = k.get("player");

        if (rolledNumber === 6) {
            console.log("Rolled 6! Releasing jail...");
            allPlayers.forEach(p => {
                if (p.isInJail) {
                    releaseFromJail(p);
                }
            });
        } else {
            console.log(`Checking for players on base ${rolledNumber} or no base...`);
            allPlayers.forEach(p => {
                // Skip players already in jail
                if (p.isInJail) return;
                
                // Check if player is in the game zone before checking bases
                // (Avoids jailing players still in the start zone)
                if (p.pos.x < GAME_ZONE_X) { 
                    console.log(`${p.id} is safe in start zone.`);
                    return; 
                }

                // Condition 1: Player is on the *rolled* base number
                // Condition 2: Player is not on *any* base (currentBase is null)
                if (p.currentBase === rolledNumber || p.currentBase === null) {
                    console.log(`${p.id} is on base ${p.currentBase}. Rolled ${rolledNumber}.`);
                    sendToJail(p);
                } else {
                    // Player is on a different base, they are safe
                    console.log(`${p.id} is safe on base ${p.currentBase}. Rolled ${rolledNumber}.`);
                }
            });
        }

        // Wait a bit, then start next round (or handle bonus/end game)
        k.wait(1.5, () => {
            // Reset AI state for next round
            k.get("player").forEach(p => {
                if (p.isAI) {
                    p.aiState = 'idle';
                    p.targetBaseId = null;
                    p.isMoving = false; // Ensure animation is stopped
                }
            });

            // Handle bonus round case
            if (currentRound === maxRounds && rolledNumber === 6) {
                console.log("Bonus Round!");
                // Reset round counter display for bonus? Or show "Bonus"?
                roundText.text = "Bonus Round!";
                // Don't actually increment currentRound past maxRounds
                startRound(); // Start the bonus round process
            } else if (currentRound < maxRounds) {
                startRound();
            } else {
                 // Game truly over after round 10 (and not a 6)
                 console.log("Final Check Complete - Game Over");
                 gameState = 'gameOver';
                 // TODO: Final win/loss check
            }
        });
    }

    // --- Jail/Release Functions ---
    function sendToJail(player: GameObj) {
        if (player.isInJail) return; // Already jailed
        
        console.log(`Sending ${player.id} to jail!`);
        player.isInJail = true;
        player.currentBase = null; // No longer on a base
        player.isMoving = false; // Stop walking animation
        
        // Move to a random spot within the jail boundaries
        const jailPadding = PLAYER_SIZE; // Padding from jail edges
        const randomX = k.rand(GAME_ZONE_X + jailPadding, GAME_ZONE_X + GAME_ZONE_WIDTH - jailPadding);
        const randomY = k.rand(JAIL_Y + jailPadding, JAIL_Y + JAIL_HEIGHT - jailPadding);
        player.pos = k.vec2(randomX, randomY);

        // Optional: Add a visual effect or sound
    }

    function releaseFromJail(player: GameObj) {
        if (!player.isInJail) return; // Not in jail

        console.log(`Releasing ${player.id} from jail!`);
        player.isInJail = false;

        // Move back to a random spot in the player spawn area
        const spawnAreaYStart = JAIL_HEIGHT; // Top Y of spawn area
        const spawnAreaHeight = ARENA_HEIGHT - JAIL_HEIGHT - JAIL_HEIGHT;
        const randomSpawnY = k.rand(spawnAreaYStart + PLAYER_SIZE / 2, spawnAreaYStart + spawnAreaHeight - PLAYER_SIZE / 2);
        player.pos = k.vec2(START_ZONE_WIDTH / 2, randomSpawnY);

        // Optional: Add visual effect or sound
    }

    // --- Initial Game Start ---
    startRound(); // Start the first round when scene loads

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

    // --- Spawn Players ---
    const players: { [id: string]: GameObj } = {};
    const playerSpawnX = START_ZONE_WIDTH / 2; // Horizontal center of start zone
    const totalPlayers = 5;
    const numAI = totalPlayers - numPlayers;

    // Define vertical spawning constraints
    const topBarrierHeight = JAIL_HEIGHT; // Same height as jail
    const bottomBarrierHeight = JAIL_HEIGHT; // Same height as jail
    const spawnAreaYStart = topBarrierHeight;
    const spawnAreaHeight = ARENA_HEIGHT - topBarrierHeight - bottomBarrierHeight;

    // Calculate vertical spawn positions within the constrained area
    const totalPlayerHeight = totalPlayers * PLAYER_SIZE;
    // Ensure spacing isn't negative if players don't fit (shouldn't happen with current sizes)
    const playerSpacing = Math.max(0, (spawnAreaHeight - totalPlayerHeight) / (totalPlayers + 1));
    // Start spawning relative to the top of the spawn area
    let currentSpawnY = spawnAreaYStart + playerSpacing;

    // Spawn Player 1
    players["p1"] = spawnPlayer(k, "p1", k.vec2(playerSpawnX, currentSpawnY + PLAYER_SIZE / 2), PLAYER_COLOR_P1, false);
    currentSpawnY += PLAYER_SIZE + playerSpacing;

    // Spawn Player 2 if selected
    if (numPlayers === 2) {
        players["p2"] = spawnPlayer(k, "p2", k.vec2(playerSpawnX, currentSpawnY + PLAYER_SIZE / 2), PLAYER_COLOR_P2, false);
        currentSpawnY += PLAYER_SIZE + playerSpacing;
    }

    // Spawn AI Players
    for (let i = 0; i < numAI; i++) {
        const aiId = `ai${i + 1}`;
        const spawnPos = k.vec2(playerSpawnX, currentSpawnY + PLAYER_SIZE / 2);
        const aiPlayer = spawnPlayer(k, aiId, spawnPos, PLAYER_COLOR_AI, true);
        players[aiId] = aiPlayer;

        // Assign initial target immediately
        aiPlayer.targetBaseId = k.randi(1, 5); // Target base 1-5 (Corrected range)
        aiPlayer.aiState = 'moving_to_base';
        console.log(`${aiId} targeting base ${aiPlayer.targetBaseId} initially.`);
        
        currentSpawnY += PLAYER_SIZE + playerSpacing;
    }

    // P1 Rotation
    k.onKeyDown("left", () => {
        players["p1"].angle -= PLAYER_ROTATION_SPEED * k.dt();
    });
    k.onKeyDown("right", () => {
        players["p1"].angle += PLAYER_ROTATION_SPEED * k.dt();
    });

    // P1 Forward/Backward Movement & Animation Trigger
    k.onKeyDown("up", () => {
        const moveDir = k.Vec2.fromAngle(players["p1"].angle);
        players["p1"].move(moveDir.scale(PLAYER_SPEED));
        players["p1"].isMoving = true;
    });
    k.onKeyDown("down", () => {
        const moveDir = k.Vec2.fromAngle(players["p1"].angle);
        players["p1"].move(moveDir.scale(-PLAYER_SPEED));
        players["p1"].isMoving = true;
    });
    
    // Stop P1 animation when movement keys released
    const checkStopMovingP1 = () => {
        if (!k.isKeyDown("up") && !k.isKeyDown("down")) {
            players["p1"].isMoving = false;
        }
    };
    k.onKeyRelease("up", checkStopMovingP1);
    k.onKeyRelease("down", checkStopMovingP1);

    // P2 Controls (WASD) - Only if P2 exists
    if (numPlayers === 2) {
        // P2 Rotation
        k.onKeyDown("a", () => {
            players["p2"].angle -= PLAYER_ROTATION_SPEED * k.dt();
        });
        k.onKeyDown("d", () => {
            players["p2"].angle += PLAYER_ROTATION_SPEED * k.dt();
        });
        // P2 Forward/Backward Movement & Animation Trigger
        k.onKeyDown("w", () => {
            const moveDir = k.Vec2.fromAngle(players["p2"].angle);
            players["p2"].move(moveDir.scale(PLAYER_SPEED));
            players["p2"].isMoving = true;
        });
        k.onKeyDown("s", () => {
            const moveDir = k.Vec2.fromAngle(players["p2"].angle);
            players["p2"].move(moveDir.scale(-PLAYER_SPEED));
            players["p2"].isMoving = true;
        });
        // Stop P2 animation when movement keys released
        const checkStopMovingP2 = () => {
            if (!k.isKeyDown("w") && !k.isKeyDown("s")) {
                players["p2"].isMoving = false;
            }
        };
        k.onKeyRelease("w", checkStopMovingP2);
        k.onKeyRelease("s", checkStopMovingP2);
    }

    // --- Update Player Logic (Animation and Boundaries) ---
    const animSpeed = 16; // Increase swing speed (was 8)
    const animDist = 10; // Increase oscillation magnitude (was 5)

    k.onUpdate("player", (p) => {
        // --- Animation ---
        const topLimb = p.topLimb;
        const bottomLimb = p.bottomLimb;
        const upperFoot = p.upperFoot;
        const lowerFoot = p.lowerFoot;

        if (topLimb && bottomLimb && upperFoot && lowerFoot) { // Check all limbs/feet exist
            if (p.isMoving) {
                p.animTimer += k.dt() * animSpeed;
                const animOffset = Math.sin(p.animTimer) * animDist;

                // Animate Limbs (X swing, fixed Y)
                topLimb.pos.x = animOffset;
                topLimb.pos.y = -p.limbOffsetY;
                bottomLimb.pos.x = -animOffset;
                bottomLimb.pos.y = p.limbOffsetY;

                // Animate Feet (X swing alternating, fixed Y)
                upperFoot.pos.x = -animOffset; // Opposite X swing to top limb
                upperFoot.pos.y = -p.footOffsetY; // Fixed Y position (upper)
                lowerFoot.pos.x = animOffset; // Opposite X swing to bottom limb
                lowerFoot.pos.y = p.footOffsetY; // Fixed Y position (lower)

                // Make visible
                topLimb.opacity = 1;
                bottomLimb.opacity = 1;
                upperFoot.opacity = 1;
                lowerFoot.opacity = 1;
            } else {
                p.animTimer = 0;
                // Reset X position to 0
                topLimb.pos.x = 0;
                bottomLimb.pos.x = 0;
                upperFoot.pos.x = 0;
                lowerFoot.pos.x = 0;
                // Make hidden
                topLimb.opacity = 0;
                bottomLimb.opacity = 0;
                upperFoot.opacity = 0;
                lowerFoot.opacity = 0;
            }
        }

        // --- AI Movement Logic ---
        if (p.isAI && !p.isInJail && p.aiState === 'moving_to_base') {
            const targetBaseId = p.targetBaseId;
            if (targetBaseId === null) { // Should have a target, but safety check
                p.aiState = 'idle'; 
                p.isMoving = false; // Stop animation
            } else {
                // Move towards target base
                const targetBase = k.get(`base${targetBaseId}`)[0];
                if (targetBase) {
                    const targetPos = targetBase.pos;
                    const distanceToTarget = p.pos.dist(targetPos);
                    const stoppingThreshold = 5; // Pixels - Stop when center is very close

                    // --- New stopping condition: based on distance --- 
                    if (distanceToTarget < stoppingThreshold) {
                        p.aiState = 'idle';
                        p.isMoving = false; // Stop animation
                        p.pos = targetPos; // Optional: Snap exactly to center
                        p.currentBase = targetBaseId; // Ensure currentBase is set correctly
                        console.log(`${p.id} arrived at target base ${targetBaseId}`);
                    } else {
                        // Continue moving towards target
                        const direction = targetPos.sub(p.pos).unit(); // Vector from player to target
                        
                        // --- Add instant rotation --- 
                        p.angle = direction.angle(); // Instantly face the target direction
                        // --- End add instant rotation ---

                        // Move forward
                        p.move(direction.scale(PLAYER_SPEED)); // New way: move directly along the calculated direction vector
                        p.isMoving = true; // Ensure animation plays
                    }
                    // --- End new stopping condition ---

                } else {
                    // Target base somehow doesn't exist? Go idle.
                    p.aiState = 'idle';
                    p.isMoving = false;
                }
            }
        }
        // If AI becomes idle but movement keys aren't pressed (relevant if AI could be controlled)
        if (p.aiState === 'idle' && p.isMoving && p.isAI) {
             // Check if controlled movement stopped if AI could be controlled
             // For now, just ensure animation stops if AI goes idle
             p.isMoving = false;
        }

        // --- Base Overlap Check ---
        let onBaseId: number | null = null;
        for (let i = 1; i <= 5; i++) {
            // k.get() returns an array, check if player overlaps the first (and only) base with that tag
            const base = k.get(`base${i}`)[0]; 
            if (base && p.isColliding(base)) {
                onBaseId = i;
                break; // Found a base, no need to check others
            }
        }
        p.currentBase = onBaseId; // Update the player's state

        // --- Boundary Constraints ---
        const halfPlayer = PLAYER_SIZE / 2;

        // 1. General Screen Bounds
        p.pos.x = k.clamp(p.pos.x, halfPlayer, ARENA_WIDTH - halfPlayer);
        p.pos.y = k.clamp(p.pos.y, halfPlayer, ARENA_HEIGHT - halfPlayer);

        // 2. Jail Zone Specific Constraints
        if (p.isInJail) {
            // Confine player *within* jail bounds
            p.pos.x = k.clamp(p.pos.x, GAME_ZONE_X + halfPlayer, ARENA_WIDTH - halfPlayer);
            p.pos.y = k.clamp(p.pos.y, JAIL_Y + halfPlayer, ARENA_HEIGHT - halfPlayer);
        } else {
            // Prevent non-jailed players from entering jail from above/game zone
            if (p.pos.y + halfPlayer > JAIL_Y && p.pos.x > GAME_ZONE_X) {
                p.pos.y = JAIL_Y - halfPlayer;
            }
            // Optional: Could add checks to prevent entering from sides below JAIL_Y if needed
        }
    });

    // --- Placeholder Info & Controls --- REMOVED Player Count Text
    /*
    k.add([
        k.text(`Players: ${numPlayers}`, { size: 24 }),
        k.pos(10, 10),
        k.color(COLOR_TEXT),
        k.fixed()
    ]);
    */

    // Go back to menu (for testing)
    k.onKeyPress("escape", () => {
        k.go("menu");
    });
});

// Start the menu scene
k.go("menu"); 