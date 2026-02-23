// M3LAB1
// norrisa
// 2/23/26

#include <iostream>
using namespace std;

// List PROTOTYPES of all the choices up here
// rename these to something that makes sense!
void do_choice_1();
void do_choice_2();
void do_choice_3();
void do_choice_4();

// main() goes here
int main() {

    int choice;
    // main() starts the game
    cout << "GAME TITLE" << endl << endl;
    cout << "You're going about your day when suddenly something happens..." << endl;
    cout << "Do You: " << endl; // make these into real choices!
    cout << "1. Choice #1" << endl;
    cout << "2. Choice #2" << endl;

    cout << "> "; // Give them a prompt to type
    cin >> choice;

    if (1 == choice) {
        do_choice_1();
    }
    else if (2 == choice) {
        do_choice_2();
    }
    else {
        cout << "I didn't understand that." << endl;
    }
    cout << "*GAME OVER*" << endl << endl;

    return 0; // end of game
}

// List FULL FUNCTIONS of all the choices at the bottom
void do_choice_1() {
    cout << "You make the first choice." << endl;
    cout << "And then..."; // you finish it!
}

void do_choice_2() {
    cout << "You make the second choice." << endl;
    cout << "And then..."; // you finish it!
}

// use the other choices in choice 1 or 2...