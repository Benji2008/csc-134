#ifndef M5T2_H_INCLUDED
#define M5T2_H_INCLUDED

#include <iostream>
using namespace std;

int square(int num) {
    // input: a number
    // output: the number, squared
    int answer = num * num;
    return answer;
}

void print_table_line(int first, int second) {
    // input: two numbers
    // effect: prints a line with both numbers
    cout << first << "\t" << second << endl;
}

#endif // M5T2_H_INCLUDED