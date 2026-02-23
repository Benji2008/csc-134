// M3LAB1
// norrisa
// 2/23/26

#include <iostream>
using namespace std;

// PROTOTYPES
void do_jump_meteor();
void do_selfie_meteor();
void do_reason_geese();
void do_runthrough_geese();
void do_pay_machine();
void do_kick_machine();
void do_solve_equation();

int main() {

    int choice;

    cout << "=== TOTALLY NORMAL TUESDAY ===" << endl << endl;
    cout << "You're walking to school when a GIANT METEOR crashes in front of you." << endl;
    cout << "Do you: " << endl;
    cout << "1. Stand there and take a selfie with it" << endl;
    cout << "2. Jump over it like a cool action hero" << endl;

    cout << "> ";
    cin >> choice;

    if (1 == choice) {
        do_selfie_meteor();   // 1 = DIE
    }
    else if (2 == choice) {
        do_jump_meteor();     // 2 = SURVIVE
    }
    else {
        cout << "I didn't understand that." << endl;
    }

    cout << endl << "*GAME OVER*" << endl << endl;
    return 0;
}


// ---- SELFIE WITH METEOR: Die ----
void do_selfie_meteor() {
    cout << endl;
    cout << "You pull out your phone for the perfect shot..." << endl;
    cout << "The meteor, offended by your flash, rolls over and flattens you." << endl;
    cout << "Your last photo auto-uploads with 47,000 likes." << endl;
    cout << "YOU DIED. (Posthumous influencer, congrats.)" << endl;
}

// ---- JUMP OVER METEOR: Survive ----
void do_jump_meteor() {
    cout << endl;
    cout << "You leap over the meteor doing a perfect triple backflip." << endl;
    cout << "A passing pigeon witnesses it and starts slow-clapping." << endl;
    cout << "You land safely on the other side." << endl << endl;

    int choice;
    cout << "Now a PACK OF ANGRY GEESE blocks the sidewalk, honking like maniacs." << endl;
    cout << "Do you: " << endl;
    cout << "1. Try to reason with them calmly" << endl;
    cout << "2. Run straight through them screaming" << endl;
    cout << "> ";
    cin >> choice;

    if (1 == choice) {
        do_reason_geese();    // 1 = SURVIVE
    } else {
        do_runthrough_geese(); // 2 = DIE
    }
}

// ---- REASON WITH GEESE: Survive ----
void do_reason_geese() {
    cout << endl;
    cout << "You sit down cross-legged and say 'I hear you, friends.'" << endl;
    cout << "The lead goose stares at you for 10 seconds... then bows." << endl;
    cout << "They form a guard of honor and escort you past." << endl << endl;

    int choice;
    cout << "You arrive at school but a ROGUE VENDING MACHINE is blocking the door," << endl;
    cout << "shaking aggressively and demanding exact change." << endl;
    cout << "Do you: " << endl;
    cout << "1. Kick it and tell it to calm down" << endl;
    cout << "2. Give it exact change" << endl;
    cout << "> ";
    cin >> choice;

    if (1 == choice) {
        do_kick_machine();    // 1 = DIE
    } else {
        do_pay_machine();     // 2 = SURVIVE
    }
}

// ---- RUN THROUGH GEESE: Die ----
void do_runthrough_geese() {
    cout << endl;
    cout << "You sprint into the flock screaming at full volume." << endl;
    cout << "The geese, deeply insulted, form a tornado around you." << endl;
    cout << "You are launched 40 feet into the air and land in a fountain." << endl;
    cout << "A goldfish witnesses everything. He tells no one." << endl;
    cout << "YOU DIED. (Cause of death: disrespecting geese.)" << endl;
}

// ---- KICK THE MACHINE: Die ----
void do_kick_machine() {
    cout << endl;
    cout << "You kick the machine right in the coin slot." << endl;
    cout << "It lets out a mechanical SHRIEK, tips forward," << endl;
    cout << "and pins you to the ground with the full force of 200 bags of Doritos." << endl;
    cout << "Doritos: 1. You: 0." << endl;
    cout << "YOU DIED. (Nacho average ending.)" << endl;
}

// ---- PAY THE MACHINE: Survive ----
void do_pay_machine() {
    cout << endl;
    cout << "You calmly insert $1.75 in exact nickels." << endl;
    cout << "The machine sighs in relief, hands you a free bag of chips," << endl;
    cout << "and rolls itself politely out of the way." << endl << endl;

    int choice;
    cout << "Inside school, your MATH TEACHER has transformed into a DRAGON" << endl;
    cout << "and is demanding everyone solve a quadratic equation or be roasted." << endl;
    cout << "Do you: " << endl;
    cout << "1. Actually solve the equation" << endl;
    cout << "2. Compliment the dragon's scales to distract it" << endl;
    cout << "> ";
    cin >> choice;

    if (1 == choice) {
        do_solve_equation();  // 1 = SURVIVE
    } else {
        // 2 = DIE
        cout << endl;
        cout << "The dragon pauses, flustered. 'Are... are they periwinkle?'" << endl;
        cout << "It gets emotional, cries a single lava tear, and accidentally" << endl;
        cout << "sneezes you out the window at 200 mph." << endl;
        cout << "You land on a trampoline, bounce once, and disappear into the clouds." << endl;
        cout << "YOU DIED. (Technically still ascending.)" << endl;
    }
}

// ---- SOLVE THE EQUATION: Survive ----
void do_solve_equation() {
    cout << endl;
    cout << "You walk to the board and write out the full solution flawlessly." << endl;
    cout << "The dragon sheds a single tear of pride." << endl;
    cout << "'Finally,' it whispers. It transforms back into Mr. Henderson." << endl;
    cout << "He gives you a gold star and an A+ for the semester." << endl << endl;

    int choice;
    cout << "At lunch, an ALIEN SPACESHIP lands in the cafeteria." << endl;
    cout << "The alien points at you specifically and says 'YOU. COME.'" << endl;
    cout << "Do you: " << endl;
    cout << "1. Just bolt and hide in your locker" << endl;
    cout << "2. Ask if they have good snacks on the ship first" << endl;
    cout << "> ";
    cin >> choice;

    if (1 == choice) {
        // 1 = DIE
        cout << endl;
        cout << "You sprint to your locker and squeeze inside." << endl;
        cout << "The alien finds you in 4 seconds because you forgot it has 360-degree vision." << endl;
        cout << "It picks up the entire locker, waves goodbye to the cafeteria," << endl;
        cout << "and launches it like a football into deep space." << endl;
        cout << "YOU DIED. (Your locker smells terrible in space too.)" << endl;
    } else {
        // 2 = WIN
        cout << endl;
        cout << "The alien blinks all six of its eyes. 'We have... Pringles.'" << endl;
        cout << "You are immediately teleported aboard." << endl;
        cout << "Turns out the whole universe has been waiting to meet you." << endl;
        cout << "They crown you Galactic Snack Ambassador." << endl;
        cout << "You never have to do homework again." << endl << endl;
        cout << "~~~ YOU WIN! CONGRATULATIONS! ~~~" << endl;
    }
}