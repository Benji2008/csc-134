// ============================================================================
//  M6LAB2: The Dungeon Map — Adjacency List
//  CSC 134 — Module 6: Arrays
//  Name: Benji
//  Theme: Skylanders — Skylands Adventure
// ============================================================================
//
//  THE BIG IDEA
//  ------------
//  Skylands has 8 floating islands. Islands connect via N / E / S / W.
//  We need a way to answer: "If I'm on island X and I fly north, where do
//  I end up?"
//
//  The answer: an ADJACENCY LIST stored as a 2D array.
//      connections[fromRoom][direction] = destination island
//
//  We also use PARALLEL ARRAYS to hold each island's name, description,
//  NPC dialogue, and item — same index in every array = same island.
//
//
//  THE MAP
//  -------
//
//                      [ DRAGON'S PEAK ]
//                             |
//                             N
//                             |
//   [ DARK WATER COVE ]--W--[ SHATTERED ISLAND ]--E--[ PERILOUS PASTURES ]
//                             |
//                             S
//                      [ STONETOWN ]
//                             |
//                      W             E
//                      |             |
//              [ FALLING FOREST ]  [ CREEPY CITADEL ] (locked — needs Rune Key)
//                             |
//                             S
//                      [ LAIR OF KAOS ]
//
//  Start: SHATTERED ISLAND. Explore with n / e / s / w.
//  Commands: look, take, talk, quit
//
//
//  FUTURE REFACTOR NOTE
//  --------------------
//  Once we cover structs, each island can become a single struct with fields
//  for name, description, NPC, item, and locked exits. For now, parallel
//  arrays keep everything easy to see and change in one pass.
// ============================================================================

#include <iostream>
#include <string>
using namespace std;

// ---------------------------------------------------------------------------
//  Named constants (enums). Makes indexing read like English.
//  SHATTERED_ISLAND = 0, DRAGONS_PEAK = 1, etc.
// ---------------------------------------------------------------------------
enum Direction {
    NORTH          = 0,
    EAST           = 1,
    SOUTH          = 2,
    WEST           = 3,
    NUM_DIRECTIONS = 4
};

enum Room {
    SHATTERED_ISLAND  = 0,
    DRAGONS_PEAK      = 1,
    PERILOUS_PASTURES = 2,
    STONETOWN         = 3,
    FALLING_FOREST    = 4,
    CREEPY_CITADEL    = 5,
    DARK_WATER_COVE   = 6,
    LAIR_OF_KAOS      = 7,
    NUM_ROOMS         = 8
};

const int NO_CONNECTION = -1;   // Sentinel: no path in that direction.

// ---------------------------------------------------------------------------
//  Function prototypes — prototypes at top, main next, definitions last.
// ---------------------------------------------------------------------------
void printRoom (const string names[], const string descriptions[], int room);
void printExits(int connections[][NUM_DIRECTIONS], int room,
                bool locked[][NUM_DIRECTIONS]);
void printItem (const string itemNames[], const bool hasItem[], int room);
void printNPC  (const string npcDialogue[], int room);
int  commandToDirection(const string& cmd);

// ===========================================================================
//  main
// ===========================================================================
int main()
{
    // -----------------------------------------------------------------------
    //  PARALLEL ARRAY SET 1 — Island names and descriptions (by Room index)
    //  roomNames[STONETOWN] and roomDescriptions[STONETOWN] = same island.
    // -----------------------------------------------------------------------
    string roomNames[NUM_ROOMS] = {
        "Shattered Island",    // SHATTERED_ISLAND
        "Dragon's Peak",       // DRAGONS_PEAK
        "Perilous Pastures",   // PERILOUS_PASTURES
        "Stonetown",           // STONETOWN
        "Falling Forest",      // FALLING_FOREST
        "Creepy Citadel",      // CREEPY_CITADEL
        "Dark Water Cove",     // DARK_WATER_COVE
        "Lair of Kaos"         // LAIR_OF_KAOS
    };

    string roomDescriptions[NUM_ROOMS] = {
        // SHATTERED_ISLAND — hub/start
        "Huge chunks of rock float in every direction, held up by pure magic. "
        "The sky smells like lightning. This is where it all begins.",

        // DRAGONS_PEAK
        "A frozen summit crowned by the bones of ancient dragons. "
        "Sunlight barely reaches this far up, but the view of Skylands is unreal.",

        // PERILOUS_PASTURES
        "Wide open fields drifting on a sunny island. Haystacks, sheep, "
        "and Drow towers that really ruin the vibe.",

        // STONETOWN
        "Thick stone walls and cobblestone streets cut through a fortress town. "
        "Troll guards stopped showing up weeks ago. Now it's just echoes.",

        // FALLING_FOREST
        "Trees lean at wild angles, roots dangling over the edge into the clouds. "
        "Something keeps knocking the branches together even when there's no wind.",

        // CREEPY_CITADEL
        "Iron gates. Crooked towers. Floating candles that follow you around. "
        "Even the Undead Skylanders say this place gives them the creeps.",

        // DARK_WATER_COVE
        "Black water laps at stone docks. The ships here went somewhere "
        "and never came back. Their lanterns are still lit.",

        // LAIR_OF_KAOS
        "Kaos is gone, but his throne room is still crackling with dark energy. "
        "Masks of his face line the walls. Every single one is watching you."
    };

    // -----------------------------------------------------------------------
    //  PARALLEL ARRAY SET 2 — NPC dialogue (by Room index)
    //  Empty string = nobody home. Non-empty = print when player enters.
    //  'talk' command lets the player hear it again.
    //  We'll fold this into a Room struct once we cover that chapter.
    // -----------------------------------------------------------------------
    string npcDialogue[NUM_ROOMS] = {
        // SHATTERED_ISLAND
        "Master Eon's voice echoes through the portal: \"Benji! "
        "The Rune Key is somewhere in the Falling Forest. Find it!\"",

        // DRAGONS_PEAK
        "A frost dragon opens one enormous eye. \"The Skylanders came through "
        "here once. They left in a hurry. I wonder why.\"",

        // PERILOUS_PASTURES
        "Cali waves from a hay bale: \"I already got rescued today, "
        "but thanks for showing up, Benji!\"",

        // STONETOWN
        "Flynn leans on a broken wall: \"Bro, I flew my balloon right "
        "into a Troll checkpoint. Do NOT go east without a key.\"",

        // FALLING_FOREST
        "",    // No NPC — but the Rune Key is hidden here

        // CREEPY_CITADEL
        "A ghost in Skylanders armor drifts over: \"Finally, a visitor. "
        "The darkness here has been awfully boring without someone to haunt.\"",

        // DARK_WATER_COVE
        "A Gillman fisherman squints at you: \"Heard some Skylanders "
        "went into the Lair. Smart ones didn't.\"",

        // LAIR_OF_KAOS
        "The dark energy crackles into a shape. It whispers: "
        "\"He will return. They always return.\""
    };

    // -----------------------------------------------------------------------
    //  PARALLEL ARRAY SET 3 — Items (by Room index)
    //  hasItem[r]   = true if the item hasn't been picked up yet.
    //  itemNames[r] = what the item is called.
    //  Also shares the Room index. Will become a struct field later.
    // -----------------------------------------------------------------------
    bool   hasItem  [NUM_ROOMS] = { false, false, false, false,
                                    true,  false, false, false };
    string itemNames[NUM_ROOMS] = {
        "",           // SHATTERED_ISLAND
        "",           // DRAGONS_PEAK
        "",           // PERILOUS_PASTURES
        "",           // STONETOWN
        "Rune Key",   // FALLING_FOREST  <-- the key item
        "",           // CREEPY_CITADEL
        "",           // DARK_WATER_COVE
        ""            // LAIR_OF_KAOS
    };

    bool playerHasRuneKey = false;   // Tracks whether Benji picked up the key.

    // -----------------------------------------------------------------------
    //  THE ADJACENCY TABLE (2D array)
    //  connections[fromIsland][direction] = destination, or NO_CONNECTION.
    // -----------------------------------------------------------------------
    int connections[NUM_ROOMS][NUM_DIRECTIONS];

    // Fill every cell with NO_CONNECTION first — clean slate.
    for (int r = 0; r < NUM_ROOMS; r++)
        for (int d = 0; d < NUM_DIRECTIONS; d++)
            connections[r][d] = NO_CONNECTION;

    // Wire up the map from the header comment (both sides of every path).
    connections[SHATTERED_ISLAND][NORTH]    = DRAGONS_PEAK;
    connections[DRAGONS_PEAK][SOUTH]        = SHATTERED_ISLAND; // back

    connections[SHATTERED_ISLAND][EAST]     = PERILOUS_PASTURES;
    connections[PERILOUS_PASTURES][WEST]    = SHATTERED_ISLAND; // back

    connections[SHATTERED_ISLAND][WEST]     = DARK_WATER_COVE;
    connections[DARK_WATER_COVE][EAST]      = SHATTERED_ISLAND; // back

    connections[SHATTERED_ISLAND][SOUTH]    = STONETOWN;
    connections[STONETOWN][NORTH]           = SHATTERED_ISLAND; // back

    connections[STONETOWN][WEST]            = FALLING_FOREST;
    connections[FALLING_FOREST][EAST]       = STONETOWN;        // back

    connections[FALLING_FOREST][SOUTH]      = LAIR_OF_KAOS;
    connections[LAIR_OF_KAOS][NORTH]        = FALLING_FOREST;   // back

    // Creepy Citadel is locked — the path exists but is blocked until
    // Benji finds the Rune Key in the Falling Forest.
    connections[STONETOWN][EAST]            = CREEPY_CITADEL;
    connections[CREEPY_CITADEL][WEST]       = STONETOWN;        // also locked

    // -----------------------------------------------------------------------
    //  LOCK ARRAY — isLocked[island][direction]
    //  true = blocked until player has the Rune Key.
    //  Parallel to connections; same indices = same doorway.
    //  Will become a struct field once we get to that chapter.
    // -----------------------------------------------------------------------
    bool isLocked[NUM_ROOMS][NUM_DIRECTIONS];
    for (int r = 0; r < NUM_ROOMS; r++)
        for (int d = 0; d < NUM_DIRECTIONS; d++)
            isLocked[r][d] = false;

    // Both sides of the Stonetown-Citadel gate are sealed by Kaos's rune.
    isLocked[STONETOWN][EAST]        = true;
    isLocked[CREEPY_CITADEL][WEST]   = true;

    // -----------------------------------------------------------------------
    //  Game state
    // -----------------------------------------------------------------------
    int  currentRoom = SHATTERED_ISLAND;
    bool running     = true;

    cout << "============================================" << endl;
    cout << "   BENJI'S SKYLANDERS: SKYLANDS ADVENTURE" << endl;
    cout << "============================================" << endl;
    cout << "Commands: north/south/east/west  (or n/s/e/w)" << endl;
    cout << "          look  — look around again" << endl;
    cout << "          take  — pick up an item here" << endl;
    cout << "          talk  — talk to whoever is here" << endl;
    cout << "          quit  — return to the portal" << endl;
    cout << "============================================" << endl;

    // -----------------------------------------------------------------------
    //  Game loop
    // -----------------------------------------------------------------------
    while (running)
    {
        printRoom(roomNames, roomDescriptions, currentRoom);
        printItem(itemNames, hasItem, currentRoom);
        printNPC (npcDialogue, currentRoom);
        printExits(connections, currentRoom, isLocked);

        cout << "\n> ";
        string command;
        cin >> command;

        // -- Non-movement commands --
        if (command == "quit" || command == "q")
        {
            running = false;
            continue;
        }

        if (command == "look" || command == "l")
        {
            continue;   // Top of loop re-prints everything.
        }

        if (command == "take" || command == "t")
        {
            if (hasItem[currentRoom])
            {
                if (itemNames[currentRoom] == "Rune Key")
                    playerHasRuneKey = true;

                cout << "You grab the " << itemNames[currentRoom] << "!" << endl;
                hasItem[currentRoom] = false;

                if (playerHasRuneKey)
                {
                    // Unlock both sides of the Citadel gate.
                    isLocked[STONETOWN][EAST]      = false;
                    isLocked[CREEPY_CITADEL][WEST] = false;
                    cout << "The Rune Key glows and a distant gate SLAMS open." << endl;
                }
            }
            else
            {
                cout << "Nothing to pick up here." << endl;
            }
            continue;
        }

        if (command == "talk")
        {
            if (!npcDialogue[currentRoom].empty())
                cout << "\n" << npcDialogue[currentRoom] << endl;
            else
                cout << "Nobody around to talk to." << endl;
            continue;
        }

        // -- Movement commands --
        int direction = commandToDirection(command);
        if (direction == -1)
        {
            cout << "Don't know how to '" << command << "'." << endl;
            continue;
        }

        int next = connections[currentRoom][direction];

        if (next == NO_CONNECTION)
        {
            cout << "Nothing but open sky that way." << endl;
        }
        else if (isLocked[currentRoom][direction])
        {
            cout << "A rune-sealed gate blocks the path. "
                 << "You need the Rune Key." << endl;
        }
        else
        {
            currentRoom = next;
        }
    }

    cout << "\nBenji steps back through the portal. Skylands will have to wait." << endl;
    return 0;
}

// ===========================================================================
//  Function definitions
// ===========================================================================

// Print the island name and description.
// const promises we won't modify the arrays — good habit for read-only data.
void printRoom(const string names[], const string descriptions[], int room)
{
    cout << "\n[ " << names[room] << " ]" << endl;
    cout << descriptions[room] << endl;
}

// Print all exits from this island. Locked exits show [LOCKED] so the player
// knows the path exists but needs a key.
//
// 2D parameter note: the compiler needs the inner size to do row math,
// so we must write [][NUM_DIRECTIONS].
void printExits(int connections[][NUM_DIRECTIONS], int room,
                bool locked[][NUM_DIRECTIONS])
{
    const string dirNames[NUM_DIRECTIONS] = { "north", "east", "south", "west" };

    cout << "Exits: ";
    bool any = false;
    for (int d = 0; d < NUM_DIRECTIONS; d++)
    {
        if (connections[room][d] != NO_CONNECTION)
        {
            if (any) cout << ", ";
            cout << dirNames[d];
            if (locked[room][d]) cout << " [LOCKED]";
            any = true;
        }
    }
    if (!any) cout << "(none)";
    cout << endl;
}

// Print the item if one is still in this room.
void printItem(const string itemNames[], const bool hasItem[], int room)
{
    if (hasItem[room])
        cout << "You spot something: " << itemNames[room] << "." << endl;
}

// Print ambient NPC line on entry if one is present (non-empty string).
// Player can 'talk' to hear it again.
void printNPC(const string npcDialogue[], int room)
{
    if (!npcDialogue[room].empty())
        cout << npcDialogue[room] << endl;
}

// Convert a typed command to a direction index (0-3) or -1 if unknown.
// Keeps the game loop clean instead of four repeated if/else blocks.
int commandToDirection(const string& cmd)
{
    if (cmd == "north" || cmd == "n") return NORTH;
    if (cmd == "east"  || cmd == "e") return EAST;
    if (cmd == "south" || cmd == "s") return SOUTH;
    if (cmd == "west"  || cmd == "w") return WEST;
    return -1;
}