// M5LAB2
// Header goes here

#include <iostream>
#include <limits>
using namespace std;

// Declare (Write the prototypes for)
// the getLength,
// getWidth, getArea, and displayData
// functions here.
double getLength();
double getWidth();
double getArea(double length, double width);
void displayData(double length, double width, double area);


int main()
{
	// This program calculates the area of a rectangle.
	// TODO: fix any syntax errors
	
   double length,    // The rectangle's length
          width,     // The rectangle's width
          area;      // The rectangle's area
          
   // Get the rectangle's length.
   length = getLength();
   
   // Get the rectangle's width.
   width = getWidth();
   
   // Get the rectangle's area.
   area = getArea(length, width);
   
   // Display the rectangle's data.
   displayData(length, width, area);
          
   return 0;
}

//***************************************************
// TODO: write the getLength, getWidth, getArea,    *
// and displayData functions below.                 *
//***************************************************
double getLength(){
    double length;
    cout << "Enter the length of the rectangle: ";
    cin >> length;
    while (length <= 0) {
        cout << "Length must be a positive number. Please try again: ";
        cin.clear();
        cin.ignore(numeric_limits<streamsize>::max(), '\n');
        cin >> length;
    }
    return length;
}
double getWidth(){
    double width;
    cout << "Enter the width of the rectangle: ";
    cin >> width;
    while (width <= 0) {
        cout << "Width must be a positive number. Please try again: ";
        cin.clear();
        cin.ignore(numeric_limits<streamsize>::max(), '\n');
        cin >> width;
    }
    return width;
}
double getArea(double length, double width){
    return length * width;
}
void displayData(double length, double width, double area){
    cout << "Rectangle Data:" << endl;
    cout << "Length: " << length << endl;
    cout << "Width: " << width << endl;
    cout << "Area: " << area << endl;
}