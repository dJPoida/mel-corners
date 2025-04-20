import kaboom, { KaboomCtx, Color, Vec2, GameObj } from "kaboom";

// Initialize Kaboom context
const k: KaboomCtx = kaboom({
    global: false, // Ensure global is false
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
    // Load sounds for this scene
    k.loadSound("select", "sounds/select.wav");

    const centerPos = k.vec2(k.width() / 2, k.height() / 2);
    const selectionOffset = 150;
    const optionTextSize = 40;
    const underlineHeight = 4;
    const underlinePadding = 10; // Padding below text

    // --- Key Drawing Constants ---
    const KEY_SIZE = 40;
    const KEY_SPACING = 5;
    const KEY_COLOR = k.rgb(80, 80, 80); // Dark grey keys
    const KEY_TEXT_COLOR = k.WHITE;
    const KEY_GROUP_Y_OFFSET = -80; // How far above the player text

    // --- Reusable Key Drawing Function ---
    function drawKeyGroup(groupCenterPos: Vec2, keys: { up: string, down: string, left: string, right: string }) {
        // Calculate Y positions
        const upY = groupCenterPos.y - KEY_SIZE / 2 - KEY_SPACING / 2;
        const downY = groupCenterPos.y + KEY_SIZE / 2 + KEY_SPACING / 2;
        
        // Calculate X positions relative to center
        const centerX = groupCenterPos.x;
        const horizontalOffset = KEY_SIZE + KEY_SPACING; // Distance from center key to side keys

        const keyPositions = {
            up: k.vec2(centerX, upY),
            down: k.vec2(centerX, downY),
            left: k.vec2(centerX - horizontalOffset, downY), // Position left based on center
            right: k.vec2(centerX + horizontalOffset, downY)  // Position right based on center
        };

        // Helper to add a single key
        const addKey = (pos: Vec2, label: string) => {
            k.add([
                k.rect(KEY_SIZE, KEY_SIZE, { radius: 4 }), // Slightly rounded corners
                k.pos(pos),
                k.anchor("center"),
                k.color(KEY_COLOR),
            ]);
            k.add([
                k.text(label, { size: KEY_SIZE * 0.5 }),
                k.pos(pos),
                k.anchor("center"),
                k.color(KEY_TEXT_COLOR),
                k.z(1) // Ensure text is above key rect
            ]);
        };

        addKey(keyPositions.up, keys.up);
        addKey(keyPositions.down, keys.down);
        addKey(keyPositions.left, keys.left);
        addKey(keyPositions.right, keys.right);
    }

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

    // --- Draw Key Groups ---
    const p1KeyPos = p1Pos.add(0, KEY_GROUP_Y_OFFSET);
    drawKeyGroup(p1KeyPos, { up: "↑", down: "↓", left: "←", right: "→" });

    const p2KeyPos = p2Pos.add(0, KEY_GROUP_Y_OFFSET);
    drawKeyGroup(p2KeyPos, { up: "W", down: "S", left: "A", right: "D" });

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
        k.color(k.WHITE), // Added k. to WHITE
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
        k.play("select"); // Play selection sound
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
const PLAYER_COLOR_P1 = k.rgb(100, 100, 255);
const PLAYER_COLOR_P2 = k.rgb(100, 255, 100);
const PLAYER_COLOR_AI = k.rgb(200, 200, 200);

// Colors
const COLOR_START_ZONE: Color = k.rgb(50, 50, 50);
const COLOR_GAME_ZONE: Color = k.rgb(40, 40, 40);
const COLOR_BASE: Color = k.rgb(80, 80, 150);
const COLOR_JAIL: Color = k.rgb(150, 80, 80);
const COLOR_TEXT: Color = k.WHITE; // Added k.

// Die Visual Constants
const DIE_SIZE = 60;
const DIE_BG_COLOR = k.WHITE; // Added k.
const DIE_DOT_COLOR = k.BLACK; // Added k.
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
        k.rotate(0),
        k.area({ shape: new k.Rect(k.vec2(0, 0).sub(k.vec2(PLAYER_SIZE/2, PLAYER_SIZE/2)), PLAYER_SIZE, PLAYER_SIZE) }), // Added k.Rect, k.vec2
        k.anchor("center"),
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
        k.pos(0, -limbOffsetY),
        k.anchor("center"),
        k.color(color.darken(30)),
        k.opacity(0),
        "limb",
        "topLimb"
    ]);
    // Bottom Limb (was Right when facing up)
    player.bottomLimb = player.add([
        k.rect(limbSize, limbSize),
        k.pos(0, limbOffsetY),
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
        k.pos(footOffsetX, -footOffsetY),
        k.anchor("center"),
        k.color(color.darken(40)),
        k.opacity(0),
        "foot",
        "upperFoot"
    ]);
    // Lower Foot
    player.lowerFoot = player.add([
        k.rect(footSize, footSize),
        k.pos(footOffsetX, footOffsetY),
        k.anchor("center"),
        k.color(color.darken(40)),
        k.opacity(0),
        "foot",
        "lowerFoot"
    ]);

        // Shoulders (Vertical rectangle behind center)
        player.add([
            k.rect(shoulderHeight, shoulderWidth),
            k.pos(-shoulderVisualOffset, 0),
            k.anchor("center"),
            k.color(color),
            "playerShoulders"
        ]);
        
        // Head (Circle ahead of center)
        player.add([
            k.circle(headSize / 2), // Added k.
            k.pos(headVisualOffset, 0),
            k.anchor("center"),
            k.color(color.lighten(20)),
            "playerHead"
        ]);
    

    return player;
}

// Define the game scene
k.scene("game", ({ numPlayers }: { numPlayers: number }) => {
    // Load sounds for this scene
    k.loadSound("jail", "sounds/jail.wav");
    k.loadSound("released", "sounds/released.wav");
    k.loadSound("success", "sounds/success.wav");
    k.loadSound("die1", "sounds/die_1.wav"); // Load die sound 1
    k.loadSound("die2", "sounds/die_2.wav"); // Load die sound 2
    k.loadSound("timer", "sounds/timer.wav"); // Load countdown timer sound

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
        k.pos(START_ZONE_WIDTH / 2, 20),
        k.anchor("top"),
        k.fixed(), // Added k.
        k.z(100) // Added k.
        // "roundText" // Tag seems redundant if accessed via variable
    ]);
    roundText.use("roundText"); // Add tag using .use() if needed later

    // Die Display (Parent Object with Background)
    const dieDisplayPos = k.vec2(START_ZONE_WIDTH / 2, 70);
    const dieDisplay = k.add([
        k.pos(dieDisplayPos),
        k.rect(DIE_SIZE, DIE_SIZE),
        k.color(DIE_BG_COLOR),
        k.anchor("top"),
        k.fixed(), // Added k.
        k.z(99) // Added k.
        // "dieDisplayContainer" // Tag seems redundant
    ]);
    dieDisplay.use("dieDisplayContainer"); // Add tag using .use() if needed

    // Create permanent, hidden dots for the die face
    const dieDotPositions = {
        center: k.vec2(0, 0),
        tl: k.vec2(-DIE_SIZE / 4, -DIE_SIZE / 4),
        tr: k.vec2(DIE_SIZE / 4, -DIE_SIZE / 4),
        bl: k.vec2(-DIE_SIZE / 4, DIE_SIZE / 4),
        br: k.vec2(DIE_SIZE / 4, DIE_SIZE / 4),
        ml: k.vec2(-DIE_SIZE / 4, 0), // Middle-left
        mr: k.vec2(DIE_SIZE / 4, 0) // Middle-right
    };
    const dieDots: { [key: string]: GameObj } = {};
    const centerOffset = k.vec2(0, DIE_SIZE / 2);

    for (const key in dieDotPositions) {
        dieDots[key] = dieDisplay.add([
            k.circle(DIE_DOT_SIZE / 2),
            k.pos(centerOffset.add(dieDotPositions[key as keyof typeof dieDotPositions])),
            k.anchor("center"),
            k.color(DIE_DOT_COLOR),
            k.opacity(0),
            k.z(100), // Added k.
            "dot",
            `dot-${key}`
        ]);
    }

    // Calculate center X of the game zone
    const gameZoneCenterX = GAME_ZONE_X + GAME_ZONE_WIDTH / 2;

    const countdownText = k.add([
        k.text("", { size: 120 }), 
        k.pos(gameZoneCenterX, k.height() / 2), // Centered in game zone horizontally
        k.anchor("center"),
        k.color(k.WHITE),
        k.opacity(0), // Initially hidden
        k.z(200), // On top
        k.fixed()
    ]);

    // --- Helper Function to Draw Die Face ---
    function drawDieFace(num: number | null) {
        // Hide all dots initially
        for (const key in dieDots) {
            dieDots[key].opacity = 0; // Access opacity property directly
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
        drawDieFace(null); // Clear die face
        
        // Calculate spin duration *before* countdown
        const spinDuration = k.rand(3, 9);
        console.log(`Countdown starting... (Spin duration will be: ${spinDuration.toFixed(1)}s)`);

        gameState = 'countdown'; // Set state to countdown
        countdownText.opacity = 1; // Make text visible

        // Countdown function
        function doCountdown(count: number) {
            if (count <= 0) {
                countdownText.opacity = 0; // Hide text
                startDieRoll(spinDuration); // Start the roll
                return;
            }
            
            countdownText.text = String(count);
            k.play("timer");
            k.wait(1, () => doCountdown(count - 1));
        }

        // Start the countdown
        doCountdown(3);
    }

    function startDieRoll(duration: number) {
        gameState = 'rolling'; // Set state to rolling *now*
        console.log("Spinning die...");

        // Assign targets to AI players
        k.get("player").forEach(p => {
            if (p.isAI && !p.isInJail) { 
                p.targetBaseId = k.randi(1, 5); 
                p.aiState = 'moving_to_base';
                console.log(`${p.id} targeting base ${p.targetBaseId}`);
            }
        });
        
        const rollDuration = duration; 
        let spinTimer = 0;
        
        // Sound Setup
        const soundPattern = ["die1", "die1", "die2", "die1", "die1", "die1", "die2", "die1"];
        let soundPatternIndex = 0;
        const dieRollVolume = 0.6; 
        const minSoundInterval = 0.08; 
        const maxSoundInterval = 0.4;  
        let soundWaitHandle: any = null; 
        let previousFlickerNumber: number | null = null; // Track last shown flicker number

        // Recursive Sound and Visual Update Function
        function playSoundAndVisual(intervalWaited: number) {
            // Increment timer by the time we just waited
            spinTimer += intervalWaited;

            // Check if roll duration is over
            if (spinTimer >= rollDuration) {
                // Determine final roll
                rolledNumber = k.randi(1, 7); 
                console.log(`Rolled: ${rolledNumber}`);
                drawDieFace(rolledNumber); // Show final face
                gameState = 'checking';
                k.wait(0.5, checkPlayerPositions);
                soundWaitHandle = null; // Clear handle
                return; // Stop recursion
            }

            // Update visuals (flicker) - Ensure new number is different
            let newFlickerNumber = k.randi(1, 7);
            while (newFlickerNumber === previousFlickerNumber) {
                newFlickerNumber = k.randi(1, 7);
            }
            drawDieFace(newFlickerNumber);
            previousFlickerNumber = newFlickerNumber; // Store the new number

            // Play current sound
            k.play(soundPattern[soundPatternIndex], { volume: dieRollVolume });
            soundPatternIndex = (soundPatternIndex + 1) % soundPattern.length;

            // Calculate progress (0 to 1)
            const progress = k.clamp(spinTimer / rollDuration, 0, 1);
            // Calculate next interval (linear interpolation)
            const nextInterval = minSoundInterval + (maxSoundInterval - minSoundInterval) * progress;

            // Schedule the next sound/visual update
            soundWaitHandle = k.wait(nextInterval, () => playSoundAndVisual(nextInterval)); // Pass the interval we WILL wait
        }

        // Start the Sound/Visual Loop
        playSoundAndVisual(0); // Initial call, waited 0 seconds
    }

    function checkPlayerPositions() {
        console.log("Checking player positions...");
        if (rolledNumber === null) {
            console.error("Checking positions but rolledNumber is null!");
            k.wait(1.5, () => { startRound(); }); 
            return;
        }

        const allPlayers = k.get("player");
        // Store [object, originalColor] pairs
        let objectsToReset = new Set<[GameObj, Color]>(); 

        if (rolledNumber === 6) {
            console.log("Rolled 6! Releasing jail...");
            k.play("released"); 

            const jailZone = k.get("jailZone")[0];
            const isAnyoneInJail = allPlayers.some(p => p.isInJail);
            const flashColor = isAnyoneInJail ? k.GREEN : k.RED;

            // Flash Jail Zone
            if (jailZone) {
                objectsToReset.add([jailZone, COLOR_JAIL]); // Store with original color
                // Start flashing animation for jail
                const flashDuration = 0.15; 
                const flashCount = 3;      
                let currentFlashes = 0;
                let isFlashColor = false;

                const jailFlashLoop = k.loop(flashDuration, () => {
                    if (isFlashColor) {
                        jailZone.color = COLOR_JAIL; // Use original jail color
                        isFlashColor = false;
                        currentFlashes++; 
                    } else {
                        jailZone.color = flashColor; // Use determined flash color (RED/GREEN)
                        isFlashColor = true;
                    }

                    if (currentFlashes >= flashCount) {
                        jailZone.color = flashColor; // End on flash color
                        jailFlashLoop.cancel();
                    }
                });
            }

            // Show JAILBREAK! text only if players are released
            if (isAnyoneInJail) {
                const jailbreakText = k.add([
                    k.text("JAILBREAK!", { size: 80 }),
                    k.pos(gameZoneCenterX, k.height() / 2 - 150), // Centered in game zone horizontally, offset vertically
                    k.anchor("center"),
                    k.color(k.GREEN),
                    k.z(201), // Above countdown/other text
                    k.fixed(),
                    k.lifespan(1.0) // Automatically destroy after 1 second
                ]);
            }
            
            // Release players (after setting up flash)
            allPlayers.forEach(p => {
                if (p.isInJail) {
                    releaseFromJail(p);
                }
            });
        } else {
            console.log(`Checking for players on base ${rolledNumber} or no base...`);
            let playerJailedThisRound = false; 
            const targetBase = k.get(`base${rolledNumber}`)[0]; 
            let safeBasesToFlash = new Set<GameObj>(); 

            // Flash target base red 
            if (targetBase) {
                objectsToReset.add([targetBase, COLOR_BASE]); // Store with original color
                // Flashing using k.loop and k.wait 
                const flashDuration = 0.15; 
                const flashCount = 3;      
                let currentFlashes = 0;
                let isRed = false;

                const flashLoop = k.loop(flashDuration, () => {
                    if (isRed) {
                        targetBase.color = COLOR_BASE;
                        isRed = false;
                        currentFlashes++; 
                    } else {
                        targetBase.color = k.RED;
                        isRed = true;
                    }

                    if (currentFlashes >= flashCount) {
                        targetBase.color = k.RED; 
                        flashLoop.cancel();
                    }
                });
            }

            allPlayers.forEach(p => {
                // Skip players already in jail
                if (p.isInJail) return;
                
                // Skip players in the start zone
                if (p.pos.x < GAME_ZONE_X) { 
                    // console.log(`${p.id} is safe in start zone.`); // Keep log concise
                    return; 
                }

                // Check if player needs to be jailed
                if (p.currentBase === rolledNumber || p.currentBase === null) {
                    console.log(`${p.id} is on base ${p.currentBase}. Rolled ${rolledNumber}. JAILED.`);
                    sendToJail(p);
                    playerJailedThisRound = true; 
                } else {
                    // Player is safe on a *different* base
                    console.log(`${p.id} is safe on base ${p.currentBase}. Rolled ${rolledNumber}.`);
                    const safeBase = k.get(`base${p.currentBase}`)[0];
                    if (safeBase) {
                        safeBasesToFlash.add(safeBase);
                    }
                }
            });

            // Flash safe bases green (using tween fade)
            safeBasesToFlash.forEach(safeBase => {
                if (safeBase !== targetBase) { 
                    safeBase.color = k.GREEN;
                    k.tween(safeBase.color, COLOR_BASE, 0.9, (c) => safeBase.color = c, k.easings.linear);
                }
            });

            // Play success sound
            if (!playerJailedThisRound) {
                k.play("success");
            }
        }

        // Check for game over condition
        const allPlayersAreJailed = allPlayers.every(p => p.isInJail);
        if (allPlayersAreJailed) {
            console.log("Game Over - All players are in jail!");
            gameState = 'gameOver';
            k.add([
                k.text("GAME OVER\nAll players jailed!", { size: 60, align: "center" }),
                k.pos(gameZoneCenterX, k.height() / 2), // Centered in game zone horizontally
                k.anchor("center"),
                k.color(k.RED),
                k.z(200),
                k.fixed()
            ]);
            // Reset colors immediately if game ends here
            objectsToReset.forEach(([obj, originalColor]) => {
                obj.color = originalColor; 
            });
            return; 
        }

        // Wait a bit, then start next round / reset state
        const nextRoundTimer = k.wait(1.5, () => { 
            // Reset colors from the set using their original colors
            objectsToReset.forEach(([obj, originalColor]) => {
                obj.color = originalColor; 
            });

            // Reset AI state
            k.get("player").forEach(p => {
                if (p.isAI) {
                    p.aiState = 'idle';
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
        k.play("jail"); // Play jail sound
        player.isInJail = true;
        player.currentBase = null; // No longer on a base
        player.isMoving = false; // Stop walking animation
        
        // Move to a random spot within the jail boundaries
        const jailPadding = PLAYER_SIZE; // Padding from jail edges
        const randomX = k.rand(GAME_ZONE_X + jailPadding, GAME_ZONE_X + GAME_ZONE_WIDTH - jailPadding); // Added k.
        const randomY = k.rand(JAIL_Y + jailPadding, JAIL_Y + JAIL_HEIGHT - jailPadding); // Added k.
        player.pos = k.vec2(randomX, randomY); // Added k.

        // Optional: Add a visual effect or sound
    }

    function releaseFromJail(player: GameObj) {
        if (!player.isInJail) return; // Not in jail

        console.log(`Releasing ${player.id} from jail!`);
        player.isInJail = false;

        // Move back to a random spot in the player spawn area
        const spawnAreaYStart = JAIL_HEIGHT; // Top Y of spawn area
        const spawnAreaHeight = ARENA_HEIGHT - JAIL_HEIGHT - JAIL_HEIGHT;
        const randomSpawnY = k.rand(spawnAreaYStart + PLAYER_SIZE / 2, spawnAreaYStart + spawnAreaHeight - PLAYER_SIZE / 2); // Added k.
        player.pos = k.vec2(START_ZONE_WIDTH / 2, randomSpawnY); // Added k.

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
        k.fixed(), // Added k.
        "startZoneBg"
    ]);

    // Game Zone Background
    k.add([
        k.rect(GAME_ZONE_WIDTH, ARENA_HEIGHT),
        k.pos(GAME_ZONE_X, 0),
        k.color(COLOR_GAME_ZONE),
        k.fixed(), // Added k.
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
        1: k.vec2(gameZoneCenter.x - baseDist * 0.8, gameZoneCenter.y - baseDist * 0.7),
        2: k.vec2(gameZoneCenter.x + baseDist * 0.8, gameZoneCenter.y - baseDist * 0.7),
        3: k.vec2(gameZoneCenter.x, gameZoneCenter.y),
        4: k.vec2(gameZoneCenter.x - baseDist * 0.8, gameZoneCenter.y + baseDist * 0.7),
        5: k.vec2(gameZoneCenter.x + baseDist * 0.8, gameZoneCenter.y + baseDist * 0.7)
    };

    // Draw Bases
    for (let i = 1; i <= 5; i++) {
        const pos = basePositions[i];
        k.add([
            k.rect(BASE_SIZE, BASE_SIZE),
            k.pos(pos),
            k.anchor("center"),
            k.color(COLOR_BASE),
            k.area(), // Added k.
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
        k.area(), // Added k.
        k.fixed(), // Added k.
        "jailZone"
    ]);
    const jailTextVerticalAdjustment = 15; // Pixels to move text up
    k.add([
        k.text("JAIL", { size: 50 }),
        k.pos(GAME_ZONE_X + GAME_ZONE_WIDTH / 2, JAIL_Y + JAIL_HEIGHT / 2 - jailTextVerticalAdjustment), // Adjusted Y
        k.anchor("center"),
        k.color(COLOR_TEXT),
        k.fixed()
    ]);
    // Add instructional text below JAIL
    const jailInstructionYOffset = 40; // Original offset from JAIL center
    k.add([
        k.text("Roll a 6 to break out!", { size: 24 }),
        k.pos(GAME_ZONE_X + GAME_ZONE_WIDTH / 2, JAIL_Y + JAIL_HEIGHT / 2 + jailInstructionYOffset - jailTextVerticalAdjustment), // Adjusted Y
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
    players["p1"] = spawnPlayer(k, "p1", k.vec2(playerSpawnX, currentSpawnY + PLAYER_SIZE / 2), PLAYER_COLOR_P1, false); // Added k.
    currentSpawnY += PLAYER_SIZE + playerSpacing;

    // Spawn Player 2 if selected
    if (numPlayers === 2) {
        players["p2"] = spawnPlayer(k, "p2", k.vec2(playerSpawnX, currentSpawnY + PLAYER_SIZE / 2), PLAYER_COLOR_P2, false); // Added k.
        currentSpawnY += PLAYER_SIZE + playerSpacing;
    }

    // Spawn AI Players
    for (let i = 0; i < numAI; i++) {
        const aiId = `ai${i + 1}`;
        const spawnPos = k.vec2(playerSpawnX, currentSpawnY + PLAYER_SIZE / 2); // Added k.
        const aiPlayer = spawnPlayer(k, aiId, spawnPos, PLAYER_COLOR_AI, true);
        players[aiId] = aiPlayer;

        // Assign initial target immediately
        aiPlayer.targetBaseId = k.randi(1, 5); // Added k.
        aiPlayer.aiState = 'moving_to_base';
        console.log(`${aiId} targeting base ${aiPlayer.targetBaseId} initially.`);
        
        currentSpawnY += PLAYER_SIZE + playerSpacing;
    }

    // P1 Rotation
    k.onKeyDown("left", () => { // Added k.
        players["p1"].angle -= PLAYER_ROTATION_SPEED * k.dt(); // Added k.
    });
    k.onKeyDown("right", () => { // Added k.
        players["p1"].angle += PLAYER_ROTATION_SPEED * k.dt(); // Added k.
    });

    // P1 Forward/Backward Movement & Animation Trigger
    k.onKeyDown("up", () => { // Added k.
        const moveDir = k.Vec2.fromAngle(players["p1"].angle); // Added k.
        players["p1"].move(moveDir.scale(PLAYER_SPEED));
        players["p1"].isMoving = true;
    });
    k.onKeyDown("down", () => { // Added k.
        const moveDir = k.Vec2.fromAngle(players["p1"].angle); // Added k.
        players["p1"].move(moveDir.scale(-PLAYER_SPEED));
        players["p1"].isMoving = true;
    });
    
    // Stop P1 animation when movement keys released
    const checkStopMovingP1 = () => {
        if (!k.isKeyDown("up") && !k.isKeyDown("down")) { // Added k. twice
            players["p1"].isMoving = false;
        }
    };
    k.onKeyRelease("up", checkStopMovingP1); // Added k.
    k.onKeyRelease("down", checkStopMovingP1); // Added k.

    // P2 Controls (WASD) - Only if P2 exists
    if (numPlayers === 2) {
        // P2 Rotation
        k.onKeyDown("a", () => { // Added k.
            players["p2"].angle -= PLAYER_ROTATION_SPEED * k.dt(); // Added k.
        });
        k.onKeyDown("d", () => { // Added k.
            players["p2"].angle += PLAYER_ROTATION_SPEED * k.dt(); // Added k.
        });
        // P2 Forward/Backward Movement & Animation Trigger
        k.onKeyDown("w", () => { // Added k.
            const moveDir = k.Vec2.fromAngle(players["p2"].angle); // Added k.
            players["p2"].move(moveDir.scale(PLAYER_SPEED));
            players["p2"].isMoving = true;
        });
        k.onKeyDown("s", () => { // Added k.
            const moveDir = k.Vec2.fromAngle(players["p2"].angle); // Added k.
            players["p2"].move(moveDir.scale(-PLAYER_SPEED));
            players["p2"].isMoving = true;
        });
        // Stop P2 animation when movement keys released
        const checkStopMovingP2 = () => {
            if (!k.isKeyDown("w") && !k.isKeyDown("s")) { // Added k. twice
                players["p2"].isMoving = false;
            }
        };
        k.onKeyRelease("w", checkStopMovingP2); // Added k.
        k.onKeyRelease("s", checkStopMovingP2); // Added k.
    }

    // --- Update Player Logic (Animation and Boundaries) ---
    const animSpeed = 16; // Increase swing speed (was 8)
    const animDist = 10; // Increase oscillation magnitude (was 5)

    k.onUpdate("player", (p) => { // Added k.
        // --- Animation ---
        const topLimb = p.topLimb;
        const bottomLimb = p.bottomLimb;
        const upperFoot = p.upperFoot;
        const lowerFoot = p.lowerFoot;

        if (topLimb && bottomLimb && upperFoot && lowerFoot) { // Check all limbs/feet exist
            if (p.isMoving) {
                p.animTimer += k.dt() * animSpeed; // Added k.
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
                const targetBase = k.get(`base${targetBaseId}`)[0]; // Added k.
                if (targetBase) {
                    const targetPos = targetBase.pos;
                    const distanceToTarget = p.pos.dist(targetPos); // .dist() is a Vec2 method
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
                        const direction = targetPos.sub(p.pos).unit(); // .sub() and .unit() are Vec2 methods
                        
                        // --- Add instant rotation --- 
                        p.angle = direction.angle(); // .angle() is a Vec2 method
                        // --- End add instant rotation ---

                        // Move forward
                        p.move(direction.scale(PLAYER_SPEED)); // .scale() is a Vec2 method
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
            const base = k.get(`base${i}`)[0]; // Added k.
            if (base && p.isColliding(base)) { // Added k.
                onBaseId = i;
                break; // Found a base, no need to check others
            }
        }
        p.currentBase = onBaseId; // Update the player's state

        // --- Boundary Constraints ---
        const halfPlayer = PLAYER_SIZE / 2;

        // 1. General Screen Bounds
        p.pos.x = k.clamp(p.pos.x, halfPlayer, ARENA_WIDTH - halfPlayer); // Added k.
        p.pos.y = k.clamp(p.pos.y, halfPlayer, ARENA_HEIGHT - halfPlayer); // Added k.

        // 2. Jail Zone Specific Constraints
        if (p.isInJail) {
            // Confine player *within* jail bounds
            p.pos.x = k.clamp(p.pos.x, GAME_ZONE_X + halfPlayer, ARENA_WIDTH - halfPlayer); // Added k.
            p.pos.y = k.clamp(p.pos.y, JAIL_Y + halfPlayer, ARENA_HEIGHT - halfPlayer); // Added k.
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
    k.onKeyPress("escape", () => { // Added k.
        k.go("menu"); // Added k.
    });
});

// Start the menu scene
k.go("menu"); // Added k. 