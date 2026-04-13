/*
m6t1 xp tracker
Hiltibidal
4/13/26
xp then stats
*/

#include <iostream>
using namespace std;

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

    return 0;
}