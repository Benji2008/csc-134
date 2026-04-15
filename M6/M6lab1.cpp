//slime roulette 
//m6lab1
//hiltibbidal
//4/15/26
okay make 
#include <iostream>
#include <vector>
#include <algorithm>
#include <random>
#include <string>
#include <thread>
#include <chrono>
#include <map>
#include <sstream>

using namespace std;

// ─────────────────────────────────────────
//  ANSI Color Codes
// ─────────────────────────────────────────
#define RESET   "\033[0m"
#define BOLD    "\033[1m"
#define DIM     "\033[2m"
#define RED     "\033[31m"
#define GREEN   "\033[32m"
#define YELLOW  "\033[33m"
#define CYAN    "\033[36m"
#define MAGENTA "\033[35m"
#define WHITE   "\033[97m"
#define BG_RED  "\033[41m"
#define BG_GREEN "\033[42m"

// ─────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────
void sleep_ms(int ms) {
    this_thread::sleep_for(chrono::milliseconds(ms));
}

void clearScreen() {
    cout << "\033[2J\033[H";
}

void printSlow(const string& msg, int delay = 30) {
    for (char c : msg) {
        cout << c << flush;
        sleep_ms(delay);
    }
}

string repeat(const string& s, int n) {
    string result;
    for (int i = 0; i < n; i++) result += s;
    return result;
}

void pressEnter() {
    cout << DIM << "\n  [ Press ENTER to continue ]" << RESET;
    cin.ignore(numeric_limits<streamsize>::max(), '\n');
    cin.get();
}

// ─────────────────────────────────────────
//  Items
// ─────────────────────────────────────────
enum Item {
    ITEM_PEEK,       // See the next shell
    ITEM_SKIP,       // Force dealer to skip their turn
    ITEM_HEAL,       // Restore 1 HP
    ITEM_DOUBLE_DMG, // Next slime shot does 2 HP
    ITEM_BLANK_SHOT, // Force load 1 guaranteed water shell
    ITEM_NONE
};

string itemName(Item it) {
    switch (it) {
        case ITEM_PEEK:      return "Magnifying Glass";
        case ITEM_SKIP:      return "Stun Grenade";
        case ITEM_HEAL:      return "Med Kit";
        case ITEM_DOUBLE_DMG:return "Adrenaline";
        case ITEM_BLANK_SHOT:return "Water Jug";
        default:             return "???";
    }
}

string itemDesc(Item it) {
    switch (it) {
        case ITEM_PEEK:      return "Peek the next shell in the mag.";
        case ITEM_SKIP:      return "Dealer skips their next turn.";
        case ITEM_HEAL:      return "Restore 1 HP (max 6).";
        case ITEM_DOUBLE_DMG:return "Your next shot deals 2 damage.";
        case ITEM_BLANK_SHOT:return "Insert 1 Water shell at the front.";
        default:             return "";
    }
}

string itemColor(Item it) {
    switch (it) {
        case ITEM_PEEK:      return CYAN;
        case ITEM_SKIP:      return YELLOW;
        case ITEM_HEAL:      return GREEN;
        case ITEM_DOUBLE_DMG:return RED;
        case ITEM_BLANK_SHOT:return MAGENTA;
        default:             return WHITE;
    }
}

// ─────────────────────────────────────────
//  Player / Dealer State
// ─────────────────────────────────────────
struct Entity {
    string name;
    int hp;
    int maxHp;
    vector<Item> items;

    bool isAlive() const { return hp > 0; }

    void takeDamage(int dmg) {
        hp -= dmg;
        if (hp < 0) hp = 0;
    }

    void heal(int amt) {
        hp += amt;
        if (hp > maxHp) hp = maxHp;
    }
};

// ─────────────────────────────────────────
//  Magazine
// ─────────────────────────────────────────
void loadMagazine(vector<char>& mag, int slime, int water) {
    mag.clear();
    for (int i = 0; i < slime; i++) mag.push_back('S');
    for (int i = 0; i < water; i++) mag.push_back('W');
    random_device rd;
    mt19937 gen(rd());
    shuffle(mag.begin(), mag.end(), gen);
}

char peekNext(const vector<char>& mag) {
    if (mag.empty()) return '?';
    return mag.back();
}

char fireShot(vector<char>& mag) {
    if (mag.empty()) return '?';
    char shell = mag.back();
    mag.pop_back();
    return shell;
}

// ─────────────────────────────────────────
//  Display
// ─────────────────────────────────────────
void printBanner() {
    cout << GREEN << BOLD;
    cout << R"(
  ╔══════════════════════════════════════════════════╗
  ║   ___  _     _               ___           _    ║
  ║  / __|| |   (_) _ __   ___  | _ \ ___  _  | |   ║
  ║  \__ \| |__ | || '  \ / -_) |   // _ \| || | _ ║
  ║  |___/|____||_||_|_|_|\___| |_|_\\___/ \_,_|(_)║
  ║                                                  ║
  ║         ☣  SLIME ROULETTE  ☣   v1.0              ║
  ╚══════════════════════════════════════════════════╝
)" << RESET;
}

void printHPBar(const Entity& e) {
    cout << BOLD << e.name << RESET << " HP: [";
    for (int i = 0; i < e.maxHp; i++) {
        if (i < e.hp)
            cout << RED << "♥" << RESET;
        else
            cout << DIM << "♡" << RESET;
    }
    cout << "] " << e.hp << "/" << e.maxHp << "\n";
}

void printMagInfo(const vector<char>& mag) {
    int s = 0, w = 0;
    for (char c : mag) { if (c == 'S') s++; else w++; }
    cout << CYAN << "  ┌─ MAGAZINE ─────────────────────┐\n";
    cout << "  │  Shells: " << mag.size()
         << "  [" << RED << s << " SLIME" << CYAN << " / "
         << MAGENTA << w << " WATER" << CYAN << "]\n";
    cout << "  └────────────────────────────────┘\n" << RESET;
}

void printStatus(const Entity& player, const Entity& dealer, const vector<char>& mag) {
    cout << "\n" << repeat("─", 52) << "\n";
    printHPBar(player);
    printHPBar(dealer);
    cout << repeat("─", 52) << "\n";
    printMagInfo(mag);
}

void printItems(const Entity& e) {
    if (e.items.empty()) {
        cout << DIM << "  (no items)\n" << RESET;
        return;
    }
    for (int i = 0; i < (int)e.items.size(); i++) {
        Item it = e.items[i];
        cout << itemColor(it) << "  [" << (i + 1) << "] "
             << itemName(it) << RESET
             << " - " << DIM << itemDesc(it) << RESET << "\n";
    }
}

// ─────────────────────────────────────────
//  Item Granting
// ─────────────────────────────────────────
Item randomItem() {
    static mt19937 rng(random_device{}());
    uniform_int_distribution<int> dist(0, 4);
    return static_cast<Item>(dist(rng));
}

void grantItems(Entity& player, Entity& dealer, int count) {
    cout << YELLOW << "\n  ★  Items distributed!\n" << RESET;
    for (int i = 0; i < count; i++) {
        Item pi = randomItem();
        Item di = randomItem();
        player.items.push_back(pi);
        dealer.items.push_back(di);
        cout << GREEN << "  You got: " << BOLD << itemName(pi) << RESET << "\n";
        cout << RED << "  Dealer got: " << BOLD << "???" << RESET << "\n";
        sleep_ms(300);
    }
}

// ─────────────────────────────────────────
//  Dealer AI
// ─────────────────────────────────────────
int dealerUseItem(Entity& dealer, Entity& player, vector<char>& mag, bool& doubleDmg) {
    // Simple AI: use items based on situation
    for (int i = 0; i < (int)dealer.items.size(); i++) {
        Item it = dealer.items[i];

        // Heal if low
        if (it == ITEM_HEAL && dealer.hp <= 2) {
            dealer.items.erase(dealer.items.begin() + i);
            dealer.heal(1);
            cout << RED << "  [DEALER] Uses " << itemName(it) << " — heals to " << dealer.hp << " HP!\n" << RESET;
            return 1;
        }
        // Double damage if player is at 1 HP — go for the kill
        if (it == ITEM_DOUBLE_DMG && player.hp == 1) {
            dealer.items.erase(dealer.items.begin() + i);
            doubleDmg = true;
            cout << RED << "  [DEALER] Injects " << itemName(it) << " — next shot deals 2 DMG!\n" << RESET;
            return 1;
        }
        // Peek if mag is nearly empty
        if (it == ITEM_PEEK && (int)mag.size() <= 2) {
            dealer.items.erase(dealer.items.begin() + i);
            cout << RED << "  [DEALER] Peers through the " << itemName(it) << "...\n" << RESET;
            return 1;
        }
    }
    return 0; // no item used
}

// ─────────────────────────────────────────
//  Player uses an item
// ─────────────────────────────────────────
bool playerUseItem(Entity& player, Entity& dealer, vector<char>& mag,
                   bool& doubleDmg, bool& dealerSkip) {
    cout << YELLOW << "\n  Your items:\n" << RESET;
    printItems(player);

    if (player.items.empty()) {
        cout << DIM << "  No items to use.\n" << RESET;
        return false;
    }

    cout << "  Enter item number to use (or 0 to skip): ";
    int choice;
    cin >> choice;
    if (choice <= 0 || choice > (int)player.items.size()) return false;

    Item it = player.items[choice - 1];
    player.items.erase(player.items.begin() + (choice - 1));

    cout << GREEN << "\n  You use: " << BOLD << itemName(it) << RESET << "\n";

    switch (it) {
        case ITEM_PEEK: {
            char next = peekNext(mag);
            cout << CYAN << "  ► Next shell is: " << BOLD
                 << (next == 'S' ? RED : MAGENTA) << (next == 'S' ? "SLIME ☣" : "WATER 💧")
                 << RESET << "\n";
            break;
        }
        case ITEM_SKIP:
            dealerSkip = true;
            cout << YELLOW << "  ► Dealer will skip their next turn!\n" << RESET;
            break;
        case ITEM_HEAL:
            player.heal(1);
            cout << GREEN << "  ► You healed to " << player.hp << " HP!\n" << RESET;
            break;
        case ITEM_DOUBLE_DMG:
            doubleDmg = true;
            cout << RED << "  ► Your next shot deals 2 damage!\n" << RESET;
            break;
        case ITEM_BLANK_SHOT:
            mag.insert(mag.begin(), 'W'); // insert water at front (fires last, since we fire from back — insert at index 0)
            cout << MAGENTA << "  ► Inserted a Water shell into the magazine!\n" << RESET;
            break;
        default: break;
    }
    sleep_ms(600);
    return true;
}

// ─────────────────────────────────────────
//  Shot Sequence
// ─────────────────────────────────────────
void animateShot(char shell) {
    cout << "\n";
    printSlow("  ★ Pulling the trigger", 60);
    sleep_ms(400);
    cout << " .";
    sleep_ms(400);
    cout << " .";
    sleep_ms(400);
    cout << " .\n";
    sleep_ms(600);

    if (shell == 'S') {
        cout << BG_RED << BOLD << "\n  ☣  SLIME! ☣\n" << RESET;
    } else {
        cout << MAGENTA << BOLD << "\n  💧  WATER. Click.\n" << RESET;
    }
    sleep_ms(800);
}

// ─────────────────────────────────────────
//  Round Setup
// ─────────────────────────────────────────
struct RoundConfig {
    int slime, water, items;
};

RoundConfig getRoundConfig(int round) {
    // Each round gets harder
    if (round == 1) return {2, 3, 1};
    if (round == 2) return {3, 3, 2};
    if (round == 3) return {4, 2, 2};
    return {4, 2, 3};
}

// ─────────────────────────────────────────
//  MAIN GAME LOOP
// ─────────────────────────────────────────
int main() {
    clearScreen();
    printBanner();
    cout << "\n";
    printSlow("  Welcome, contestant. The rules are simple.\n", 25);
    printSlow("  You and the dealer take turns shooting.\n", 25);
    printSlow("  Slime costs you HP. Water is a blank.\n", 25);
    printSlow("  You choose: shoot yourself or the dealer.\n", 25);
    printSlow("  If you shoot yourself with Water... you go again.\n\n", 25);
    pressEnter();

    Entity player = {"YOU", 5, 5, {}};
    Entity dealer = {"DEALER", 5, 5, {}};

    vector<char> magazine;
    bool doubleDmg = false;
    bool dealerSkip = false;

    int round = 0;
    mt19937 rng(random_device{}());

    while (player.isAlive() && dealer.isAlive()) {
        round++;
        clearScreen();
        printBanner();

        // ── Round start ──
        RoundConfig cfg = getRoundConfig(round);
        cout << YELLOW << BOLD << "\n  ══ ROUND " << round << " ══\n" << RESET;
        sleep_ms(500);

        loadMagazine(magazine, cfg.slime, cfg.water);
        grantItems(player, dealer, cfg.items);
        doubleDmg = false;
        dealerSkip = false;

        pressEnter();

        // ── Turn loop ──
        bool playerTurn = true; // player always goes first each round

        while (!magazine.empty() && player.isAlive() && dealer.isAlive()) {
            clearScreen();
            printStatus(player, dealer, magazine);

            if (playerTurn) {
                // ── Player turn ──
                cout << GREEN << BOLD << "\n  YOUR TURN\n" << RESET;

                // Item menu (can use multiple items per turn)
                char useMore = 'y';
                while (useMore == 'y' && !player.items.empty()) {
                    cout << "\n  Use an item? (y/n): ";
                    cin >> useMore;
                    if (useMore == 'y') {
                        playerUseItem(player, dealer, magazine, doubleDmg, dealerSkip);
                        clearScreen();
                        printStatus(player, dealer, magazine);
                    }
                }

                // Shoot choice
                cout << "\n  Who do you shoot?\n";
                cout << "  [1] " << RED << "Dealer" << RESET << "\n";
                cout << "  [2] " << YELLOW << "Yourself" << RESET << "\n";
                cout << "  Choice: ";
                int sc;
                cin >> sc;

                char shell = fireShot(magazine);
                animateShot(shell);

                if (sc == 1) {
                    // Shoot dealer
                    if (shell == 'S') {
                        int dmg = doubleDmg ? 2 : 1;
                        doubleDmg = false;
                        dealer.takeDamage(dmg);
                        cout << RED << "  Dealer takes " << dmg << " damage! (" << dealer.hp << " HP left)\n" << RESET;
                        playerTurn = false; // switch turns
                    } else {
                        cout << MAGENTA << "  Blank! Dealer is safe. Turn passes.\n" << RESET;
                        playerTurn = false;
                    }
                } else {
                    // Shoot self
                    if (shell == 'S') {
                        int dmg = doubleDmg ? 2 : 1;
                        doubleDmg = false;
                        player.takeDamage(dmg);
                        cout << RED << "  You take " << dmg << " damage! (" << player.hp << " HP left)\n" << RESET;
                        playerTurn = false; // turn switches on slime
                    } else {
                        cout << GREEN << "  Blank! Smart. You get another turn!\n" << RESET;
                        // playerTurn stays true — free turn!
                    }
                }

            } else {
                // ── Dealer turn ──
                cout << RED << BOLD << "\n  DEALER'S TURN\n" << RESET;
                sleep_ms(800);

                if (dealerSkip) {
                    cout << YELLOW << "  Dealer is stunned — skips their turn!\n" << RESET;
                    dealerSkip = false;
                    playerTurn = true;
                    sleep_ms(800);
                    continue;
                }

                // Dealer uses items
                dealerUseItem(dealer, player, magazine, doubleDmg);
                sleep_ms(500);

                // Dealer AI: peek if possible
                char next = peekNext(magazine);
                bool shootSelf = false;

                // If next shell is water, dealer shoots self (gets free turn)
                // Smart dealer peeks based on odds
                int slimeCount = 0;
                for (char c : magazine) if (c == 'S') slimeCount++;
                float slimeOdds = magazine.empty() ? 0 : (float)slimeCount / magazine.size();

                if (slimeOdds < 0.4f) {
                    // More water than slime — shoot self for free turn
                    shootSelf = true;
                }

                char shell = fireShot(magazine);

                if (shootSelf) {
                    cout << RED << "  Dealer gambles — shoots themselves!\n" << RESET;
                    sleep_ms(400);
                    animateShot(shell);
                    if (shell == 'S') {
                        int dmg = doubleDmg ? 2 : 1;
                        doubleDmg = false;
                        dealer.takeDamage(dmg);
                        cout << RED << "  Dealer takes " << dmg << " damage! (" << dealer.hp << " HP left)\n" << RESET;
                        playerTurn = true;
                    } else {
                        cout << RED << "  Dealer gets a free turn!\n" << RESET;
                        // stays dealer's turn
                    }
                } else {
                    cout << RED << "  Dealer aims at you...\n" << RESET;
                    sleep_ms(600);
                    animateShot(shell);
                    if (shell == 'S') {
                        int dmg = doubleDmg ? 2 : 1;
                        doubleDmg = false;
                        player.takeDamage(dmg);
                        cout << RED << "  You take " << dmg << " damage! (" << player.hp << " HP left)\n" << RESET;
                        playerTurn = true;
                    } else {
                        cout << MAGENTA << "  Blank! Turn passes to you.\n" << RESET;
                        playerTurn = true;
                    }
                }
            }

            if (!player.isAlive() || !dealer.isAlive()) break;
            pressEnter();
        }

        // ── Post-round ──
        if (!player.isAlive() || !dealer.isAlive()) break;

        cout << YELLOW << BOLD << "\n  ── Round " << round << " complete! Magazine empty. ──\n" << RESET;
        cout << GREEN << "  You survived the round.\n" << RESET;

        // Restore a little HP each round
        player.heal(1);
        dealer.heal(1);
        cout << GREEN << "  Everyone restores 1 HP.\n" << RESET;
        sleep_ms(1000);
        pressEnter();
    }

    // ── Game Over ──
    clearScreen();
    printBanner();
    cout << "\n";

    if (player.isAlive()) {
        cout << BG_GREEN << BOLD << WHITE;
        cout << "\n  ╔══════════════════════════════╗\n";
        cout << "  ║   ★  YOU WIN!  ★             ║\n";
        cout << "  ║   The dealer has been slimed. ║\n";
        cout << "  ╚══════════════════════════════╝\n" << RESET;
    } else {
        cout << BG_RED << BOLD << WHITE;
        cout << "\n  ╔══════════════════════════════╗\n";
        cout << "  ║   ✗  GAME OVER  ✗            ║\n";
        cout << "  ║   You have been slimed.       ║\n";
        cout << "  ╚══════════════════════════════╝\n" << RESET;
    }

    cout << "\n  Rounds survived: " << round << "\n\n";
    return 0;
}