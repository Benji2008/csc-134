#ifndef M5LAB1_H
#define M5LAB1_H

// m5lab1.h
// DELVE - A Roguelike Choose Your Own Adventure
// Features: weapon slots (1H/2H), armor (head/chest/pants/boots),
//           accessories, speed-based evasion, BoI-style item synergies

#include <iostream>
#include <string>
#include <cstdlib>
#include <ctime>
using namespace std;

// ============================================================
// ITEM STRUCTS
// ============================================================

enum WeaponHands   { ONE_HANDED, TWO_HANDED, UNARMED_TYPE };
enum ArmorSlotType { SLOT_HEAD, SLOT_CHEST, SLOT_PANTS, SLOT_BOOTS, SLOT_NONE };

struct Weapon {
    string      name;
    int         dmg_min;
    int         dmg_max;
    int         speed_mod;   // + = faster (helps evasion), - = slower
    WeaponHands hands;
    bool        equipped;
};

struct ArmorPiece {
    string       name;
    int          defense_bonus;
    int          speed_mod;
    int          hp_bonus;
    ArmorSlotType slot;
    bool         equipped;
};

struct Accessory {
    string name;
    string effect_desc;
    // Flat bonuses
    int  hp_bonus;
    int  max_hp_bonus;
    int  defense_bonus;
    int  speed_bonus;
    // BoI-style quirk flags
    bool thorns;      // reflect 25% of damage taken back at enemy
    bool vampiric;    // heal 3 HP on every kill
    bool lucky;       // +1 to every dice roll
    bool cursed;      // +4 dmg dealt BUT +2 dmg taken per hit
    bool weightless;  // ignore all speed penalties from weapons & armor
    bool equipped;
};

// ---- factory helpers ----
Weapon make_weapon(string n, int mn, int mx, int spd, WeaponHands h) {
    return {n, mn, mx, spd, h, true};
}
Weapon empty_weapon() { return {"(empty)", 0, 0, 0, UNARMED_TYPE, false}; }

ArmorPiece make_armor(string n, int def, int spd, int hp, ArmorSlotType s) {
    return {n, def, spd, hp, s, true};
}
ArmorPiece empty_armor(ArmorSlotType s) { return {"(none)", 0, 0, 0, s, false}; }

Accessory make_accessory(string n, string desc,
                         int hp, int mhp, int def, int spd,
                         bool thorns, bool vamp, bool lucky,
                         bool cursed, bool weightless) {
    return {n, desc, hp, mhp, def, spd, thorns, vamp, lucky, cursed, weightless, true};
}
Accessory empty_accessory() {
    return {"(none)", "", 0, 0, 0, 0, false, false, false, false, false, false};
}

// ============================================================
// PLAYER
// ============================================================

struct Player {
    string name;
    string class_name;

    int  hp;
    int  max_hp;
    int  base_defense;  // class/level base; armor stacks on top
    int  speed;         // base ~8-14 depending on class
    int  gold;
    int  floor;
    int  xp;
    int  level;

    bool has_torch;
    bool has_rope;
    bool has_potion;
    bool alive;

    // Weapon slots: two 1H  OR  one 2H
    Weapon weapon_main;
    Weapon weapon_off;

    // Armor slots
    ArmorPiece head;
    ArmorPiece chest;
    ArmorPiece pants;
    ArmorPiece boots;

    // Two accessory slots
    Accessory acc1;
    Accessory acc2;

    // ---- derived helpers ----
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

    // Evasion %: capped 5-60
    int get_evasion_pct() const {
        int s = get_speed();
        int e = (s * 100) / (s + 10);
        return max(5, min(60, e));
    }

    // Full weapon damage for one attack
    int roll_weapon_dmg() const {
        int dmg = 1;  // unarmed minimum
        if (weapon_main.equipped) {
            int r = weapon_main.dmg_max - weapon_main.dmg_min;
            dmg   = weapon_main.dmg_min + (r > 0 ? rand() % (r + 1) : 0);
            if (weapon_off.equipped) {
                int r2   = weapon_off.dmg_max - weapon_off.dmg_min;
                int dmg2 = weapon_off.dmg_min + (r2 > 0 ? rand() % (r2 + 1) : 0);
                dmg += (dmg2 * 6) / 10;  // off-hand = 60% contribution
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
// ITEM POOLS
// ============================================================

const int NUM_WEAPONS = 14;
Weapon WEAPON_POOL[NUM_WEAPONS] = {
    //                          name              min max spd  hands
    make_weapon("Rusty Dagger",        2,  5,  2, ONE_HANDED),
    make_weapon("Short Sword",         4,  8,  1, ONE_HANDED),
    make_weapon("Hand Axe",            5,  9, -1, ONE_HANDED),
    make_weapon("Rapier",              3,  7,  3, ONE_HANDED),
    make_weapon("Mace",                6, 10, -2, ONE_HANDED),
    make_weapon("Throwing Knife",      2,  6,  2, ONE_HANDED),
    make_weapon("Crossbow",            6, 12, -1, ONE_HANDED),
    make_weapon("Greatsword",         10, 18, -3, TWO_HANDED),
    make_weapon("War Hammer",         12, 20, -4, TWO_HANDED),
    make_weapon("Halberd",             9, 16, -2, TWO_HANDED),
    make_weapon("Staff of Embers",     8, 14,  0, TWO_HANDED),
    make_weapon("Cursed Blade",       14, 22, -5, TWO_HANDED),
    make_weapon("Twin Fang Daggers",   3,  6,  4, ONE_HANDED),
    make_weapon("Bone Wand",           5, 10,  1, ONE_HANDED),
};

const int NUM_ARMORS = 16;
ArmorPiece ARMOR_POOL[NUM_ARMORS] = {
    //                      name              def spd  hp   slot
    make_armor("Leather Cap",       1,  1,  0, SLOT_HEAD),
    make_armor("Iron Helm",         3, -1,  0, SLOT_HEAD),
    make_armor("Skull Mask",        2,  0,  2, SLOT_HEAD),
    make_armor("Hood of Shadows",   1,  2,  0, SLOT_HEAD),
    make_armor("Leather Vest",      2,  0,  2, SLOT_CHEST),
    make_armor("Chainmail",         4, -2,  0, SLOT_CHEST),
    make_armor("Plate Cuirass",     6, -3,  5, SLOT_CHEST),
    make_armor("Rogue's Tunic",     2,  2,  0, SLOT_CHEST),
    make_armor("Padded Trousers",   1,  0,  2, SLOT_PANTS),
    make_armor("Scale Leggings",    3, -1,  0, SLOT_PANTS),
    make_armor("Drifter's Pants",   1,  2,  0, SLOT_PANTS),
    make_armor("Warden Greaves",    4, -2,  3, SLOT_PANTS),
    make_armor("Soft Boots",        0,  3,  0, SLOT_BOOTS),
    make_armor("Iron Sabatons",     2, -1,  0, SLOT_BOOTS),
    make_armor("Swiftstriders",     1,  4,  0, SLOT_BOOTS),
    make_armor("Cursed Stompers",   3, -3,  0, SLOT_BOOTS),
};

const int NUM_ACCESSORIES = 14;
Accessory ACC_POOL[NUM_ACCESSORIES] = {
    //                       name              desc                               hp mhp def spd  thorn vamp lucky curs weight
    make_accessory("Thorn Ring",      "Reflect 25% dmg to attacker",             0,  0,  0,  0, true, false,false,false,false),
    make_accessory("Vampire Fang",    "Heal 3 HP on every kill",                 0,  0,  0,  0,false,  true,false,false,false),
    make_accessory("Lucky Coin",      "+1 to all dice & damage rolls",           0,  0,  0,  1,false, false, true,false,false),
    make_accessory("Cursed Idol",     "+4 dmg dealt, +2 dmg taken per hit",      0,  0, -2,  0,false, false,false, true,false),
    make_accessory("Featherstone",    "Ignore all weapon/armor speed penalties", 0,  0,  0,  0,false, false,false,false, true),
    make_accessory("Iron Will",       "+5 max HP, +1 defense",                   0,  5,  1,  0,false, false,false,false,false),
    make_accessory("Quicksilver Band","Speed +4",                                0,  0,  0,  4,false, false,false,false,false),
    make_accessory("Vitality Stone",  "+10 max HP",                              0, 10,  0,  0,false, false,false,false,false),
    make_accessory("Blood Pact",      "+3 max HP, Vampiric on kills",            0,  3,  0,  0,false,  true,false,false,false),
    make_accessory("Shadow Cloak",    "+3 speed + Thorn reflect",                0,  0,  0,  3, true, false,false,false,false),
    make_accessory("Berserker Shard", "Cursed +4 dmg, bonus +3 speed",          0,  0, -2,  3,false, false,false, true,false),
    make_accessory("Jade Amulet",     "+2 def, +2 speed",                        0,  0,  2,  2,false, false,false,false,false),
    make_accessory("Fool's Gold",     "Lucky +1 rolls, +5 max HP",              0,  5,  0,  0,false, false, true,false,false),
    make_accessory("Phantom Ring",    "Weightless + Lucky dice rolls",           0,  0,  0,  0,false, false, true,false, true),
};

// ============================================================
// FUNCTION PROTOTYPES
// ============================================================
void display_stats();
void display_divider();
void log_event(string msg);
int  get_choice(int max_options);
int  roll_dice(int sides);

void equip_weapon(Weapon w);
void equip_armor(ArmorPiece a);
void equip_accessory(Accessory a);
void show_equipment();

Weapon     random_weapon(int floor_depth);
ArmorPiece random_armor(int floor_depth);
Accessory  random_accessory();

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

void choice_fight(int enemy_hp, int enemy_atk, int enemy_def,
                  string name, int xp_reward, int gold_reward);
void choice_flee();
void use_potion();
void game_over();
void victory();

// ============================================================
// UTILITY
// ============================================================

void display_divider() { cout << "\n========================================\n"; }

void log_event(string msg) { cout << "  >> " << msg << "\n"; }

int get_choice(int max_options) {
    int choice;
    while (true) {
        cout << "\nYour choice: ";
        if (cin >> choice && choice >= 1 && choice <= max_options) return choice;
        cin.clear();
        cin.ignore(1000, '\n');
        cout << "  [Invalid] Enter 1-" << max_options << ".\n";
    }
}

int roll_dice(int sides) {
    int r = (rand() % sides) + 1;
    bool lucky = (player.acc1.equipped && player.acc1.lucky) ||
                 (player.acc2.equipped && player.acc2.lucky);
    return lucky ? min(sides, r + 1) : r;
}

string weapon_slot_str() {
    if (!player.weapon_main.equipped) return "(no weapon - fighting bare-handed)";
    string s = "[" + player.weapon_main.name + "]";
    if (player.weapon_off.equipped)
        s += " + [" + player.weapon_off.name + "]";
    else if (player.weapon_main.hands == ONE_HANDED)
        s += " + [empty off-hand]";
    return s;
}

void display_stats() {
    cout << "\n----------------------------------------\n";
    cout << " " << player.name << " the " << player.class_name
         << "  |  Floor: " << player.floor << "  |  Level: " << player.level << "\n";
    cout << " HP: "  << player.hp << "/" << player.max_hp
         << "  DEF: " << player.get_defense()
         << "  SPD: " << player.get_speed()
         << "  EVA: " << player.get_evasion_pct() << "%"
         << "  Gold: " << player.gold << "g\n";
    cout << " XP: " << player.xp << "\n";
    cout << " Weapon: " << weapon_slot_str() << "\n";
    cout << " Armor : ";
    bool any_armor = false;
    if (player.head.equipped)  { cout << "[" << player.head.name  << "] "; any_armor=true; }
    if (player.chest.equipped) { cout << "[" << player.chest.name << "] "; any_armor=true; }
    if (player.pants.equipped) { cout << "[" << player.pants.name << "] "; any_armor=true; }
    if (player.boots.equipped) { cout << "[" << player.boots.name << "] "; any_armor=true; }
    if (!any_armor) cout << "None";
    cout << "\n Acc   : ";
    bool any_acc = false;
    if (player.acc1.equipped) { cout << "[" << player.acc1.name << "] "; any_acc=true; }
    if (player.acc2.equipped) { cout << "[" << player.acc2.name << "] "; any_acc=true; }
    if (!any_acc) cout << "None";
    cout << "\n Items : ";
    bool any_item = false;
    if (player.has_torch)  { cout << "[Torch] ";  any_item=true; }
    if (player.has_rope)   { cout << "[Rope] ";   any_item=true; }
    if (player.has_potion) { cout << "[Potion] "; any_item=true; }
    if (!any_item) cout << "None";
    cout << "\n----------------------------------------\n";
}

// ============================================================
// EQUIPMENT SYSTEM
// ============================================================

void equip_weapon(Weapon w) {
    if (w.hands == TWO_HANDED) {
        if (player.weapon_main.equipped) log_event("Unequipped: " + player.weapon_main.name);
        if (player.weapon_off.equipped)  log_event("Unequipped: " + player.weapon_off.name);
        player.weapon_main = w;
        player.weapon_off  = empty_weapon();
        log_event("Equipped [2H]: " + w.name +
                  "  DMG:" + to_string(w.dmg_min) + "-" + to_string(w.dmg_max) +
                  "  SPD" + (w.speed_mod >= 0 ? "+" : "") + to_string(w.speed_mod));
    } else {
        if (player.is_two_handed()) {
            log_event("Unequipped 2H: " + player.weapon_main.name);
            player.weapon_main = w;
            player.weapon_off  = empty_weapon();
        } else if (!player.weapon_main.equipped) {
            player.weapon_main = w;
        } else if (!player.weapon_off.equipped) {
            player.weapon_off = w;
            log_event("Dual wielding! [" + player.weapon_main.name +
                      "] + [" + player.weapon_off.name + "]");
            return;
        } else {
            log_event("Swapped out main: " + player.weapon_main.name);
            player.weapon_main = w;
        }
        log_event("Equipped [1H]: " + w.name +
                  "  DMG:" + to_string(w.dmg_min) + "-" + to_string(w.dmg_max) +
                  "  SPD" + (w.speed_mod >= 0 ? "+" : "") + to_string(w.speed_mod));
    }
}

void equip_armor(ArmorPiece a) {
    ArmorPiece* slot_ptr = nullptr;
    switch (a.slot) {
        case SLOT_HEAD:  slot_ptr = &player.head;  break;
        case SLOT_CHEST: slot_ptr = &player.chest; break;
        case SLOT_PANTS: slot_ptr = &player.pants; break;
        case SLOT_BOOTS: slot_ptr = &player.boots; break;
        default: return;
    }
    if (slot_ptr->equipped) log_event("Unequipped: " + slot_ptr->name);
    *slot_ptr = a;
    if (a.hp_bonus > 0) {
        player.max_hp += a.hp_bonus;
        player.hp = min(player.hp + a.hp_bonus, player.max_hp);
    }
    log_event("Equipped: " + a.name +
              "  DEF+" + to_string(a.defense_bonus) +
              "  SPD" + (a.speed_mod >= 0 ? "+" : "") + to_string(a.speed_mod));
}

void equip_accessory(Accessory a) {
    // Apply stat bonuses
    player.max_hp += a.max_hp_bonus;
    player.hp = min(player.hp + a.hp_bonus, player.max_hp);

    if (!player.acc1.equipped) {
        player.acc1 = a;
    } else if (!player.acc2.equipped) {
        player.acc2 = a;
    } else {
        // Replace slot 1, undo its bonuses
        player.max_hp -= player.acc1.max_hp_bonus;
        player.hp = min(player.hp, player.max_hp);
        log_event("Replaced accessory: " + player.acc1.name);
        player.acc1 = a;
    }
    log_event("Accessory: [" + a.name + "] - " + a.effect_desc);
}

void show_equipment() {
    display_divider();
    cout << "\n  === EQUIPMENT DETAILS ===\n\n";
    cout << "  [WEAPONS]\n";
    if (player.weapon_main.equipped)
        cout << "  Main : " << player.weapon_main.name
             << "  DMG:" << player.weapon_main.dmg_min << "-" << player.weapon_main.dmg_max
             << "  SPD" << (player.weapon_main.speed_mod >= 0 ? "+" : "")
             << player.weapon_main.speed_mod
             << "  [" << (player.weapon_main.hands == TWO_HANDED ? "2H" : "1H") << "]\n";
    else cout << "  Main : (empty)\n";
    if (!player.is_two_handed()) {
        if (player.weapon_off.equipped)
            cout << "  Off  : " << player.weapon_off.name
                 << "  DMG:" << player.weapon_off.dmg_min << "-" << player.weapon_off.dmg_max
                 << "  SPD" << (player.weapon_off.speed_mod >= 0 ? "+" : "")
                 << player.weapon_off.speed_mod << "  [1H]\n";
        else cout << "  Off  : (empty - open for dual wield)\n";
    }
    cout << "\n  [ARMOR]\n";
    auto show_a = [](const char* label, ArmorPiece& a) {
        cout << "  " << label << ": ";
        if (a.equipped)
            cout << a.name << "  DEF+" << a.defense_bonus
                 << "  SPD" << (a.speed_mod >= 0 ? "+" : "") << a.speed_mod
                 << (a.hp_bonus ? "  HP+" + to_string(a.hp_bonus) : "") << "\n";
        else cout << "(none)\n";
    };
    show_a("Head ", player.head);
    show_a("Chest", player.chest);
    show_a("Pants", player.pants);
    show_a("Boots", player.boots);
    cout << "\n  [ACCESSORIES]\n";
    auto show_acc = [](const char* label, Accessory& a) {
        cout << "  " << label << ": ";
        if (a.equipped) cout << a.name << "\n     \"" << a.effect_desc << "\"\n";
        else cout << "(none)\n";
    };
    show_acc("Slot 1", player.acc1);
    show_acc("Slot 2", player.acc2);
    cout << "\n  [DERIVED TOTALS]\n";
    cout << "  DEF: " << player.get_defense()
         << "   SPD: " << player.get_speed()
         << "   EVA: " << player.get_evasion_pct() << "%\n";
}

// ============================================================
// ITEM GENERATION
// ============================================================

Weapon random_weapon(int floor_depth) {
    int base = min(floor_depth * 2, NUM_WEAPONS - 4);
    int idx  = base + rand() % 4;
    return WEAPON_POOL[max(0, min(idx, NUM_WEAPONS - 1))];
}
ArmorPiece random_armor(int floor_depth) {
    int slot_grp = rand() % 4;              // 0=head 1=chest 2=pants 3=boots
    int bias     = min(floor_depth - 1, 3);
    int idx      = slot_grp * 4 + rand() % (bias + 1);
    return ARMOR_POOL[min(idx, slot_grp * 4 + 3)];
}
Accessory random_accessory() { return ACC_POOL[rand() % NUM_ACCESSORIES]; }

// ============================================================
// COMBAT
// ============================================================

void use_potion() {
    if (player.has_potion) {
        int heal = 10 + roll_dice(8);
        player.hp = min(player.hp + heal, player.max_hp);
        player.has_potion = false;
        log_event("Drank potion. Recovered " + to_string(heal) + " HP.");
    } else {
        log_event("No potions!");
    }
}

void choice_fight(int enemy_hp, int enemy_atk, int enemy_def,
                  string name, int xp_reward, int gold_reward) {
    cout << "\n  *** COMBAT: " << player.name << " vs " << name << " ***\n";
    cout << "  Your EVA: " << player.get_evasion_pct()
         << "%   DEF: " << player.get_defense() << "\n\n";

    int  p_hp       = player.hp;
    int  e_hp       = enemy_hp;
    int  evasion    = player.get_evasion_pct();
    int  def        = player.get_defense();
    bool has_thorns  = (player.acc1.equipped && player.acc1.thorns)
                     ||(player.acc2.equipped && player.acc2.thorns);
    bool has_vamp    = (player.acc1.equipped && player.acc1.vampiric)
                     ||(player.acc2.equipped && player.acc2.vampiric);
    bool has_cursed  = (player.acc1.equipped && player.acc1.cursed)
                     ||(player.acc2.equipped && player.acc2.cursed);

    while (p_hp > 0 && e_hp > 0) {
        // Player attacks
        int p_dmg = max(1, player.roll_weapon_dmg() - enemy_def);
        e_hp -= p_dmg;
        cout << "  You deal " << p_dmg << " dmg. ("
             << max(0, e_hp) << " HP left on " << name << ")\n";
        if (e_hp <= 0) break;

        // Enemy attacks - check evasion
        if (rand() % 100 < evasion) {
            cout << "  You dodge " << name << "'s attack!\n";
        } else {
            int raw   = max(1, enemy_atk + roll_dice(4) - def);
            int extra = has_cursed ? 2 : 0;
            int e_dmg = raw + extra;
            p_hp -= e_dmg;
            cout << "  " << name << " deals " << e_dmg << " dmg. ("
                 << max(0, p_hp) << " HP left on you)\n";

            if (has_thorns) {
                int reflect = max(1, e_dmg / 4);
                e_hp -= reflect;
                cout << "  [Thorns] " << reflect << " dmg reflected!\n";
                if (e_hp <= 0) break;
            }
        }
    }

    player.hp = p_hp;

    if (player.hp <= 0) {
        player.hp    = 0;
        player.alive = false;
        cout << "\n  You have been slain by " << name << "...\n";
        game_over();
    } else {
        cout << "\n  You defeated " << name << "!\n";
        if (has_vamp) {
            player.hp = min(player.hp + 3, player.max_hp);
            log_event("[Vampiric] Drained 3 HP.");
        }
        player.xp   += xp_reward;
        player.gold += gold_reward;
        log_event("+" + to_string(xp_reward) + " XP, +" + to_string(gold_reward) + "g");

        if (player.xp >= player.level * 20) {
            player.level++;
            player.max_hp += 5;
            player.hp      = min(player.hp + 5, player.max_hp);
            player.base_defense++;
            player.speed   = min(player.speed + 1, 25);
            log_event("LEVEL UP! Lv." + to_string(player.level) +
                      " | MaxHP+5 | DEF+1 | SPD+1 | EVA now " +
                      to_string(player.get_evasion_pct()) + "%");
        }
    }
}

void choice_flee() {
    int roll = roll_dice(6);
    if (player.get_speed() >= 12) roll = min(6, roll + 1); // fast chars flee easier
    if (roll >= 3) {
        log_event("Escaped!");
        int lost = roll_dice(4);
        player.gold = max(0, player.gold - lost);
        if (lost) log_event("Dropped " + to_string(lost) + "g while fleeing.");
    } else {
        log_event("Failed to flee! Hit by a parting blow.");
        int dmg = max(1, roll_dice(6) - player.get_defense());
        player.hp -= dmg;
        log_event("Took " + to_string(dmg) + " dmg. HP: " +
                  to_string(player.hp) + "/" + to_string(player.max_hp));
        if (player.hp <= 0) { player.alive = false; game_over(); }
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
    cout << "  Level: " << player.level
         << "  Gold: " << player.gold << "g"
         << "  XP: " << player.xp << "\n";
    cout << "\n  The dungeon claims another soul...\n";
    display_divider();
    cout << "\n  Play again? (1) Yes  (2) No\n";
    if (get_choice(2) == 1) start_game();
    else cout << "\n  Farewell, adventurer.\n\n";
}

void victory() {
    display_divider();
    cout << "\n  *** VICTORY! ***\n\n";
    cout << "  " << player.name << " the " << player.class_name
         << " has conquered the dungeon!\n";
    cout << "  Level: " << player.level
         << "  Gold: " << player.gold << "g"
         << "  XP: " << player.xp << "\n";
    display_divider();
    cout << "\n  Play again? (1) Yes  (2) No\n";
    if (get_choice(2) == 1) start_game();
    else cout << "\n  Well done, adventurer.\n\n";
}

// ============================================================
// ENCOUNTERS
// ============================================================

void encounter_merchant() {
    display_divider();
    cout << "\n  A hooded merchant sits beside a lantern.\n";
    cout << "  \"Fine wares for the discerning dungeon-diver.\"\n\n";

    Weapon     sale_wpn = random_weapon(player.floor);
    ArmorPiece sale_arm = random_armor(player.floor);
    Accessory  sale_acc = random_accessory();

    int wpn_price = 8  + player.floor * 3;
    int arm_price = 6  + player.floor * 2;
    int acc_price = 12 + player.floor * 4;

    cout << "  1) Weapon    [" << wpn_price << "g] - " << sale_wpn.name
         << "  DMG:" << sale_wpn.dmg_min << "-" << sale_wpn.dmg_max
         << "  SPD" << (sale_wpn.speed_mod >= 0 ? "+" : "") << sale_wpn.speed_mod
         << "  [" << (sale_wpn.hands == TWO_HANDED ? "2H" : "1H") << "]\n";

    cout << "  2) Armor     [" << arm_price << "g] - " << sale_arm.name
         << "  DEF+" << sale_arm.defense_bonus
         << "  SPD" << (sale_arm.speed_mod >= 0 ? "+" : "") << sale_arm.speed_mod << "\n";

    cout << "  3) Accessory [" << acc_price << "g] - " << sale_acc.name
         << "\n     \"" << sale_acc.effect_desc << "\"\n";

    cout << "  4) Potion    [8g]\n";
    cout << "  5) Torch     [5g]\n";
    cout << "  6) Rope      [5g]\n";
    cout << "  7) Leave\n";
    display_stats();

    int c = get_choice(7);
    switch (c) {
        case 1: if (player.gold >= wpn_price) { player.gold -= wpn_price; equip_weapon(sale_wpn);    } else log_event("Not enough gold!"); break;
        case 2: if (player.gold >= arm_price) { player.gold -= arm_price; equip_armor(sale_arm);     } else log_event("Not enough gold!"); break;
        case 3: if (player.gold >= acc_price) { player.gold -= acc_price; equip_accessory(sale_acc); } else log_event("Not enough gold!"); break;
        case 4: if (player.gold >= 8) { player.gold -= 8; player.has_potion = true; log_event("Purchased Potion."); } else log_event("Not enough gold!"); break;
        case 5: if (player.gold >= 5) { player.gold -= 5; player.has_torch  = true; log_event("Purchased Torch.");  } else log_event("Not enough gold!"); break;
        case 6: if (player.gold >= 5) { player.gold -= 5; player.has_rope   = true; log_event("Purchased Rope.");   } else log_event("Not enough gold!"); break;
        default: log_event("You move on."); break;
    }
}

void encounter_monster() {
    if (!player.alive) return;
    string names[] = {"Skeleton", "Giant Rat", "Cave Troll", "Shadow Wraith", "Stone Golem"};
    int    idx     = min(player.floor - 1, 4);
    string name    = names[idx];
    int e_hp   = 6 + player.floor * 4 + roll_dice(4);
    int e_atk  = 1 + player.floor;
    int e_def  = player.floor / 2;
    int xp_r   = 8 + player.floor * 3;
    int gold_r = roll_dice(4) + player.floor * 2;

    display_divider();
    cout << "\n  A " << name << " blocks your path!\n";
    cout << "  HP: " << e_hp << "  ATK: " << e_atk << "  DEF: " << e_def << "\n\n";
    cout << "  1) Fight\n";
    cout << "  2) Flee\n";
    if (player.has_potion) cout << "  3) Drink Potion then fight\n";
    display_stats();

    int max_c = player.has_potion ? 3 : 2;
    int c = get_choice(max_c);
    if      (c == 3) { use_potion(); choice_fight(e_hp, e_atk, e_def, name, xp_r, gold_r); }
    else if (c == 2) { choice_flee(); }
    else             { choice_fight(e_hp, e_atk, e_def, name, xp_r, gold_r); }
}

void encounter_trap() {
    display_divider();
    int roll = roll_dice(6);
    if (player.has_torch || player.has_rope) {
        cout << "\n  You spot a pressure plate ahead.\n";
        if (player.has_torch) { cout << "  Torch reveals a safe path.\n"; log_event("Trap avoided (Torch)!"); }
        else                  { cout << "  Rope triggers it safely.\n";   log_event("Trap disarmed (Rope)!"); }
    } else if (roll >= 4) {
        cout << "\n  You barely spot the tripwire in time!\n";
        log_event("Trap avoided by luck! (rolled " + to_string(roll) + ")");
    } else {
        cout << "\n  CLICK. Darts fly from the wall!\n";
        int dmg = max(1, roll_dice(6) + 2 - player.get_defense());
        player.hp -= dmg;
        log_event("Trap hit you for " + to_string(dmg) + " dmg! HP: " +
                  to_string(player.hp) + "/" + to_string(player.max_hp));
        if (player.hp <= 0) { player.alive = false; game_over(); }
    }
}

void encounter_treasure() {
    display_divider();
    cout << "\n  A dusty chest sits in the corner.\n\n";
    cout << "  1) Open it\n";
    cout << "  2) Leave it\n";
    display_stats();

    if (get_choice(2) == 2) { log_event("You leave the chest alone."); return; }

    int roll = roll_dice(6);
    if (roll == 1) {
        int dmg = roll_dice(6);
        player.hp -= dmg;
        log_event("Mimic! Bitten for " + to_string(dmg) + " dmg!");
        if (player.hp <= 0) { player.alive = false; game_over(); }
        return;
    }
    int gold = roll_dice(10) + player.floor * 3;
    player.gold += gold;
    log_event("Found " + to_string(gold) + " gold!");

    int loot = roll_dice(6);
    if (loot == 6) {
        Accessory a = random_accessory();
        cout << "  Also found Accessory: " << a.name
             << "\n  \"" << a.effect_desc << "\"\n";
        cout << "  Equip? (1) Yes  (2) No\n";
        if (get_choice(2) == 1) equip_accessory(a);
    } else if (loot >= 4) {
        Weapon w = random_weapon(player.floor);
        cout << "  Also found Weapon: " << w.name
             << "  DMG:" << w.dmg_min << "-" << w.dmg_max
             << "  [" << (w.hands == TWO_HANDED ? "2H" : "1H") << "]\n";
        cout << "  Equip? (1) Yes  (2) No\n";
        if (get_choice(2) == 1) equip_weapon(w);
    } else if (loot == 3) {
        ArmorPiece ap = random_armor(player.floor);
        cout << "  Also found Armor: " << ap.name
             << "  DEF+" << ap.defense_bonus << "\n";
        cout << "  Equip? (1) Yes  (2) No\n";
        if (get_choice(2) == 1) equip_armor(ap);
    } else if (loot == 2) {
        player.has_potion = true;
        log_event("Also found a Healing Potion!");
    }
}

void encounter_shrine() {
    display_divider();
    cout << "\n  A glowing shrine hums with ancient power.\n";
    cout << "  'Offer your gold or your blood.'\n\n";
    cout << "  1) Offer 10g   -> SPD +3 permanently\n";
    cout << "  2) Offer 5 HP  -> Max HP +10\n";
    cout << "  3) Offer 15g   -> Random accessory blessing\n";
    cout << "  4) Ignore\n";
    display_stats();

    int c = get_choice(4);
    if (c == 1) {
        if (player.gold >= 10) {
            player.gold  -= 10;
            player.speed  = min(player.speed + 3, 25);
            log_event("Shrine blesses your feet! SPD+3, EVA now " +
                      to_string(player.get_evasion_pct()) + "%");
        } else log_event("Not enough gold.");
    } else if (c == 2) {
        if (player.hp > 6) {
            player.hp    -= 5;
            player.max_hp += 10;
            log_event("Life force expands. MaxHP+10.");
        } else log_event("Too weak to offer.");
    } else if (c == 3) {
        if (player.gold >= 15) {
            player.gold -= 15;
            Accessory a = random_accessory();
            cout << "  Shrine manifests: " << a.name
                 << "\n  \"" << a.effect_desc << "\"\n";
            equip_accessory(a);
        } else log_event("Not enough gold.");
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
    int b_atk = 3  + player.floor * 2;
    int b_def = 2  + player.floor;

    cout << "  Boss HP: " << b_hp
         << "  ATK: " << b_atk
         << "  DEF: " << b_def << "\n\n";
    cout << "  1) Fight\n";
    if (player.has_potion) cout << "  2) Drink Potion first\n";
    display_stats();

    int max_c = player.has_potion ? 2 : 1;
    if (get_choice(max_c) == 2) use_potion();
    choice_fight(b_hp, b_atk, b_def, "Dungeon Warden",
                 50 + player.floor * 10, 20 + player.floor * 5);

    if (player.alive) {
        cout << "\n  The Warden dissolves. It leaves something behind...\n";
        int drop = roll_dice(3);
        if (drop == 1) {
            Weapon w = random_weapon(player.floor + 1);
            cout << "  Boss Drop - " << w.name
                 << "  DMG:" << w.dmg_min << "-" << w.dmg_max
                 << "  [" << (w.hands == TWO_HANDED ? "2H" : "1H") << "]\n";
            cout << "  Equip? (1) Yes  (2) No\n";
            if (get_choice(2) == 1) equip_weapon(w);
        } else if (drop == 2) {
            ArmorPiece ap = random_armor(player.floor + 1);
            cout << "  Boss Drop - " << ap.name
                 << "  DEF+" << ap.defense_bonus << "\n";
            cout << "  Equip? (1) Yes  (2) No\n";
            if (get_choice(2) == 1) equip_armor(ap);
        } else {
            Accessory a = random_accessory();
            cout << "  Boss Drop - " << a.name
                 << "\n  \"" << a.effect_desc << "\"\n";
            cout << "  Equip? (1) Yes  (2) No\n";
            if (get_choice(2) == 1) equip_accessory(a);
        }

        if (player.floor >= 5) {
            victory();
        } else {
            log_event("The Warden's key clatters to the floor. Descending...");
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
        cout << "  Without a torch you stumble in the pitch black.\n";
        if (roll_dice(6) <= 2) {
            int dmg = max(1, roll_dice(4) - player.get_defense());
            player.hp -= dmg;
            log_event("Walked into a wall! " + to_string(dmg) + " dmg.");
            if (player.hp <= 0) { player.alive = false; game_over(); return; }
        }
    } else {
        cout << "  Your torch lights the way. You spot something...\n";
    }
    int r = roll_dice(4);
    if      (r == 1) encounter_trap();
    else if (r == 2) encounter_treasure();
    else if (r == 3) encounter_monster();
    else             encounter_shrine();
}

void path_right_corridor() {
    display_divider();
    cout << "\n  The right corridor opens into a small chamber.\n";
    cout << "  You hear voices... a merchant, perhaps?\n";
    if (roll_dice(4) <= 2) encounter_merchant();
    else { cout << "  Ambush! A monster was waiting.\n"; encounter_monster(); }
}

void path_center_stairs() {
    display_divider();
    cout << "\n  The center path leads to stone stairs going deeper.\n";
    if (player.floor % 3 == 0) {
        cout << "  A heavy iron door blocks the way. Something stirs behind it.\n";
        encounter_boss();
    } else {
        cout << "  You descend to Floor " << player.floor + 1 << ".\n";
        player.floor++;
        int heal = roll_dice(4);
        player.hp = min(player.hp + heal, player.max_hp);
        log_event("Rested briefly. Recovered " + to_string(heal) + " HP.");
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

    string rooms[] = {
        "The air reeks of rot. Bones crunch beneath your boots.",
        "Faint torchlight flickers from somewhere ahead.",
        "Water drips from the ceiling. The walls are slick with moss.",
        "Ancient carvings line the walls. Something watches you.",
        "A cold wind howls through the corridor. Death is near."
    };
    cout << "  " << rooms[roll_dice(5) - 1] << "\n\n";

    cout << "  Three paths stretch before you:\n";
    cout << "  1) Left Corridor   - Dark and narrow\n";
    cout << "  2) Right Chamber   - You hear shuffling\n";
    cout << "  3) Center Stairs   - Descend deeper\n";
    cout << "  4) Check stats\n";
    cout << "  5) View equipment\n";

    int c = get_choice(5);
    if      (c == 1) { path_left_corridor();  if (player.alive) floor_start(); }
    else if (c == 2) { path_right_corridor(); if (player.alive) floor_start(); }
    else if (c == 3) { path_center_stairs(); }
    else if (c == 4) { display_stats();       floor_start(); }
    else             { show_equipment();      floor_start(); }
}

// ============================================================
// CLASS SELECTION
// ============================================================

void choose_class() {
    display_divider();
    cout << "\n  Choose your class:\n\n";
    cout << "  1) WARRIOR  - HP:28  DEF:3  SPD:8\n";
    cout << "     Starts: Short Sword + Iron Helm + Torch\n";
    cout << "     Tough and reliable. Built to absorb damage.\n\n";
    cout << "  2) ROGUE    - HP:20  DEF:1  SPD:14\n";
    cout << "     Starts: Twin Fang Daggers (main) + Rusty Dagger (off) + Rope\n";
    cout << "     High evasion glass cannon. Dual wields from the start.\n\n";
    cout << "  3) SCHOLAR  - HP:22  DEF:2  SPD:10\n";
    cout << "     Starts: Bone Wand + Lucky Coin accessory + Potion\n";
    cout << "     Versatile. Lucky dice rolls give a surprising edge.\n\n";

    int c = get_choice(3);

    player.xp          = 0;
    player.level       = 1;
    player.gold        = 10;
    player.floor       = 1;
    player.alive       = true;
    player.has_torch   = false;
    player.has_rope    = false;
    player.has_potion  = false;
    player.weapon_main = empty_weapon();
    player.weapon_off  = empty_weapon();
    player.head        = empty_armor(SLOT_HEAD);
    player.chest       = empty_armor(SLOT_CHEST);
    player.pants       = empty_armor(SLOT_PANTS);
    player.boots       = empty_armor(SLOT_BOOTS);
    player.acc1        = empty_accessory();
    player.acc2        = empty_accessory();

    if (c == 1) {
        player.class_name   = "Warrior";
        player.max_hp       = 28; player.hp = 28;
        player.base_defense = 3;
        player.speed        = 8;
        player.has_torch    = true;
        equip_weapon(WEAPON_POOL[1]);   // Short Sword (1H)
        equip_armor(ARMOR_POOL[1]);     // Iron Helm
    } else if (c == 2) {
        player.class_name   = "Rogue";
        player.max_hp       = 20; player.hp = 20;
        player.base_defense = 1;
        player.speed        = 14;
        player.has_rope     = true;
        equip_weapon(WEAPON_POOL[12]);  // Twin Fang Daggers (1H)
        equip_weapon(WEAPON_POOL[0]);   // Rusty Dagger (1H) -> off-hand auto
    } else {
        player.class_name   = "Scholar";
        player.max_hp       = 22; player.hp = 22;
        player.base_defense = 2;
        player.speed        = 10;
        player.has_potion   = true;
        equip_weapon(WEAPON_POOL[13]);  // Bone Wand (1H)
        equip_accessory(ACC_POOL[2]);   // Lucky Coin
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
    cout << "  Survive 5 floors. Gear up. Escape alive.\n";
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
        cout << "  GOAL: Survive 5 floors and slay the final boss.\n\n";
        cout << "  PATHS each floor:\n";
        cout << "    Left Corridor  - traps, treasure, monsters, shrines\n";
        cout << "    Right Chamber  - merchant or ambush\n";
        cout << "    Center Stairs  - descend (boss every 3rd floor)\n\n";
        cout << "  WEAPONS:\n";
        cout << "    1H weapons: hold up to 2 (dual wield, off-hand = 60% dmg)\n";
        cout << "    2H weapons: powerful but fills both slots\n";
        cout << "    Damage comes ONLY from weapons, not base stats\n\n";
        cout << "  ARMOR: Head / Chest / Pants / Boots\n";
        cout << "    Each piece adds DEF and may adjust SPD\n\n";
        cout << "  SPEED & EVASION:\n";
        cout << "    SPD determines your % chance to dodge attacks\n";
        cout << "    Formula: SPD / (SPD+10) * 100, capped 5-60%\n";
        cout << "    Heavy gear lowers SPD; fast gear raises it\n\n";
        cout << "  ACCESSORIES (BoI-style):\n";
        cout << "    Thorn Ring    - reflect 25% of damage taken\n";
        cout << "    Vampire Fang  - heal 3 HP on each kill\n";
        cout << "    Lucky Coin    - +1 to all dice & damage rolls\n";
        cout << "    Cursed Idol   - +4 dmg dealt, but +2 dmg taken\n";
        cout << "    Featherstone  - ignore all speed penalties\n";
        cout << "    Phantom Ring  - Weightless + Lucky combined\n";
        cout << "    ...and 8 more to discover!\n\n";
        cout << "  PERMADEATH: HP 0 = run ends. Start over.\n";
        display_divider();
        main_menu();
    } else {
        cout << "\n  Farewell, adventurer.\n\n";
    }
}

#endif // M5LAB1_H