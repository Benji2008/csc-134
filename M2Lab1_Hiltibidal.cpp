/*
CSC 134
M2Lab1 - crates
hiltibidal
1/28/26
*/

#include <iostream>
#include <iomanip>

using namespace std; 

int main () {

    // part 1 - set up variables
    // crate variables
    double length, width, hight, volume; //in feet
    // price variables
    const double COST_PER_CUBIC_FOOT = 0.23;
    const double CHARGE_PER_CUBIC_FOOT = 0.5;
    double cost, customer_price, profit; //$

    // part 2 - input
    cout << "crate purchase program " << endl;
    cout << "Enter the size of your crate "  << endl;
    cout << "length? ";
    cin >> length;
    cout << "width? "; 
    cin >> width;
    cout << "hight? ";
    cin >> hight; 


    // part 3 - calculations
    volume = length * width * hight; 

    // part 4 - outputs
    cout << setprecision(2) << fixed; // 2 decimal places
    cout << "\n---- CRATE INFO ----\n";
    cout << "Volume " << volume << " cubic feet." << endl;

    return 0; 
}
