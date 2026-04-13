/*
m6t1 xp tracker
Hiltibidal
4/13/26
xp then stats
*/

#include <iostream>
using namespace std;

//array
 void barChart(int xp[], int floors);

int main() {
   const int STATS = 5;
    int xp[STATS];
    double total = 0.0;
    double average;
    int max = 0;
   
    //input
    cout << "Dungean Xp Tracker" << endl;
    for (int i = 0; i < STATS; i++) {
        cout << "fLOOR  " << i + 1 << " XP: ";
        cin >> xp[i];
    }
    //calculate total and average
    for (int i = 0; i < STATS; i++) {
        total += xp[i];
    }
    //calculation of max and average
    for (int i = 0; i < STATS; i++) {
        total += xp[i];
        if (xp[i] > max) {
            max = xp[i];
        }
    }
    average = total / STATS;

    //output
    cout << "over: " << STATS << " Floors" <<endl;
    cout << "Total XP: " << total << endl;
    cout << "Average XP: " << average << endl;
    cout << "Best XP: " << max << endl;
    barChart(xp, STATS);

    return 0;
}

void barChart(int xp[], int floors) {
    const int SCALE = 10;  // 1 bar = 10 XP
    for (int i = 0; i < floors; i++) {
        cout << "F" << (i+1) << " | ";
        for (int b = 0; b < xp[i]/SCALE; b++) {
            cout << "█";
        }
        cout << " " << xp[i] << "\n";
    }
}