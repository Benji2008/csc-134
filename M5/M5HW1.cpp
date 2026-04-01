/*
Csc131
hiltibidal
M5HW1
4/1/26
*/

#include <iostream>
#include <string>
#include <iomanip>
using namespace std;

void question1();
void question2();
void question3();
void question4();
void question5();
void question6();

//rainfall of the mont Calculator
void question1() {
    string month1, month2, month3;
    double rain1, rain2, rain3;

    cout << "Enter month: ";
    cin >> month1;
    cout << "Enter rainfall for " << month1 << ": ";
    cin >> rain1;

    cout << "Enter month: ";
    cin >> month2;
    cout << "Enter rainfall for " << month2 << ": ";
    cin >> rain2;

    cout << "Enter month: ";
    cin >> month3;
    cout << "Enter rainfall for " << month3 << ": ";
    cin >> rain3;

    double average = (rain1 + rain2 + rain3) / 3.0;

    cout << fixed << setprecision(2);
    cout << "The average rainfall for " << month1 << ", " << month2 << ", and " << month3 << " is " << average << " inches." << endl;
}

//volume of a block
void question2() {
    double width, length, height;

    cout << "Enter width: ";
    cin >> width;
    cout << "Enter length: ";
    cin >> length;
    cout << "Enter height: ";
    cin >> height;

    if (width <= 0 || length <= 0 || height <= 0) {
        cout << "All sides must be greater than zero." << endl;
        return;
    }

    double volume = width * length * height;
    cout << "The volume of the block is " << volume << endl;
}

void question3() {
    int number;

    cout << "Enter a number (1 - 10): ";
    cin >> number;

    if (number < 1 || number > 10) {
        cout << "Invalid input. Please enter a number between 1 and 10." << endl;
        return;
    }

    switch (number) {
        case 1:  cout << "The Roman numeral version of 1 is I." << endl;    break;
        case 2:  cout << "The Roman numeral version of 2 is II." << endl;   break;
        case 3:  cout << "The Roman numeral version of 3 is III." << endl;  break;
        case 4:  cout << "The Roman numeral version of 4 is IV." << endl;   break;
        case 5:  cout << "The Roman numeral version of 5 is V." << endl;    break;
        case 6:  cout << "The Roman numeral version of 6 is VI." << endl;   break;
        case 7:  cout << "The Roman numeral version of 7 is VII." << endl;  break;
        case 8:  cout << "The Roman numeral version of 8 is VIII." << endl; break;
        case 9:  cout << "The Roman numeral version of 9 is IX." << endl;   break;
        case 10: cout << "The Roman numeral version of 10 is X." << endl;   break;
    }
}

//Geometry Calculator
void question4() {
    int choice;

    cout << "Geometry Calculator" << endl;
    cout << "1. Calculate the Area of a Circle" << endl;
    cout << "2. Calculate the Area of a Rectangle" << endl;
    cout << "3. Calculate the Area of a Triangle" << endl;
    cout << "4. Quit" << endl;
    cout << "Enter your choice (1-4): ";
    cin >> choice;

    if (choice < 1 || choice > 4) {
        cout << "The valid choices are 1 through 4. Run the program again and select one of those." << endl;
        return;
    }

    switch (choice) {
        case 1: {
            double radius;
            cout << "Enter the circle's radius: ";
            cin >> radius;
            if (radius < 0) {
                cout << "The radius cannot be less than zero." << endl;
                return;
            }
            cout << "The area is " << 3.14159 * radius * radius << endl;
            break;
        }
        case 2: {
            double length, width;
            cout << "Enter the rectangle's length: ";
            cin >> length;
            cout << "Enter the rectangle's width: ";
            cin >> width;
            if (length < 0 || width < 0) {
                cout << "Only enter positive values for length and width." << endl;
                return;
            }
            cout << "The area is " << length * width << endl;
            break;
        }
        case 3: {
            double base, height;
            cout << "Enter the triangle's base: ";
            cin >> base;
            cout << "Enter the triangle's height: ";
            cin >> height;
            if (base < 0 || height < 0) {
                cout << "Only enter positive values for base and height." << endl;
                return;
            }
            cout << "The area is " << base * height * 0.5 << endl;
            break;
        }
        case 4:
            cout << "Goodbye!" << endl;
            return;
    }
}
//speed and distance
void question5() {
    double speed;
    int hours;

    cout << "What is the speed of the vehicle in mph? ";
    cin >> speed;
    cout << "How many hours has it traveled? ";
    cin >> hours;

    if (speed < 0) {
        cout << "Speed cannot be negative." << endl;
        return;
    }
    if (hours < 1) {
        cout << "Time traveled must be at least 1 hour." << endl;
        return;
    }

    cout << "Hour    Distance Traveled" << endl;
    cout << "--------------------------------" << endl;

    for (int i = 1; i <= hours; i++) {
        cout << " " << i << "      " << speed * i << endl;
    }
}

//question 6
int main() {
    int choice;
    
    while (true) {
        cout << "\nMain Menu" << endl;
        cout << "1. Average Rainfall" << endl;
        cout << "2. Volume of a Block" << endl;
        cout << "3. Roman Numerals" << endl;
        cout << "4. Geometry Calculator" << endl;
        cout << "5. Distance Traveled" << endl;
        cout << "6. Exit" << endl;
        cout << "Enter your choice (1-6): ";
        cin >> choice;

        if (choice == 1)      question1();
        else if (choice == 2) question2();
        else if (choice == 3) question3();
        else if (choice == 4) question4();
        else if (choice == 5) question5();
        else if (choice == 6) {
            cout << "Goodbye!" << endl;
            break;
        }
        else {
            cout << "Invalid choice. Please enter a number from 1 to 6." << endl;
        }
    }
    return 0;
}