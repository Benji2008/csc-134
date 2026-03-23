// CSC 134
// M3LAB2 - Number Grade to Letter Grade
// Hiltibidal
// 2026-03-23

#include <iostream>
using namespace std;

int main()
{
    int numericalGrade;

    cout << "Enter your numerical grade: ";
    cin >> numericalGrade;

    if (numericalGrade >= 90 && numericalGrade <= 100)
    {
        cout << "Your letter grade is: A" << endl;
    }
    else if (numericalGrade >= 80 && numericalGrade <= 89)
    {
        cout << "Your letter grade is: B" << endl;
    }
    else if (numericalGrade >= 70 && numericalGrade <= 79)
    {
        cout << "Your letter grade is: C" << endl;
    }
    else if (numericalGrade >= 60 && numericalGrade <= 69)
    {
        cout << "Your letter grade is: D" << endl;
    }
    else if (numericalGrade >= 0 && numericalGrade <= 59)
    {
        cout << "Your letter grade is: F" << endl;
    }
    else
    {
        cout << "Invalid grade. Please enter a number between 0 and 100." << endl;
    }

    return 0;
}