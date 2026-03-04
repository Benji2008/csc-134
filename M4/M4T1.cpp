/*
Connor
csc 134 m4t1 - while loop
3/4/26
*/
#include <iostream>
using namespace std;

int main() {
    // demo
    const int MIN = 1;
    const int MAX = 10;

    int num = MIN;
    int squared; // holds square

    cout << "Number\tNum Squared" << endl;
    cout << "________________" << endl;
    while (num <= MAX) {
        squared = num * num;
        cout << num << "\t" << squared << endl; // print num n square
        num++; // next number
    }
}