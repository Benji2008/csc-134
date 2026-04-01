#ifndef ISAAC_DELVE_H
#define ISAAC_DELVE_H

#include <iostream>
#include <string>
#include <cstdlib>
#include <ctime>
#include <fstream>
#include <sstream>
#include <vector>
#include <cmath>
using namespace std;

// ============================================================
// SAVE/LOAD SYSTEM
// ============================================================

const string SAVE_FILE = "isaac_save.dat";

struct SaveData {
    string name;
    string class_name;
    int hp, max_hp;
    int base_defense, speed;
    int gold, floor, xp, level;
    bool has_torch, has_rope, has_potion;
    
    // Weapon/armor/accessories - store as indices
    int weapon_main_idx, weapon_off_idx;
    int head_idx, chest_idx, pants_idx, boots_idx;
    int acc1_idx, acc2_idx;
};

void clear_screen() {
    #ifdef _WIN32
        system("cls");
    #else
        system("clear");
    #endif
}

// ============================================================
// ITEM STRUCTS
// ============================================================

enum WeaponHands   { ONE_HANDED, TWO_HANDED, UNARMED_TYPE };
enum ArmorSlotType { SLOT_HEAD, SLOT_CHEST, SLOT_PANTS, SLOT_BOOTS, SLOT_NONE };

struct Weapon {
    string      name;
    string      ascii_art;   // Mini Isaac sprite
    int         dmg_min;
    int         dmg_max;
    int         speed_mod;
    WeaponHands hands;
    bool        equipped;
};

struct ArmorPiece {
    string       name;
    string       ascii_art;
    int          defense_bonus;
    int          speed_mod;
    int          hp_bonus;
    ArmorSlotType slot;
    bool         equipped;
};

struct Accessory {
    string name;
    string ascii_art;         // Unique BoI-style icon
    string effect_desc;
    int  hp_bonus;
    int  max_hp_bonus;
    int  defense_bonus;
    int  speed_bonus;
    bool thorns;
    bool vampiric;
    bool lucky;
    bool cursed;
    bool weightless;
    bool equipped;
};

// Factory helpers
Weapon make_weapon(string n, string art, int mn, int mx, int spd, WeaponHands h) {
    return {n, art, mn, mx, spd, h, true};
}
Weapon empty_weapon() { return {"(empty)", " ", 0, 0, 0, UNARMED_TYPE, false}; }

ArmorPiece make_armor(string n, string art, int def, int spd, int hp, ArmorSlotType s) {
    return {n, art, def, spd, hp, s, true};
}
ArmorPiece empty_armor(ArmorSlotType s) { return {"(none)", " ", 0, 0, 0, s, false}; }

Accessory make_accessory(string n, string art, string desc,
                         int hp, int mhp, int def, int spd,
                         bool thorns, bool vamp, bool lucky,
                         bool cursed, bool weightless) {
    return {n, art, desc, hp, mhp, def, spd, thorns, vamp, lucky, cursed, weightless, true};
}
Accessory empty_accessory() {
    return {"(none)", " ", "", 0, 0, 0, 0, false, false, false, false, false, false};
}

// ============================================================
// PLAYER
// ============================================================

struct Player {
    string name;
    string class_name;
    int  hp;
    int  max_hp;
    int  base_defense;
    int  speed;
    int  gold;
    int  floor;
    int  xp;
    int  level;
    bool has_torch;
    bool has_rope;
    bool has_potion;
    bool alive;

    Weapon weapon_main;
    Weapon weapon_off;
    ArmorPiece head;
    ArmorPiece chest;
    ArmorPiece pants;
    ArmorPiece boots;
    Accessory acc1;
    Accessory acc2;

    int get_defense() const {
        int d = base_defense;
        if (head.equipped)  d += head.defense_bonus;
        if (chest.equipped) d += chest.defense_bonus;
        if (pants.equipped) d += pants.defense_bonus;
        if (boots.equipped) d += boots.defense_bonus;
        if (acc1.equipped)  d += acc1.defense_bonus;
        if (acc2.equipped)  d += acc2.defense_bonus;
        return max(0, d);
    }

    int get_speed() const {
        int s = speed;
        bool weightless = (acc1.equipped && acc1.weightless) ||
                          (acc2.equipped && acc2.weightless);
        if (!weightless) {
            if (weapon_main.equipped) s += weapon_main.speed_mod;
            if (weapon_off.equipped)  s += weapon_off.speed_mod;
            if (head.equipped)        s += head.speed_mod;
            if (chest.equipped)       s += chest.speed_mod;
            if (pants.equipped)       s += pants.speed_mod;
            if (boots.equipped)       s += boots.speed_mod;
        }
        if (acc1.equipped) s += acc1.speed_bonus;
        if (acc2.equipped) s += acc2.speed_bonus;
        return max(1, s);
    }

    int get_evasion_pct() const {
        int s = get_speed();
        int e = (s * 100) / (s + 10);
        return max(5, min(60, e));
    }

    int roll_weapon_dmg() const {
        int dmg = 1;
        if (weapon_main.equipped) {
            int r = weapon_main.dmg_max - weapon_main.dmg_min;
            dmg   = weapon_main.dmg_min + (r > 0 ? rand() % (r + 1) : 0);
            if (weapon_off.equipped) {
                int r2   = weapon_off.dmg_max - weapon_off.dmg_min;
                int dmg2 = weapon_off.dmg_min + (r2 > 0 ? rand() % (r2 + 1) : 0);
                dmg += (dmg2 * 6) / 10;
            }
        }
        bool lucky  = (acc1.equipped && acc1.lucky)  || (acc2.equipped && acc2.lucky);
        bool cursed = (acc1.equipped && acc1.cursed) || (acc2.equipped && acc2.cursed);
        if (lucky)  dmg += 1;
        if (cursed) dmg += 4;
        return max(1, dmg);
    }

    bool is_two_handed() const {
        return weapon_main.equipped && weapon_main.hands == TWO_HANDED;
    }
};

Player player;

// ============================================================
// ITEM POOLS WITH ASCII ART
// ============================================================

const int NUM_WEAPONS = 14;
Weapon WEAPON_POOL[NUM_WEAPONS] = {
    make_weapon("Rusty Dagger",   "[>", 2,  5,  2, ONE_HANDED),
    make_weapon("Short Sword",    "[*>", 4,  8,  1, ONE_HANDED),
    make_weapon("Hand Axe",       "\\|", 5,  9, -1, ONE_HANDED),
    make_weapon("Rapier",         "->", 3,  7,  3, ONE_HANDED),
    make_weapon("Mace",           "[0]", 6, 10, -2, ONE_HANDED),
    make_weapon("Throwing Knife", "<|", 2,  6,  2, ONE_HANDED),
    make_weapon("Crossbow",       "=O", 6, 12, -1, ONE_HANDED),
    make_weapon("Greatsword",     "[**>", 10, 18, -3, TWO_HANDED),
    make_weapon("War Hammer",     "||", 12, 20, -4, TWO_HANDED),
    make_weapon("Halberd",        "T|", 9, 16, -2, TWO_HANDED),
    make_weapon("Staff of Embers", "*|", 8, 14,  0, TWO_HANDED),
    make_weapon("Cursed Blade",   "!>", 14, 22, -5, TWO_HANDED),
    make_weapon("Twin Fang Daggers", "><", 3,  6,  4, ONE_HANDED),
    make_weapon("Bone Wand",      "~|", 5, 10,  1, ONE_HANDED),
};

const int NUM_ARMORS = 16;
ArmorPiece ARMOR_POOL[NUM_ARMORS] = {
    make_armor("Leather Cap",     "^", 1,  1,  0, SLOT_HEAD),
    make_armor("Iron Helm",       "[H]", 3, -1,  0, SLOT_HEAD),
    make_armor("Skull Mask",      "^_^", 2,  0,  2, SLOT_HEAD),
    make_armor("Hood of Shadows", "/_\\", 1,  2,  0, SLOT_HEAD),
    make_armor("Leather Vest",    "{}", 2,  0,  2, SLOT_CHEST),
    make_armor("Chainmail",       "[M]", 4, -2,  0, SLOT_CHEST),
    make_armor("Plate Cuirass",   "[#]", 6, -3,  5, SLOT_CHEST),
    make_armor("Rogue's Tunic",   "[R]", 2,  2,  0, SLOT_CHEST),
    make_armor("Padded Trousers", "||", 1,  0,  2, SLOT_PANTS),
    make_armor("Scale Leggings",  "/\\", 3, -1,  0, SLOT_PANTS),
    make_armor("Drifter's Pants", "|_|", 1,  2,  0, SLOT_PANTS),
    make_armor("Warden Greaves",  "=|=", 4, -2,  3, SLOT_PANTS),
    make_armor("Leather Boots",   "U", 1,  1,  0, SLOT_BOOTS),
    make_armor("Iron Boots",      "[U]", 2, -1,  0, SLOT_BOOTS),
    make_armor("Ghoststep Boots", "o", 1,  2,  1, SLOT_BOOTS),
    make_armor("Cursed Stompers", "[X]", 3, -2,  2, SLOT_BOOTS),
};

const int NUM_ACCESSORIES = 14;
Accessory ACC_POOL[NUM_ACCESSORIES] = {
    make_accessory("Thorn Ring",       "o*o", "Reflect 25% dmg", 0, 0, 0, 0, true, false, false, false, false),
    make_accessory("Vampire Fang",     "(>", "Heal 3 HP/kill", 0, 0, 0, 0, false, true, false, false, false),
    make_accessory("Lucky Coin",       "$", "+1 to rolls", 0, 0, 0, 0, false, false, true, false, false),
    make_accessory("Cursed Idol",      "!!", "RISKY: +4 dmg,-2 taken", 0, 0, 0, 0, false, false, false, true, false),
    make_accessory("Featherstone",     "~", "No SPD penalties", 0, 0, 0, 0, false, false, false, false, true),
    make_accessory("Phantom Ring",     "**", "Weightless+Lucky", 0, 0, 0, 0, false, false, true, false, true),
    make_accessory("Orb of Power",     "O", "+2 Max HP", 0, 2, 0, 0, false, false, false, false, false),
    make_accessory("Shadow Amulet",    "S", "+1 DEF, -2 SPD", 0, 0, 1, -2, false, false, false, false, false),
    make_accessory("Mercury Vial",     "<>", "+3 SPD", 0, 0, 0, 3, false, false, false, false, false),
    make_accessory("Heart Container",  "<3", "+3 Max HP", 0, 3, 0, 0, false, false, false, false, false),
    make_accessory("Spiky Shield",     "{}", "+2 DEF, reflect 10%", 0, 0, 2, 0, true, false, false, false, false),
    make_accessory("Void Crystal",     "X", "+1 HP, -1 SPD", 1, 0, 0, -1, false, false, false, false, false),
    make_accessory("Executioner's Axe", "!", "+6 dmg, -3 DEF", 0, 0, -3, 0, false, false, false, false, false),
    make_accessory("Ancient Coin",     "C", "+1 gold/kill", 0, 0, 0, 0, false, false, true, false, false),
};

// ============================================================
// ENEMIES
// ============================================================

struct Enemy {
    string name;
    string ascii_art;
    int hp, max_hp;
    int attack_dmg_min, attack_dmg_max;
    int defense;
    int speed;
    int gold_reward;
    int xp_reward;
};

Enemy make_enemy(string n, string art, int h, int a_min, int a_max, int def, int spd, int g, int xp) {
    return {n, art, h, h, a_min, a_max, def, spd, g, xp};
}

// Random dungeon enemies
Enemy spawn_enemy(int floor) {
    vector<Enemy> enemies = {
        make_enemy("Slime",         "o", 3, 1, 3, 0, 3, 5, 10),
        make_enemy("Goblin",        "g", 5, 2, 4, 1, 6, 10, 15),
        make_enemy("Skeleton",      "X", 8, 3, 6, 2, 5, 15, 25),
        make_enemy("Orc Grunt",     "O", 12, 4, 8, 2, 4, 20, 30),
        make_enemy("Wraith",        "W", 6, 3, 7, 1, 10, 15, 20),
        make_enemy("Shadow Beast",  "S", 10, 5, 9, 2, 7, 25, 35),
    };
    
    int idx = rand() % enemies.size();
    Enemy e = enemies[idx];
    
    // Scale by floor
    e.hp = e.max_hp = e.max_hp + (floor * 2);
    e.attack_dmg_min += floor;
    e.attack_dmg_max += floor;
    e.defense += (floor / 2);
    e.gold_reward += (floor * 5);
    e.xp_reward += (floor * 10);
    
    return e;
}

Enemy spawn_boss(int floor) {
    vector<Enemy> bosses = {
        make_enemy("Blob King",      "O_O", 25, 5, 10, 3, 5, 50, 100),
        make_enemy("Dark Knight",    "[K]", 30, 6, 12, 4, 6, 75, 150),
        make_enemy("Ancient Wyrm",   "W~W", 40, 8, 15, 3, 8, 100, 200),
        make_enemy("Lich Lord",      "L", 35, 7, 14, 5, 7, 90, 180),
        make_enemy("Void Incarnate", "V", 50, 10, 18, 4, 6, 125, 250),
    };
    
    int idx = rand() % bosses.size();
    Enemy b = bosses[idx];
    
    // Heavy scaling for bosses
    b.hp = b.max_hp = b.max_hp + (floor * 8);
    b.attack_dmg_min += (floor * 2);
    b.attack_dmg_max += (floor * 2);
    b.defense += floor;
    b.gold_reward = 100 + (floor * 30);
    b.xp_reward = 300 + (floor * 50);
    
    return b;
}

// ============================================================
// GLOBAL HELPERS
// ============================================================

int roll_dice(int max_val) {
    return 1 + (rand() % max_val);
}

int get_choice(int max_choice) {
    int choice;
    while (true) {
        cout << "\n  > ";
        cin >> choice;
        if (choice >= 1 && choice <= max_choice) return choice;
        cout << "  Invalid choice! Pick 1-" << max_choice << ".\n";
    }
}

void display_divider() {
    cout << "\n  " << string(60, '=') << "\n";
}

// ============================================================
// GRAPHICS & DISPLAY
// ============================================================

void draw_isaac_title() {
    clear_screen();
    cout << "\n\n";
    cout << "    ██╗███████╗ █████╗  █████╗  ██████╗\n";
    cout << "    ██║██╔════╝██╔══██╗██╔══██╗██╔════╝\n";
    cout << "    ██║███████╗███████║███████║██║\n";
    cout << "    ██║╚════██║██╔══██║██╔══██║██║\n";
    cout << "    ██║███████║██║  ██║██║  ██║╚██████╗\n";
    cout << "    ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝\n";
    cout << "         ISAAC DELVE: ROGUELIKE EDITION\n";
    cout << "\n    Binding of Isaac meets Choose Your Own Adventure\n";
    cout << "    Survive 7 floors. Collect items. Escape the dungeon.\n";
    cout << "\n";
}

void draw_hud() {
    cout << "\n  ╔════════════════════════════════════════════════════════╗\n";
    cout << "  ║ " << player.name << " [" << player.class_name << "]";
    cout << string(40 - player.name.length() - player.class_name.length(), ' ') << "║\n";
    
    // HP bar
    int hp_bar = (player.hp * 10) / player.max_hp;
    cout << "  ║ HP: [";
    for (int i = 0; i < 10; i++) cout << (i < hp_bar ? "█" : "░");
    cout << "] " << player.hp << "/" << player.max_hp << string(20, ' ') << "║\n";
    
    // Stats
    cout << "  ║ Floor: " << player.floor << "  |  Lvl: " << player.level;
    cout << "  |  Gold: " << player.gold;
    cout << "  |  Evasion: " << player.get_evasion_pct() << "%";
    cout << string(5, ' ') << "║\n";
    
    cout << "  ║ DEF: " << player.get_defense() << "  |  SPD: " << player.get_speed();
    cout << "  |  XP: " << player.xp << "/" << (player.level * 20);
    cout << string(15, ' ') << "║\n";
    
    cout << "  ╚════════════════════════════════════════════════════════╝\n";
}

void show_equipment() {
    clear_screen();
    draw_hud();
    
    cout << "\n  ╔═══════════ EQUIPMENT ════════════╗\n";
    
    cout << "  ║ MAIN HAND:  " << player.weapon_main.name;
    cout << string(35 - player.weapon_main.name.length(), ' ') << "║\n";
    
    cout << "  ║ OFF HAND:   " << player.weapon_off.name;
    cout << string(35 - player.weapon_off.name.length(), ' ') << "║\n";
    
    cout << "  ║─────────────────────────────────║\n";
    cout << "  ║ HEAD:       " << player.head.name;
    cout << string(35 - player.head.name.length(), ' ') << "║\n";
    
    cout << "  ║ CHEST:      " << player.chest.name;
    cout << string(35 - player.chest.name.length(), ' ') << "║\n";
    
    cout << "  ║ PANTS:      " << player.pants.name;
    cout << string(35 - player.pants.name.length(), ' ') << "║\n";
    
    cout << "  ║ BOOTS:      " << player.boots.name;
    cout << string(35 - player.boots.name.length(), ' ') << "║\n";
    
    cout << "  ║─────────────────────────────────║\n";
    cout << "  ║ ACC 1:      " << player.acc1.name;
    cout << string(35 - player.acc1.name.length(), ' ') << "║\n";
    
    cout << "  ║ ACC 2:      " << player.acc2.name;
    cout << string(35 - player.acc2.name.length(), ' ') << "║\n";
    
    cout << "  ║─────────────────────────────────║\n";
    cout << "  ║ ITEMS: Torch=" << (player.has_torch ? "Y" : "N");
    cout << " Rope=" << (player.has_rope ? "Y" : "N");
    cout << " Potion=" << (player.has_potion ? "Y" : "N");
    cout << string(17, ' ') << "║\n";
    
    cout << "  ╚═══════════════════════════════════╝\n";
    
    cout << "\n  Press Enter to continue...";
    cin.ignore(); cin.get();
}

// ============================================================
// EQUIPMENT FUNCTIONS
// ============================================================

void equip_weapon(const Weapon& w) {
    if (!w.equipped) return;
    
    if (w.hands == TWO_HANDED) {
        player.weapon_main = w;
        player.weapon_off = empty_weapon();
    } else {
        if (!player.weapon_main.equipped) {
            player.weapon_main = w;
        } else {
            player.weapon_off = w;
        }
    }
}

void equip_armor(const ArmorPiece& a) {
    if (!a.equipped) return;
    if (a.slot == SLOT_HEAD) player.head = a;
    else if (a.slot == SLOT_CHEST) player.chest = a;
    else if (a.slot == SLOT_PANTS) player.pants = a;
    else if (a.slot == SLOT_BOOTS) player.boots = a;
}

void equip_accessory(const Accessory& a) {
    if (!a.equipped) return;
    if (!player.acc1.equipped) player.acc1 = a;
    else player.acc2 = a;
}

// ============================================================
// SAVE/LOAD SYSTEM
// ============================================================

void save_game() {
    ofstream file(SAVE_FILE);
    if (!file.is_open()) {
        cout << "  Error: Could not save game.\n";
        return;
    }
    
    file << player.name << "\n";
    file << player.class_name << "\n";
    file << player.hp << "\n" << player.max_hp << "\n";
    file << player.base_defense << "\n" << player.speed << "\n";
    file << player.gold << "\n" << player.floor << "\n";
    file << player.xp << "\n" << player.level << "\n";
    file << player.has_torch << "\n" << player.has_rope << "\n" << player.has_potion << "\n";
    
    // Save item indices (we'll use -1 for empty)
    int main_idx = -1, off_idx = -1;
    for (int i = 0; i < NUM_WEAPONS; i++) {
        if (WEAPON_POOL[i].name == player.weapon_main.name) main_idx = i;
        if (WEAPON_POOL[i].name == player.weapon_off.name) off_idx = i;
    }
    file << main_idx << "\n" << off_idx << "\n";
    
    int head_idx = -1, chest_idx = -1, pants_idx = -1, boots_idx = -1;
    for (int i = 0; i < NUM_ARMORS; i++) {
        if (ARMOR_POOL[i].name == player.head.name) head_idx = i;
        if (ARMOR_POOL[i].name == player.chest.name) chest_idx = i;
        if (ARMOR_POOL[i].name == player.pants.name) pants_idx = i;
        if (ARMOR_POOL[i].name == player.boots.name) boots_idx = i;
    }
    file << head_idx << "\n" << chest_idx << "\n" << pants_idx << "\n" << boots_idx << "\n";
    
    int acc1_idx = -1, acc2_idx = -1;
    for (int i = 0; i < NUM_ACCESSORIES; i++) {
        if (ACC_POOL[i].name == player.acc1.name) acc1_idx = i;
        if (ACC_POOL[i].name == player.acc2.name) acc2_idx = i;
    }
    file << acc1_idx << "\n" << acc2_idx << "\n";
    
    file.close();
    cout << "  ✓ Game saved!\n";
}

bool load_game() {
    ifstream file(SAVE_FILE);
    if (!file.is_open()) return false;
    
    getline(file, player.name);
    getline(file, player.class_name);
    file >> player.hp >> player.max_hp;
    file >> player.base_defense >> player.speed;
    file >> player.gold >> player.floor;
    file >> player.xp >> player.level;
    file >> player.has_torch >> player.has_rope >> player.has_potion;
    
    int main_idx, off_idx;
    file >> main_idx >> off_idx;
    player.weapon_main = (main_idx >= 0) ? WEAPON_POOL[main_idx] : empty_weapon();
    player.weapon_off = (off_idx >= 0) ? WEAPON_POOL[off_idx] : empty_weapon();
    
    int head_idx, chest_idx, pants_idx, boots_idx;
    file >> head_idx >> chest_idx >> pants_idx >> boots_idx;
    player.head = (head_idx >= 0) ? ARMOR_POOL[head_idx] : empty_armor(SLOT_HEAD);
    player.chest = (chest_idx >= 0) ? ARMOR_POOL[chest_idx] : empty_armor(SLOT_CHEST);
    player.pants = (pants_idx >= 0) ? ARMOR_POOL[pants_idx] : empty_armor(SLOT_PANTS);
    player.boots = (boots_idx >= 0) ? ARMOR_POOL[boots_idx] : empty_armor(SLOT_BOOTS);
    
    int acc1_idx, acc2_idx;
    file >> acc1_idx >> acc2_idx;
    player.acc1 = (acc1_idx >= 0) ? ACC_POOL[acc1_idx] : empty_accessory();
    player.acc2 = (acc2_idx >= 0) ? ACC_POOL[acc2_idx] : empty_accessory();
    
    file.close();
    player.alive = true;
    return true;
}

// ============================================================
// COMBAT SYSTEM
// ============================================================

void combat(Enemy enemy) {
    display_divider();
    cout << "\n  ⚔️  COMBAT START! You face the " << enemy.name << " " << enemy.ascii_art << "\n";
    cout << "\n  Enemy HP: ";
    for (int i = 0; i < 15; i++) cout << "█";
    cout << " (" << enemy.hp << "/" << enemy.max_hp << ")\n";
    
    while (enemy.hp > 0 && player.hp > 0) {
        cout << "\n  1) Attack\n";
        cout << "  2) Defend\n";
        cout << "  3) Use Potion (Heal 8 HP)";
        if (!player.has_potion) cout << " [OUT]";
        cout << "\n";
        
        int choice = get_choice(3);
        
        if (choice == 1) {
            // Player attacks
            int player_dmg = player.roll_weapon_dmg();
            int enemy_def = enemy.defense;
            int final_dmg = max(1, player_dmg - enemy_def);
            
            cout << "\n  You strike for " << final_dmg << " damage!\n";
            enemy.hp -= final_dmg;
            
            // Check for Vampire Fang
            if ((player.acc1.equipped && player.acc1.vampiric) ||
                (player.acc2.equipped && player.acc2.vampiric)) {
                if (enemy.hp <= 0) {
                    player.hp = min(player.hp + 3, player.max_hp);
                    cout << "  [Vampire Fang] Drain 3 HP!\n";
                }
            }
        } else if (choice == 2) {
            cout << "\n  You brace for impact!\n";
        } else if (choice == 3) {
            if (player.has_potion) {
                player.hp = min(player.hp + 8, player.max_hp);
                player.has_potion = false;
                cout << "\n  You drink a healing potion! +8 HP\n";
            } else {
                cout << "\n  You have no potions left!\n";
                continue;
            }
        }
        
        if (enemy.hp <= 0) break;
        
        // Enemy attacks
        int enemy_dmg = roll_dice(enemy.attack_dmg_max - enemy.attack_dmg_min + 1) 
                        + enemy.attack_dmg_min - 1;
        
        // Check evasion
        if (roll_dice(100) <= player.get_evasion_pct()) {
            cout << "  " << enemy.name << " attacks but you EVADE!\n";
        } else {
            int final_dmg = max(1, enemy_dmg - player.get_defense());
            
            // Cursed damage boost
            if ((player.acc1.equipped && player.acc1.cursed) ||
                (player.acc2.equipped && player.acc2.cursed)) {
                final_dmg += 2;
            }
            
            player.hp -= final_dmg;
            cout << "  " << enemy.name << " hits for " << final_dmg << " damage!\n";
            
            // Thorns reflection
            if ((player.acc1.equipped && player.acc1.thorns) ||
                (player.acc2.equipped && player.acc2.thorns)) {
                int reflect = (final_dmg * 25) / 100;
                enemy.hp -= reflect;
                cout << "  [Thorn Ring] Reflect " << reflect << " damage!\n";
            }
        }
    }
    
    display_divider();
    if (enemy.hp <= 0) {
        cout << "\n  ✓ Victory! " << enemy.name << " defeated!\n";
        cout << "  Gained " << enemy.gold_reward << " gold and " << enemy.xp_reward << " XP!\n";
        player.gold += enemy.gold_reward;
        player.xp += enemy.xp_reward;
        
        // Check level up
        if (player.xp >= player.level * 20) {
            player.xp = 0;
            player.level++;
            player.max_hp += 5;
            player.hp = player.max_hp;
            cout << "  ⭐ LEVEL UP! Now level " << player.level << "!\n";
        }
    } else {
        cout << "\n  ✗ You were defeated...\n";
        player.alive = false;
    }
}

// ============================================================
// ENCOUNTERS
// ============================================================

void encounter_monster() {
    Enemy enemy = spawn_enemy(player.floor);
    cout << "\n  A " << enemy.name << " " << enemy.ascii_art << " appears!\n";
    combat(enemy);
}

void encounter_boss() {
    Enemy boss = spawn_boss(player.floor);
    cout << "\n  ⚔️ A BOSS APPEARS! The " << boss.name << " " << boss.ascii_art << "\n";
    cout << "\n  This is a FLOOR BOSS. Victory means floor progression!\n";
    combat(boss);
    
    if (player.alive) {
        cout << "\n  You vanquish the boss and find a chest!\n";
        cout << "  Obtained a random item!\n";
        
        // Random item from pools
        int item_type = roll_dice(3);
        if (item_type == 1) {
            Weapon w = WEAPON_POOL[rand() % NUM_WEAPONS];
            equip_weapon(w);
            cout << "  Found weapon: " << w.name << "\n";
        } else if (item_type == 2) {
            ArmorPiece a = ARMOR_POOL[rand() % NUM_ARMORS];
            equip_armor(a);
            cout << "  Found armor: " << a.name << "\n";
        } else {
            Accessory ac = ACC_POOL[rand() % NUM_ACCESSORIES];
            equip_accessory(ac);
            cout << "  Found accessory: " << ac.name << "\n";
        }
    }
}

void encounter_treasure() {
    cout << "\n  You find a treasure chest!\n";
    int gold = roll_dice(30) + 10;
    player.gold += gold;
    cout << "  Found " << gold << " gold!\n";
    
    // 50% chance of item
    if (roll_dice(2) == 1) {
        int item_type = roll_dice(3);
        if (item_type == 1) {
            Weapon w = WEAPON_POOL[rand() % NUM_WEAPONS];
            equip_weapon(w);
            cout << "  And a weapon: " << w.name << "\n";
        } else if (item_type == 2) {
            ArmorPiece a = ARMOR_POOL[rand() % NUM_ARMORS];
            equip_armor(a);
            cout << "  And armor: " << a.name << "\n";
        } else {
            Accessory ac = ACC_POOL[rand() % NUM_ACCESSORIES];
            equip_accessory(ac);
            cout << "  And an accessory: " << ac.name << "\n";
        }
    }
}

void encounter_merchant() {
    display_divider();
    cout << "\n  A MERCHANT appears!\n";
    cout << "  ┌─────────────────────────┐\n";
    cout << "  │ 1) Health Potion  - 15g │\n";
    cout << "  │ 2) Weapon (Random) - 20g│\n";
    cout << "  │ 3) Armor (Random)  - 20g│\n";
    cout << "  │ 4) Leave           - 0g │\n";
    cout << "  └─────────────────────────┘\n";
    
    int c = get_choice(4);
    if (c == 1 && player.gold >= 15) {
        player.gold -= 15;
        player.has_potion = true;
        cout << "  Bought a potion!\n";
    } else if (c == 2 && player.gold >= 20) {
        Weapon w = WEAPON_POOL[rand() % NUM_WEAPONS];
        player.gold -= 20;
        equip_weapon(w);
        cout << "  Bought: " << w.name << "\n";
    } else if (c == 3 && player.gold >= 20) {
        ArmorPiece a = ARMOR_POOL[rand() % NUM_ARMORS];
        player.gold -= 20;
        equip_armor(a);
        cout << "  Bought: " << a.name << "\n";
    } else if (c == 4) {
        cout << "  You leave the shop.\n";
    } else {
        cout << "  Not enough gold!\n";
    }
}

void encounter_shrine() {
    display_divider();
    cout << "\n  You find an ancient SHRINE!\n";
    cout << "  ┌──────────────────────────┐\n";
    cout << "  │ 1) Pay 5 gold (random)  │\n";
    cout << "  │ 2) Pay HP for DEF (+2)   │\n";
    cout << "  │ 3) Leave                 │\n";
    cout << "  └──────────────────────────┘\n";
    
    int c = get_choice(3);
    if (c == 1) {
        if (player.gold >= 5) {
            player.gold -= 5;
            int blessing = roll_dice(3);
            if (blessing == 1) {
                player.max_hp += 3;
                player.hp = player.max_hp;
                cout << "  Blessed! Max HP +3!\n";
            } else if (blessing == 2) {
                player.speed += 2;
                cout << "  Faster! SPD +2!\n";
            } else {
                player.base_defense += 1;
                cout << "  Stronger! DEF +1!\n";
            }
        } else {
            cout << "  Not enough gold!\n";
        }
    } else if (c == 2) {
        if (player.hp > 1) {
            player.hp -= 1;
            player.base_defense += 2;
            cout << "  Sacrifice 1 HP for DEF +2!\n";
        } else {
            cout << "  Too weak to sacrifice!\n";
        }
    } else {
        cout << "  You walk past the shrine.\n";
    }
}

void encounter_trap() {
    cout << "\n  A TRAP! ";
    int dmg = roll_dice(6) + player.floor;
    
    if (player.has_rope) {
        cout << "Your rope saves you! No damage.\n";
        player.has_rope = false;
    } else {
        dmg = max(1, dmg - player.get_defense());
        player.hp -= dmg;
        cout << "You take " << dmg << " damage!\n";
        if (player.hp <= 0) {
            player.alive = false;
        }
    }
}

// ============================================================
// FLOOR PATHS
// ============================================================

void path_left_corridor();
void path_right_corridor();
void path_center_stairs();
void floor_start();
void game_over();

void path_left_corridor() {
    display_divider();
    cout << "\n  🕯️ LEFT CORRIDOR - Dark and foreboding...\n";
    
    if (!player.has_torch) {
        cout << "  Without light, you stumble blindly!\n";
        if (roll_dice(3) == 1) encounter_trap();
        else encounter_monster();
    } else {
        cout << "  Your torch reveals a path forward.\n";
        int r = roll_dice(4);
        if (r == 1) encounter_trap();
        else if (r == 2) encounter_treasure();
        else if (r == 3) encounter_monster();
        else encounter_shrine();
    }
}

void path_right_corridor() {
    display_divider();
    cout << "\n  🏪 RIGHT CHAMBER - Voices echo ahead...\n";
    
    if (roll_dice(2) == 1) {
        cout << "  A MERCHANT!\n";
        encounter_merchant();
    } else {
        cout << "  Ambush!\n";
        encounter_monster();
    }
}

void path_center_stairs() {
    display_divider();
    cout << "\n  ⬇️  CENTER STAIRS - Descending deeper...\n";
    
    if (player.floor % 3 == 0) {
        cout << "  A heavy iron door blocks the way.\n";
        cout << "  Something ancient stirs behind it...\n";
        encounter_boss();
        if (player.alive && player.floor == 7) {
            cout << "\n  🏁 You've escaped the dungeon! GAME WON!\n";
            player.alive = false;
            return;
        }
        if (player.alive) {
            player.floor++;
            player.hp = player.max_hp;
            cout << "\n  You descend to Floor " << player.floor << ".\n";
        }
    } else {
        player.floor++;
        int heal = roll_dice(4) + 2;
        player.hp = min(player.hp + heal, player.max_hp);
        cout << "  You descend safely to Floor " << player.floor << ".\n";
        cout << "  Rest area heals " << heal << " HP.\n";
    }
}

void floor_start() {
    if (!player.alive) return;
    
    clear_screen();
    draw_hud();
    
    cout << "\n  ╔═════════════════════════════╗\n";
    cout << "  ║     FLOOR " << player.floor << " - EXPLORATION     ║\n";
    cout << "  ╚═════════════════════════════╝\n";
    
    string rooms[] = {
        "The air reeks of death. Bones crunch underfoot.",
        "Ancient torches flicker eerily on the walls.",
        "Water drips from above. Moss covers everything.",
        "Strange symbols glow faintly in the darkness.",
        "A cold wind howls through the corridors."
    };
    cout << "\n  " << rooms[rand() % 5] << "\n";
    
    cout << "\n  Choose your path:\n";
    cout << "  1) Left Corridor    [Dark, items]\n";
    cout << "  2) Right Chamber    [Merchant/Ambush]\n";
    cout << "  3) Center Stairs    [Progress]\n";
    cout << "  4) View Equipment\n";
    cout << "  5) Save & Quit\n";
    
    int c = get_choice(5);
    if (c == 1) {
        path_left_corridor();
        if (player.alive) floor_start();
    } else if (c == 2) {
        path_right_corridor();
        if (player.alive) floor_start();
    } else if (c == 3) {
        path_center_stairs();
    } else if (c == 4) {
        show_equipment();
        floor_start();
    } else if (c == 5) {
        cout << "\n  Save game? (1=Yes, 2=No)\n";
        if (get_choice(2) == 1) save_game();
        cout << "\n  Goodbye!\n";
        player.alive = false;
    }
}

void game_over() {
    clear_screen();
    cout << "\n\n  ╔════════════════════════════╗\n";
    cout << "  ║        GAME OVER            ║\n";
    cout << "  ║   You've fallen in the      ║\n";
    cout << "  ║        dungeon...           ║\n";
    cout << "  ╚════════════════════════════╝\n";
    cout << "\n  Final Stats:\n";
    cout << "  Name:   " << player.name << "\n";
    cout << "  Class:  " << player.class_name << "\n";
    cout << "  Level:  " << player.level << "\n";
    cout << "  Floor:  " << player.floor << "/7\n";
    cout << "  Gold:   " << player.gold << "\n";
    cout << "  XP:     " << player.xp << "\n";
    cout << "\n";
}

void choose_class() {
    clear_screen();
    draw_hud();
    
    cout << "\n  ╔════════════════════════════════════╗\n";
    cout << "  ║    CHOOSE YOUR CLASS               ║\n";
    cout << "  ╚════════════════════════════════════╝\n";
    
    cout << "\n  1) ⚔️  WARRIOR\n";
    cout << "     HP:20/28  DEF:3  SPD:8  EVA:44%\n";
    cout << "     Tough, reliable, born to tank hits.\n";
    cout << "     Starts: Short Sword + Iron Helm\n";
    
    cout << "\n  2) 🗡️  ROGUE\n";
    cout << "     HP:20  DEF:1  SPD:14  EVA:58%\n";
    cout << "     Fast, lethal, high evasion glass-cannon.\n";
    cout << "     Starts: Twin Daggers (dual wield!)\n";
    
    cout << "\n  3) 📚 SCHOLAR\n";
    cout << "     HP:22  DEF:2  SPD:10  EVA:50%\n";
    cout << "     Balanced. Lucky Coin adds +1 to rolls.\n";
    cout << "     Starts: Bone Wand + Lucky Coin\n\n";
    
    int c = get_choice(3);
    
    player.xp = 0;
    player.level = 1;
    player.gold = 10;
    player.floor = 1;
    player.alive = true;
    player.has_torch = false;
    player.has_rope = false;
    player.has_potion = false;
    player.weapon_main = empty_weapon();
    player.weapon_off = empty_weapon();
    player.head = empty_armor(SLOT_HEAD);
    player.chest = empty_armor(SLOT_CHEST);
    player.pants = empty_armor(SLOT_PANTS);
    player.boots = empty_armor(SLOT_BOOTS);
    player.acc1 = empty_accessory();
    player.acc2 = empty_accessory();
    
    if (c == 1) {
        player.class_name = "Warrior";
        player.max_hp = 28;
        player.hp = 28;
        player.base_defense = 3;
        player.speed = 8;
        player.has_torch = true;
        equip_weapon(WEAPON_POOL[1]);
        equip_armor(ARMOR_POOL[1]);
    } else if (c == 2) {
        player.class_name = "Rogue";
        player.max_hp = 20;
        player.hp = 20;
        player.base_defense = 1;
        player.speed = 14;
        player.has_rope = true;
        equip_weapon(WEAPON_POOL[12]);
        equip_weapon(WEAPON_POOL[0]);
    } else {
        player.class_name = "Scholar";
        player.max_hp = 22;
        player.hp = 22;
        player.base_defense = 2;
        player.speed = 10;
        player.has_potion = true;
        equip_weapon(WEAPON_POOL[13]);
        equip_accessory(ACC_POOL[2]);
    }
    
    cout << "  You are " << player.name << " the " << player.class_name << ".\n";
    cout << "  Welcome to ISAAC DELVE...\n\n";
    cin.ignore(); cin.get();
    
    floor_start();
}

void start_game() {
    draw_isaac_title();
    
    cout << "  Enter your character's name: ";
    cin >> player.name;
    cin.ignore();
    
    choose_class();
}

void main_menu() {
    draw_isaac_title();
    
    cout << "  ╔══════════════════════════════╗\n";
    cout << "  ║       MAIN MENU              ║\n";
    cout << "  ║  1) New Game                 ║\n";
    cout << "  ║  2) Continue Game            ║\n";
    cout << "  ║  3) How to Play              ║\n";
    cout << "  ║  4) Quit                     ║\n";
    cout << "  ╚══════════════════════════════╝\n";
    
    int c = get_choice(4);
    
    if (c == 1) {
        start_game();
        if (player.alive) main_menu();
    } else if (c == 2) {
        if (load_game()) {
            cout << "\n  Game loaded! Continuing as " << player.name << "...\n";
            cin.ignore(); cin.get();
            floor_start();
            if (player.alive) main_menu();
        } else {
            cout << "\n  No save file found.\n";
            cin.ignore(); cin.get();
            main_menu();
        }
    } else if (c == 3) {
        clear_screen();
        cout << "\n  ╔═══════════════════════════════════╗\n";
        cout << "  ║      HOW TO PLAY                  ║\n";
        cout << "  ╚═══════════════════════════════════╝\n";
        
        cout << "\n  GOAL: Survive 7 floors and escape!\n";
        cout << "\n  COMBAT:\n";
        cout << "    Choose to Attack, Defend, or Use Potion\n";
        cout << "    Evasion % = SPD / (SPD+10) * 100, capped 5-60%\n";
        cout << "    Thorns Ring reflects 25% of damage taken\n";
        cout << "    Cursed items boost dmg but take more hits\n";
        cout << "\n  EQUIPMENT:\n";
        cout << "    1H Weapons: Dual wield (off-hand=60% dmg)\n";
        cout << "    2H Weapons: Massive dmg, locks off-hand\n";
        cout << "    4 Armor Slots: Head, Chest, Pants, Boots\n";
        cout << "    2 Accessories: With synergy effects (BoI-style!)\n";
        cout << "\n  ACCESSORIES:\n";
        cout << "    Lucky Coin    - +1 to all rolls\n";
        cout << "    Vampire Fang  - Heal 3 HP per kill\n";
        cout << "    Thorn Ring    - Reflect 25% damage\n";
        cout << "    Featherstone  - Ignore SPD penalties\n";
        cout << "    ...and 10 more to discover!\n";
        cout << "\n  PERMADEATH: HP=0 = Game Over. Permanent death.\n";
        cout << "  SAVE: Quit anytime to save your progress!\n";
        cout << "\n";
        cin.ignore(); cin.get();
        main_menu();
    } else {
        clear_screen();
        cout << "\n  Farewell, adventurer.\n\n";
    }
}

#endif
