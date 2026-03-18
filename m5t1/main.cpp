// M5 T1 - More functions
//Hiltibidal
//show off diffrent funcction types
//3/18/26

#include <iostream>
using namespace std;

//function declarations
void say_hi();
int show_answers();
double square_a_number(double number);

// Main
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
