/*
CSC 134
M2BONUS
Hiltibidal
2026-03-23
*/

#include <iostream>
using namespace std;

int main()
{
    // Set all decimal output to 2 decimal places for clean monetary/measurement display
    cout.setf(ios::fixed);
    cout.precision(2);

    // =========================================================
    // Problem 1: Area of a Rectangle (height 8, width 10)
    // Formula: Area = height * width
    // Using int because both dimensions are whole numbers
    // =========================================================
    cout << "Problem 1 - Rectangle Area" << endl;
    cout << "--------------------------" << endl;

    int rectHeight = 8;
    int rectWidth  = 10;
    int rectArea   = rectHeight * rectWidth;

    cout << "A rectangle with a height of " << rectHeight
         << " and a width of " << rectWidth << ":" << endl;
    cout << "Area = height x width = " << rectHeight
         << " x " << rectWidth << " = " << rectArea << " square units" << endl;

    cout << endl;

    // =========================================================
    // Problem 2: Product Price with 8% Sales Tax
    // Formula: tax = price * rate, total = price + tax
    // Using double because money requires decimal precision
    // 8% expressed as 0.08 (percent means "per hundred")
    // =========================================================
    cout << "Problem 2 - Sales Tax Calculator" << endl;
    cout << "---------------------------------" << endl;

    double productPrice = 99.99;
    double taxRate      = 0.08;    // 8% as a decimal
    double taxAmount    = productPrice * taxRate;
    double finalCost    = productPrice + taxAmount;

    cout << "Product price:             $" << productPrice << endl;
    cout << "Sales tax rate:             " << (taxRate * 100) << "%" << endl;
    cout << "Sales tax amount:          $" << taxAmount    << endl;
    cout << "Final cost (price + tax):  $" << finalCost    << endl;

    cout << endl;

    // =========================================================
    // Problem 3: Area of a 12-inch Pizza (Circle)
    // A pizza is circular, so we use the circle area formula:
    // Formula: Area = pi * radius^2
    // Diameter = 12 inches, therefore radius = diameter / 2 = 6 inches
    // Using double for precision with pi and decimal results
    // =========================================================
    cout << "Problem 3 - Pizza Area" << endl;
    cout << "----------------------" << endl;

    double pi            = 3.14159265358979;
    double pizzaDiameter = 12.0;
    double pizzaRadius   = pizzaDiameter / 2.0;
    double pizzaArea     = pi * pizzaRadius * pizzaRadius;

    cout << "A pizza is a circle, so we use: Area = pi x radius^2" << endl;
    cout << "Pizza diameter:  " << pizzaDiameter << " inches" << endl;
    cout << "Pizza radius:    " << pizzaRadius   << " inches" << endl;
    cout << "Pi:              " << pi            << endl;
    cout << "Pizza area:      " << pizzaArea     << " square inches" << endl;

    cout << endl;

    // =========================================================
    // Problem 4: Area of Each Slice of the Pizza
    // Formula: slice area = total pizza area / number of slices
    // Reuses pizzaArea calculated in Problem 3
    // =========================================================
    cout << "Problem 4 - Area Per Pizza Slice" << endl;
    cout << "--------------------------------" << endl;

    int    numSlices = 8;
    double sliceArea = pizzaArea / numSlices;

    cout << "Total pizza area: " << pizzaArea << " square inches" << endl;
    cout << "Number of slices: " << numSlices << endl;
    cout << "Area per slice (" << pizzaArea << " / " << numSlices
         << "):  " << sliceArea << " square inches" << endl;

    cout << endl;

    return 0;
}