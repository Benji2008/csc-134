#ifndef M5T1_H_INCLUDED
#define M5T1_H_INCLUDED
//m5t1 - more functions
// Hiltibidal
// 3/18/26
using namespace std;

#include <iostream>
#include "m5t1.h"


// Main()
int main()
{
    say_hi();
    cout << "The answer is; " << show_answers() << endl;
    cout << "Enter a number: ";
    double number;
    cin >> number;
    double answer = square_a_number(number);
    cout << number << " Squares is " << answer << endl;
    return 0;
}

// Function full code
void say_hi() {
    cout << "Hello world!" << endl;
    return;
}

int show_answers() {
    int answer = 42;
    return answer;
}

double square_a_number (double number) {
    double square = number * number;
    return square;
}



#endif // M5T1_H_INCLUDED
