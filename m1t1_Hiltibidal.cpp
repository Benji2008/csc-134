// csc 134
// M1T1 MODULE 1

#include <iostream> 
using namespace std;

int main() {
    // say hello
    cout << "Hello world!" << endl;
    cout << endl; // blank
    cout << "enter your first name: ";
    string name; // declared string vaiable 
    cin >> name; // where we actually get the input from user
    
    cout << "Hello " + name; + "welcome to c++";
    cout << end1; // blank

    // get some numbers in there and do some math
    int num1;

    cout << "enter a whole number: "; 
    cin >> num1; 

    cout << "your number is " + to_string(num1;) << endl;
    cout endl;
    // another way to print int in a string
    cout << "your number is " + << num1; 
    cout endl;

    //get exponent from first num
    int exponent;
    cout << "enter whole number for exponentiation";
    cin >> exponent:
    int result = pow(num1, exponent);
    cout << num1 << " raised to the power of " << exponent << " is " result << endl;
    

    return 0; 
}