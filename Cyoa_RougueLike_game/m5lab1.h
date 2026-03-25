#ifndef M5LAB1_H
#define M5LAB1_H

// m5lab1.h
// DELVE - A Roguelike Choose Your Own Adventure
// Header file containing all structs, globals, prototypes, and function definitions.

#include <iostream>
#include <string>
#include <cstdlib>
#include <ctime>
using namespace std;

// ============================================================
// GLOBAL PLAYER STATE (roguelike stats)
// ============================================================
struct Player {
    string name;
    string class_name;
    int hp;
    int max_hp;
    int attack;
    int defense;
    int gold;
    int floor;
    int xp;
    int level;
    bool has_torch;
    bool has_rope;
    bool has_potion;
    bool alive;
};

Player player;

// ============================================================
// FUNCTION PROTOTYPES
// ============================================================
void display_stats();
void display_divider();
void log_event(string msg);
int get_choice(int max_options);
int roll_dice(int sides);
bool combat_check(int enemy_attack, int enemy_defense, string enemy_name);

// Story branches
void start_game();
void choose_class();
void floor_start();
void main_menu();

void encounter_merchant();
void encounter_monster();
void encounter_trap();
void encounter_treasure();
void encounter_shrine();
void encounter_boss();

void path_left_corridor();
void path_right_corridor();
void path_center_stairs();

void choice_fight(int enemy_hp, int enemy_atk, int enemy_def, string name, int xp_reward, int gold_reward);
void choice_flee();
void use_potion();
void game_over();
void victory();

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

void display_divider() {
    cout << "\n========================================\n";
}

void display_stats() {
    cout << "\n----------------------------------------\n";
    cout << " " << player.name << " the " << player.class_name;
    cout << "  |  Floor: " << player.floor << "  |  Level: " << player.level << "\n";
    cout << " HP: " << player.hp << "/" << player.max_hp;
    cout << "  ATK: " << player.attack;
    cout << "  DEF: " << player.defense;
    cout << "  Gold: " << player.gold << "g\n";
    cout << " XP: " << player.xp;
    cout << "  Items: ";
    if (player.has_torch)  cout << "[Torch] ";
    if (player.has_rope)   cout << "[Rope] ";
    if (player.has_potion) cout << "[Potion] ";
    if (!player.has_torch && !player.has_rope && !player.has_potion) cout << "None";
    cout << "\n----------------------------------------\n";
}

void log_event(string msg) {
    cout << "  >> " << msg << "\n";
}

// Input validation - loops until player gives a valid choice 1..max_options
int get_choice(int max_options) {
    int choice;
    while (true) {
        cout << "\nYour choice: ";
        if (cin >> choice && choice >= 1 && choice <= max_options) {
            return choice;
        }
        cin.clear();
        cin.ignore(1000, '\n');
        cout << "  [Invalid] Enter a number between 1 and " << max_options << ".\n";
    }
}

// Roll a random die
int roll_dice(int sides) {
    return (rand() % sides) + 1;
}

// ============================================================
// COMBAT SYSTEM
// ============================================================

// Returns true if player wins, false if player dies or flees
void choice_fight(int enemy_hp, int enemy_atk, int enemy_def, string name, int xp_reward, int gold_reward) {
    cout << "\n  *** COMBAT: " << player.name << " vs " << name << " ***\n";

    int p_hp = player.hp;
    int e_hp = enemy_hp;

    while (p_hp > 0 && e_hp > 0) {
        // Player attacks
        int p_dmg = max(1, player.attack + roll_dice(6) - enemy_def);
        e_hp -= p_dmg;
        cout << "  You deal " << p_dmg << " damage to " << name << ". (" << max(0,e_hp) << " HP left)\n";

        if (e_hp <= 0) break;

        // Enemy attacks
        int e_dmg = max(1, enemy_atk + roll_dice(4) - player.defense);
        p_hp -= e_dmg;
        cout << "  " << name << " deals " << e_dmg << " damage to you. (" << max(0,p_hp) << " HP left)\n";
    }

    player.hp = p_hp;

    if (player.hp <= 0) {
        player.hp = 0;
        player.alive = false;
        cout << "\n  You have been slain by " << name << "...\n";
        game_over();
    } else {
        cout << "\n  You defeated " << name << "!\n";
        player.xp += xp_reward;
        player.gold += gold_reward;
        log_event("Gained " + to_string(xp_reward) + " XP and " + to_string(gold_reward) + " gold.");

        // Level up check
        if (player.xp >= player.level * 20) {
            player.level++;
            player.max_hp += 5;
            player.hp = min(player.hp + 5, player.max_hp);
            player.attack++;
            log_event("LEVEL UP! Now level " + to_string(player.level) + ". ATK and HP increased!");
        }
    }
}

void choice_flee() {
    int roll = roll_dice(6);
    if (roll >= 3) {
        log_event("You escaped successfully!");
        // Small penalty
        int gold_lost = roll_dice(4);
        player.gold = max(0, player.gold - gold_lost);
        if (gold_lost > 0) log_event("You dropped " + to_string(gold_lost) + " gold while fleeing.");
    } else {
        log_event("You failed to flee! The enemy strikes you.");
        int dmg = max(1, roll_dice(6) - player.defense);
        player.hp -= dmg;
        log_event("You took " + to_string(dmg) + " damage. HP: " + to_string(player.hp) + "/" + to_string(player.max_hp));
        if (player.hp <= 0) {
            player.alive = false;
            game_over();
        }
    }
}

void use_potion() {
    if (player.has_potion) {
        int heal = 10 + roll_dice(8);
        player.hp = min(player.hp + heal, player.max_hp);
        player.has_potion = false;
        log_event("You drank the potion and recovered " + to_string(heal) + " HP.");
    } else {
        log_event("You have no potions!");
    }
}

// ============================================================
// DEATH / VICTORY
// ============================================================

void game_over() {
    display_divider();
    cout << "\n\n  ██████╗ ███████╗ █████╗ ██████╗ \n";
    cout << "  ██╔══██╗██╔════╝██╔══██╗██╔══██╗\n";
    cout << "  ██║  ██║█████╗  ███████║██║  ██║\n";
    cout << "  ██║  ██║██╔══╝  ██╔══██║██║  ██║\n";
    cout << "  ██████╔╝███████╗██║  ██║██████╔╝\n";
    cout << "  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝ \n\n";
    cout << "  " << player.name << " fell on Floor " << player.floor << ".\n";
    cout << "  Final Level: " << player.level << "  |  Gold: " << player.gold << "g  |  XP: " << player.xp << "\n";
    cout << "\n  The dungeon claims another soul...\n";
    display_divider();
    cout << "\n  Play again? (1) Yes  (2) No\n";
    int c = get_choice(2);
    if (c == 1) start_game();
    else cout << "\n  Farewell, adventurer.\n\n";
}

void victory() {
    display_divider();
    cout << "\n  *** VICTORY! ***\n\n";
    cout << "  " << player.name << " the " << player.class_name << " has conquered the dungeon!\n";
    cout << "  Final Level: " << player.level << "  |  Gold: " << player.gold << "g  |  XP: " << player.xp << "\n";
    display_divider();
    cout << "\n  Play again? (1) Yes  (2) No\n";
    int c = get_choice(2);
    if (c == 1) start_game();
    else cout << "\n  Well done, adventurer.\n\n";
}

// ============================================================
// RANDOM ENCOUNTERS
// ============================================================

void encounter_merchant() {
    display_divider();
    cout << "\n  A hooded merchant sits beside a lantern.\n";
    cout << "  \"Wares for the weary, traveller. Gold for your life.\"\n\n";
    cout << "  1) Buy Healing Potion (8g) - restore HP in battle\n";
    cout << "  2) Buy Rope (5g) - useful for certain paths\n";
    cout << "  3) Buy Torch (5g) - light the darkness\n";
    cout << "  4) Leave\n";
    display_stats();

    int c = get_choice(4);
    if (c == 1) {
        if (player.gold >= 8) {
            player.gold -= 8;
            player.has_potion = true;
            log_event("Purchased a Healing Potion.");
        } else log_event("Not enough gold!");
    } else if (c == 2) {
        if (player.gold >= 5) {
            player.gold -= 5;
            player.has_rope = true;
            log_event("Purchased a Rope.");
        } else log_event("Not enough gold!");
    } else if (c == 3) {
        if (player.gold >= 5) {
            player.gold -= 5;
            player.has_torch = true;
            log_event("Purchased a Torch.");
        } else log_event("Not enough gold!");
    } else {
        log_event("You move on.");
    }
}

void encounter_monster() {
    if (!player.alive) return;
    // Random enemy based on floor
    string names[] = {"Skeleton", "Giant Rat", "Cave Troll", "Shadow Wraith", "Stone Golem"};
    int idx = min(player.floor - 1, 4);
    string name = names[idx];
    int e_hp  = 6 + player.floor * 4 + roll_dice(4);
    int e_atk = 1 + player.floor;
    int e_def = player.floor / 2;
    int xp_r  = 8 + player.floor * 3;
    int gold_r = roll_dice(4) + player.floor * 2;

    display_divider();
    cout << "\n  A " << name << " blocks your path!\n";
    cout << "  Enemy HP: " << e_hp << "  ATK: " << e_atk << "  DEF: " << e_def << "\n\n";
    cout << "  1) Fight\n";
    cout << "  2) Flee (roll 3+ on d6 to escape)\n";
    if (player.has_potion) cout << "  3) Drink Potion first, then fight\n";
    display_stats();

    int max_c = player.has_potion ? 3 : 2;
    int c = get_choice(max_c);

    if (c == 3 && player.has_potion) {
        use_potion();
        choice_fight(e_hp, e_atk, e_def, name, xp_r, gold_r);
    } else if (c == 2) {
        choice_flee();
    } else {
        choice_fight(e_hp, e_atk, e_def, name, xp_r, gold_r);
    }
}

void encounter_trap() {
    display_divider();
    int roll = roll_dice(6);
    if (player.has_torch || player.has_rope) {
        cout << "\n  You spot a pressure plate in the floor ahead.\n";
        if (player.has_torch) {
            cout << "  Your torch illuminates a safe path around it.\n";
            log_event("Trap avoided thanks to your Torch!");
        } else {
            cout << "  You use your rope to trigger it from a distance.\n";
            log_event("Trap triggered safely with Rope!");
        }
    } else if (roll >= 4) {
        cout << "\n  You barely notice the tripwire in time!\n";
        log_event("Trap avoided by luck! (rolled " + to_string(roll) + ")");
    } else {
        cout << "\n  CLICK. Darts fly from the wall!\n";
        int dmg = roll_dice(6) + 2;
        player.hp -= dmg;
        log_event("Trap hit you for " + to_string(dmg) + " damage! HP: " + to_string(player.hp) + "/" + to_string(player.max_hp));
        if (player.hp <= 0) { player.alive = false; game_over(); }
    }
}

void encounter_treasure() {
    display_divider();
    cout << "\n  A dusty chest sits in the corner.\n\n";
    cout << "  1) Open it\n";
    cout << "  2) Leave it (it might be trapped)\n";
    display_stats();

    int c = get_choice(2);
    if (c == 1) {
        int roll = roll_dice(6);
        if (roll >= 2) {
            int gold = roll_dice(10) + player.floor * 3;
            player.gold += gold;
            log_event("Found " + to_string(gold) + " gold!");
            if (roll >= 5) {
                player.has_potion = true;
                log_event("Also found a Healing Potion!");
            }
        } else {
            int dmg = roll_dice(6);
            player.hp -= dmg;
            log_event("Mimic! It bites you for " + to_string(dmg) + " damage!");
            if (player.hp <= 0) { player.alive = false; game_over(); }
        }
    } else {
        log_event("You leave the chest alone.");
    }
}

void encounter_shrine() {
    display_divider();
    cout << "\n  A glowing shrine hums with ancient power.\n";
    cout << "  The inscription reads: 'Offer your gold or your blood.'\n\n";
    cout << "  1) Offer 10 gold (gain +3 ATK permanently)\n";
    cout << "  2) Offer HP (sacrifice 5 HP, gain +10 max HP)\n";
    cout << "  3) Ignore the shrine\n";
    display_stats();

    int c = get_choice(3);
    if (c == 1) {
        if (player.gold >= 10) {
            player.gold -= 10;
            player.attack += 3;
            log_event("The shrine grants you power! ATK +" + to_string(3));
        } else log_event("Not enough gold to offer.");
    } else if (c == 2) {
        if (player.hp > 6) {
            player.hp -= 5;
            player.max_hp += 10;
            log_event("The shrine expands your life force! Max HP +10.");
        } else log_event("You are too weak to make this offering.");
    } else {
        log_event("You walk past the shrine.");
    }
}

void encounter_boss() {
    display_divider();
    cout << "\n  *** BOSS ENCOUNTER ***\n\n";
    cout << "  The dungeon shakes. A massive creature rises from the shadows.\n";
    cout << "  DUNGEON WARDEN - Ancient guardian of the deep.\n\n";

    int b_hp  = 30 + player.floor * 8;
    int b_atk = 3 + player.floor * 2;
    int b_def = 2 + player.floor;

    cout << "  Boss HP: " << b_hp << "  ATK: " << b_atk << "  DEF: " << b_def << "\n\n";
    cout << "  1) Fight the Warden\n";
    cout << "  2) Drink potion first, then fight\n";
    if (!player.has_potion) cout << "  (No potion available)\n";
    display_stats();

    int max_c = player.has_potion ? 2 : 1;
    int c = get_choice(max_c);

    if (c == 2 && player.has_potion) use_potion();
    choice_fight(b_hp, b_atk, b_def, "Dungeon Warden", 50 + player.floor * 10, 20 + player.floor * 5);

    if (player.alive) {
        if (player.floor >= 5) {
            victory();
        } else {
            log_event("The Warden's key drops to the floor. The next floor awaits.");
            player.floor++;
            floor_start();
        }
    }
}

// ============================================================
// PATH BRANCHES
// ============================================================

void path_left_corridor() {
    display_divider();
    cout << "\n  The left corridor is narrow and dark.\n";

    if (!player.has_torch) {
        cout << "  Without a torch, you stumble in the pitch black.\n";
        int roll = roll_dice(6);
        if (roll <= 2) {
            int dmg = roll_dice(4);
            player.hp -= dmg;
            log_event("You walked into a wall! Took " + to_string(dmg) + " damage.");
            if (player.hp <= 0) { player.alive = false; game_over(); return; }
        }
    } else {
        cout << "  Your torch lights the way. You spot something...\n";
    }

    // Random encounter in left path
    int roll = roll_dice(4);
    if (roll == 1)      encounter_trap();
    else if (roll == 2) encounter_treasure();
    else if (roll == 3) encounter_monster();
    else                encounter_shrine();
}

void path_right_corridor() {
    display_divider();
    cout << "\n  The right corridor opens into a small chamber.\n";
    cout << "  You hear voices... a merchant, perhaps?\n";

    int roll = roll_dice(4);
    if (roll <= 2) {
        encounter_merchant();
    } else {
        cout << "  It was a trap! A monster was waiting.\n";
        encounter_monster();
    }
}

void path_center_stairs() {
    display_divider();
    cout << "\n  The center path leads to a stone staircase going deeper.\n";

    if (player.floor % 3 == 0) {
        // Every 3 floors, boss
        cout << "  A heavy iron door blocks the way. Something stirs behind it.\n";
        encounter_boss();
    } else {
        cout << "  You descend to Floor " << player.floor + 1 << ".\n";
        player.floor++;
        // Small reward for pressing on
        int heal = roll_dice(4);
        player.hp = min(player.hp + heal, player.max_hp);
        log_event("You rest briefly. Recovered " + to_string(heal) + " HP.");
        floor_start();
    }
}

// ============================================================
// FLOOR START
// ============================================================

void floor_start() {
    if (!player.alive) return;
    display_divider();
    display_stats();
    cout << "\n  === FLOOR " << player.floor << " ===\n\n";

    // Randomize room description
    string rooms[] = {
        "The air reeks of rot. Bones crunch beneath your boots.",
        "Faint torchlight flickers from somewhere ahead.",
        "Water drips from the ceiling. The walls are slick with moss.",
        "Ancient carvings line the walls. Something watches you.",
        "A cold wind howls through the corridor. Death is near."
    };
    cout << "  " << rooms[roll_dice(5) - 1] << "\n\n";

    cout << "  Three paths stretch before you:\n";
    cout << "  1) Left Corridor  - Dark and narrow\n";
    cout << "  2) Right Chamber  - You hear shuffling\n";
    cout << "  3) Center Stairs  - Descend deeper\n";
    cout << "  4) Check stats\n";

    int c = get_choice(4);
    if      (c == 1) { path_left_corridor();  if (player.alive) floor_start(); }
    else if (c == 2) { path_right_corridor(); if (player.alive) floor_start(); }
    else if (c == 3) { path_center_stairs(); }
    else             { display_stats();       floor_start(); }
}

// ============================================================
// CLASS SELECTION
// ============================================================

void choose_class() {
    display_divider();
    cout << "\n  Choose your class:\n\n";
    cout << "  1) WARRIOR    - HP:25  ATK:5  DEF:3  Starts with Torch\n";
    cout << "     Tough and reliable. High defense, moderate attack.\n\n";
    cout << "  2) ROGUE      - HP:18  ATK:7  DEF:1  Starts with Rope\n";
    cout << "     Glass cannon. High attack but fragile.\n\n";
    cout << "  3) SCHOLAR    - HP:20  ATK:4  DEF:2  Starts with Potion\n";
    cout << "     Prepared and resourceful. Starts with a healing potion.\n\n";

    int c = get_choice(3);

    player.xp = 0;
    player.level = 1;
    player.gold = 10;
    player.floor = 1;
    player.alive = true;
    player.has_torch = false;
    player.has_rope = false;
    player.has_potion = false;

    if (c == 1) {
        player.class_name = "Warrior";
        player.max_hp = 25; player.hp = 25;
        player.attack = 5;  player.defense = 3;
        player.has_torch = true;
    } else if (c == 2) {
        player.class_name = "Rogue";
        player.max_hp = 18; player.hp = 18;
        player.attack = 7;  player.defense = 1;
        player.has_rope = true;
    } else {
        player.class_name = "Scholar";
        player.max_hp = 20; player.hp = 20;
        player.attack = 4;  player.defense = 2;
        player.has_potion = true;
    }

    log_event("You are " + player.name + " the " + player.class_name + ". Good luck.");
}

// ============================================================
// START / MAIN MENU
// ============================================================

void start_game() {
    display_divider();
    cout << "\n";
    cout << "  ██████╗ ███████╗██╗    ██╗   ██╗███████╗\n";
    cout << "  ██╔══██╗██╔════╝██║    ██║   ██║██╔════╝\n";
    cout << "  ██║  ██║█████╗  ██║    ██║   ██║█████╗  \n";
    cout << "  ██║  ██║██╔══╝  ██║    ╚██╗ ██╔╝██╔══╝  \n";
    cout << "  ██████╔╝███████╗███████╗╚████╔╝ ███████╗\n";
    cout << "  ╚═════╝ ╚══════╝╚══════╝ ╚═══╝  ╚══════╝\n";
    cout << "\n  A Roguelike Choose Your Own Adventure\n";
    cout << "  Survive 5 floors. Face the bosses. Escape alive.\n";
    display_divider();

    cout << "\n  Enter your character's name: ";
    cin >> player.name;

    choose_class();
    floor_start();
}

void main_menu() {
    display_divider();
    cout << "\n  DELVE - Main Menu\n\n";
    cout << "  1) New Game\n";
    cout << "  2) How to Play\n";
    cout << "  3) Quit\n";

    int c = get_choice(3);
    if (c == 1) {
        start_game();
    } else if (c == 2) {
        display_divider();
        cout << "\n  HOW TO PLAY:\n\n";
        cout << "  - Navigate 5 floors of a deadly dungeon.\n";
        cout << "  - Each floor has 3 paths: Left, Right, and Stairs.\n";
        cout << "  - Left Corridor: traps, shrines, treasure, monsters.\n";
        cout << "  - Right Chamber: merchants or ambushes.\n";
        cout << "  - Center Stairs: descend deeper (boss every 3 floors).\n\n";
        cout << "  - Combat is turn-based with dice rolls.\n";
        cout << "  - Gain XP to level up (ATK and HP increase).\n";
        cout << "  - Items: Torch (avoid dark penalties), Rope (disarm traps),\n";
        cout << "           Potion (heal during or before combat).\n\n";
        cout << "  - If HP reaches 0, it's PERMADEATH - start over!\n";
        cout << "  - Reach and defeat Floor 5's boss to WIN.\n";
        display_divider();
        main_menu();
    } else {
        cout << "\n  Farewell, adventurer.\n\n";
    }
}

#endif // M5LAB1_H
