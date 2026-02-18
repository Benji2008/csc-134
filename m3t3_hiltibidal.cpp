/*
CSC 134 
m3t3 - craps and numbers 
connor h
2/18/26
*/

#include <iostream>
#include <cstdlib>
#include <ctime>

using namespace std;
string status;
int roll();

int main(){
    //seed
    srand(time(0));
    //set up
    int roll1, roll2, total, point;
    string stattus;

    roll1 = roll();
    roll2 = roll();
    total = roll1 + roll2;

    // print the dice roll
    cout << "Roll is: 🎲 " << roll1 << " + " << roll2 << " = " << total << endl;

    //determine win or loss
    if (total == 7 || total == 11) {
        status = "win";
    }
    else if (total == 2 || total == 3 || total == 12) {
        status = "lose";
    
    }
    else {
        // point
        point = total; // save for later
        status = "point";
    }

    cout << "Roll results; " << status << endl;


    return 0;
}

int roll() {
    int num = (rand() % 6) + 1;
    return num;
}